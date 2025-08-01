
import type { NextAuthOptions } from "next-auth";

export const authConfig: NextAuthOptions  = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    
  },
  providers: [], // Add providers with an empty array for now
};
