import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const forgotSchema = z.object({ email: z.string().email() });

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  if (!rateLimit(`forgot:${clientIp(request.headers)}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many reset requests — try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Same response whether or not the account exists — no account enumeration.
  const user = await prisma.user.findFirst({
    where: { email: { equals: parsed.data.email, mode: "insensitive" } },
    select: { id: true, email: true },
  });

  if (user) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    await sendEmail({
      to: user.email,
      subject: "Reset your Binder Sync password",
      text: [
        "Someone (hopefully you) asked to reset the password for this Binder Sync account.",
        "",
        `Reset it here (link is valid for 1 hour):`,
        `${origin}/reset-password?token=${token}`,
        "",
        "If you didn't ask for this, you can ignore this email — your password is unchanged.",
      ].join("\n"),
    });
  }

  return NextResponse.json({ ok: true });
}
