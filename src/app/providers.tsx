"use client"

import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "@/lib/sidebar";
import Sidebar from "./components/sidebar";
import { Toaster } from "@/app/ui/toaster";
import type { Session } from "next-auth";

export function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <Sidebar />
        {children}
        {/* Global toaster for in-app toasts created with useToast() */}
        <Toaster />
      </SidebarProvider>
    </SessionProvider>
  );
}
