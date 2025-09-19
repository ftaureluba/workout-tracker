import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { users } from "./db/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

export const {
  handlers,
  auth,
  signIn, 
  signOut,
  unstable_update: update,
} = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("[authorize] Attempting to authorize with credentials:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log("[authorize] Missing email or password.");
          return null;
        }

        // Find user in database
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user.length) {
          console.log("[authorize] User not found.");
          return null;
        }
        console.log("[authorize] User found:", user[0].email);

        // Check password
        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user[0].password
        );
        console.log("[authorize] Password valid:", isValidPassword);

        if (!isValidPassword) {
          console.log("[authorize] Invalid password.");
          return null;
        }

        console.log("[authorize] Authorization successful.");
        return {
          id: user[0].id.toString(),
          email: user[0].email,
          name: user[0].name,
        };
      }
    })
  ],
});


