import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Email-verification landing: GET /api/auth/verify?token=... */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const home = new URL("/", url.origin);

  if (!token) return NextResponse.redirect(new URL("/?verified=0", url.origin));

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) {
    return NextResponse.redirect(new URL("/?verified=0", url.origin));
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { email: record.identifier, emailVerified: null },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({
      where: { identifier_token: { identifier: record.identifier, token } },
    }),
  ]);

  home.searchParams.set("verified", "1");
  return NextResponse.redirect(home);
}
