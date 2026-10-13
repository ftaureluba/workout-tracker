"use client";

import Link from "next/link";
import { Home, Menu } from "lucide-react";
import { useSidebar } from "@/lib/sidebar";
import { Button } from "@/app/ui/button";

export default function PlansNavigation() {
  const { toggle } = useSidebar();

  return (
    <nav aria-label="Plans navigation" className="flex items-center justify-between border-b pb-3">
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Open navigation menu">
        <Menu className="h-5 w-5" />
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard">
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
      </Button>
    </nav>
  );
}
