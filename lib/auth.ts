import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "text" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // 10 attempts / 15 min per IP+email — slows credential stuffing.
        const ip = clientIp(request.headers);
        if (!rateLimit(`login:${ip}:${email.toLowerCase()}`, 10, 15 * 60 * 1000)) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          remember: credentials?.remember === "1",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.remember = (user as { remember?: boolean }).remember ?? true;
        token.signedInAt = Date.now();
      }

      // "Remember me" unchecked → session lasts 24h instead of the 30-day default.
      if (
        token.remember === false &&
        typeof token.signedInAt === "number" &&
        Date.now() - token.signedInAt > 24 * 60 * 60 * 1000
      ) {
        return null;
      }
      if (user || trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { plan: true, currency: true, binderColor: true, look: true },
        });
        if (dbUser) {
          token.plan = dbUser.plan;
          token.currency = dbUser.currency;
          token.binderColor = dbUser.binderColor;
          token.look = dbUser.look;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.plan = token.plan as string;
        session.user.currency = token.currency as string;
        session.user.binderColor = (token.binderColor as string) ?? null;
        session.user.look = token.look as string;
      }
      return session;
    },
  },
});
