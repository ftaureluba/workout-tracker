"use client"

import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "@/lib/sidebar";
import Sidebar from "./components/sidebar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <Sidebar />
        {children}
      </SidebarProvider>
    </SessionProvider>
  );
}
