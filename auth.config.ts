
// Avoid importing NextAuth types here to prevent type mismatches with the installed next-auth
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    
  },
  providers: [], // Add providers with an empty array for now
};
