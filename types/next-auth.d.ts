import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: string;
      currency: string;
      binderColor: string | null;
      look: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: string;
    currency?: string;
    binderColor?: string | null;
    look?: string;
    remember?: boolean;
    signedInAt?: number;
  }
}
