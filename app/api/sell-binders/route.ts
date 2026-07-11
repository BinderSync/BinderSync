import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const binders = await prisma.sellBinder.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { cards: true },
  });
  return NextResponse.json({ binders });
}

const createSchema = z.object({
  title: z.string().min(1).max(120),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (session.user.plan !== "master") {
    return NextResponse.json(
      { error: "Sell Binders are a Master feature — upgrade to create one." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  const binder = await prisma.sellBinder.create({
    data: { userId: session.user.id, title: parsed.data.title },
  });

  return NextResponse.json({ binder }, { status: 201 });
}
