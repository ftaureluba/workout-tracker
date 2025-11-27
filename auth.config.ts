
// Avoid importing NextAuth types here to prevent type mismatches with the installed next-auth
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  trustedHosts: [
    "workout-tracker-v4o4.onrender.com",
    "https://workout-tracker-v4o4.onrender.com"
    
  ],
  callbacks: {
    
  },
  providers: [], // Add providers with an empty array for now
};
