"use client";

import { useRouter } from "next/navigation";
import { List, BarChart2, X, Home } from "lucide-react";
import { Button } from "../ui/button";
import { useSidebar } from "@/lib/sidebar";

export default function Sidebar() {
  const router = useRouter();
  const { isOpen, close } = useSidebar();

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-full z-40 transform bg-card/95 backdrop-blur-sm border-r transition-all duration-200 ease-in-out overflow-hidden ${
          isOpen ? "translate-x-0 w-64 opacity-100 pointer-events-auto" : "-translate-x-full w-0 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isOpen}
      >
        <nav className="h-full flex flex-col p-4 w-full">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-muted px-2 py-1 text-sm">Menu</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => close()} aria-label="Close sidebar">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ul className="space-y-2">
            <li>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent/50 text-left"
                onClick={() => {
                  close();
                  router.push("/dashboard");
                }}
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </button>
            </li>
            <li>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent/50 text-left"
                onClick={() => {
                  close();
                  router.push("/historial");
                }}
              >
                <List className="h-5 w-5" />
                <span>Historial</span>
              </button>
            </li>
            <li>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent/50 text-left"
                onClick={() => {
                  close();
                  router.push("/dashboard/analiticas");
                }}
              >
                <BarChart2 className="h-5 w-5" />
                <span>Analíticas</span>
              </button>
            </li>
          </ul>

          <div className="mt-auto text-xs text-muted-foreground">v1 — minimal sidebar</div>
        </nav>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => close()}
          aria-hidden
        />
      )}
    </>
  );
}
