import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const contactSchema = z.object({
  shareId: z.string().min(1).max(64),
  fromEmail: z.string().email().max(200),
  message: z.string().min(3).max(2000),
});

/**
 * Private contact-seller relay: buyers message sellers without either
 * address being exposed. Mail goes out from noreply@mail.bindersync.com
 * with Reply-To set to the buyer, so the seller can just hit reply.
 */
export async function POST(request: Request) {
  if (!rateLimit(`contact:${clientIp(request.headers)}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many messages — try again in an hour." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email and a message (up to 2,000 characters)." },
      { status: 400 }
    );
  }

  const binder = await prisma.sellBinder.findUnique({
    where: { shareId: parsed.data.shareId },
    select: {
      title: true,
      shareId: true,
      isPublished: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (!binder?.isPublished) {
    return NextResponse.json({ error: "This binder is no longer available." }, { status: 404 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const sent = await sendEmail({
    to: binder.user.email,
    replyTo: parsed.data.fromEmail,
    subject: `Buyer message about "${binder.title}" on Binder Sync`,
    text: [
      `Someone is interested in your sell binder "${binder.title}":`,
      `${origin}/s/${binder.shareId}`,
      "",
      `From: ${parsed.data.fromEmail}`,
      "",
      parsed.data.message,
      "",
      "— Reply to this email to answer them directly. Their address is only shared with you.",
    ].join("\n"),
  });

  if (!sent) {
    return NextResponse.json(
      { error: "Could not send the message right now — try again later." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
