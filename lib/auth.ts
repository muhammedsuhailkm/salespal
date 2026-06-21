import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { managerOrgs: true, salesmanManager: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role_id: user.role_id,
          org_ids: user.managerOrgs.map((item) => item.org_id),
          manager_ids: user.salesmanManager.map((item) => item.manager_id),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = Number(user.id);
        token.role_id = user.role_id;
        token.org_ids = user.org_ids ?? [];
        token.manager_ids = user.manager_ids ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = Number(token.id);
        session.user.role_id = Number(token.role_id);
        session.user.org_ids = (token.org_ids as number[]) ?? [];
        session.user.manager_ids = (token.manager_ids as number[]) ?? [];
      }
      return session;
    },
  },
};

export function getSalesPalSession() {
  return getServerSession(authOptions) as Promise<Session | null>;
}
