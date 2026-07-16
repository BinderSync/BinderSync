import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  if (!rateLimit(`register:${clientIp(request.headers)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many sign-up attempts — try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email, name, or password (min 8 characters)." },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true },
  });

  // Verification is non-blocking: the account works immediately, the email
  // just confirms the address is real (and deliverable for password resets).
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  sendEmail({
    to: user.email,
    subject: "Welcome to Binder Sync — verify your email",
    text: [
      "Welcome to Binder Sync!",
      "",
      "Confirm this email address so account recovery works if you ever need it:",
      `${origin}/api/auth/verify?token=${token}`,
      "",
      "The link is valid for 24 hours. If you didn't create this account, you can ignore this email.",
    ].join("\n"),
  }).catch(() => {});

  return NextResponse.json({ user }, { status: 201 });
}
