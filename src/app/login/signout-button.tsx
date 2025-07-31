"use client"
import { signOut } from "next-auth/react";
import { PowerIcon } from '@heroicons/react/24/outline';
 
export function SignOut() {
  return (
      <button onClick={()=> signOut({callbackUrl: "/"})}> sign out </button>
  );
}
