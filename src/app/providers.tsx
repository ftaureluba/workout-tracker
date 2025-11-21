"use client"

import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "@/lib/sidebar";
import Sidebar from "./components/sidebar";
import { Toaster } from "@/app/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <Sidebar />
        {children}
        {/* Global toaster for in-app toasts created with useToast() */}
        <Toaster />
      </SidebarProvider>
    </SessionProvider>
  );
}
