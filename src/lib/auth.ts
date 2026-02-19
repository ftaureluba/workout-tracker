import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { users } from "@/lib/db/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            return null;
          }

          // Rate limit login attempts by username
          const { success } = rateLimit(`login:${credentials.username}`, {
            limit: 10,
            windowMs: 60_000,
          });
          if (!success) {
            throw new Error("Too many login attempts. Please try again later.");
          }

          const user = await db
            .select()
            .from(users)
            .where(eq(users.username, credentials.username as string))
            .limit(1);

          if (!user.length) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            user[0].password
          );

          if (!isValidPassword) {
            return null;
          }

          return {
            id: user[0].id.toString(),
            email: user[0].email,
            name: user[0].name,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});