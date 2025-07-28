import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { users } from "./db/schema"; // Make sure you have this import
import bcrypt from "bcrypt"; // You'll need this for password comparison

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Find user in database
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1);

        if (!user.length) {
          return null;
        }

        // Check password (assuming you're hashing passwords)
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user[0].password
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
        };
      }
    })
  ],
});
