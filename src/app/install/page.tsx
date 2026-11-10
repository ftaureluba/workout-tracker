"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpFromLine,
  Check,
  Copy,
  Download,
  Dumbbell,
  Share2,
} from "lucide-react";
import { Button } from "@/app/ui/button";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPage() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

    setIsIos(ios);
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && window.navigator.standalone === true),
    );

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const shareUrl = () => new URL("/", window.location.origin).toString();

  const copyLink = async () => {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const shareApp = async () => {
    const url = shareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Workout Tracker",
          text: "Track your workouts and progress.",
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink();
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold" aria-label="Workout Tracker home">
            <Dumbbell className="h-5 w-5 text-primary" />
            Workout Tracker
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Back to app
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <section className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Workout Tracker</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Take your training with you.</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
              Add the app to your home screen for a focused, app-like way to log workouts and follow your progress.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {installPrompt && !isInstalled && (
              <Button onClick={installApp} className="gap-2">
                <Download />
                Install app
              </Button>
            )}
            <Button onClick={shareApp} variant="outline" className="gap-2">
              {copied ? <Check /> : <Share2 />}
              {copied ? "Link copied" : "Share app"}
            </Button>
          </div>
        </section>

        {isInstalled || isStandalone ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-green-400" role="status">
            <Check className="h-4 w-4" /> Workout Tracker is ready on this device.
          </p>
        ) : null}

        <section className="grid gap-10 py-9 md:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)]">
          <div>
            <h2 className="text-xl font-semibold">Install on this device</h2>
            {isIos ? (
              <ol className="mt-5 divide-y divide-border border-y border-border">
                <li className="flex gap-4 py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">1</span>
                  <p className="pt-0.5 text-sm leading-6 text-muted-foreground">
                    Open this page in <strong className="text-foreground">Safari</strong>. iOS does not offer home-screen installation from every browser.
                  </p>
                </li>
                <li className="flex gap-4 py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">2</span>
                  <p className="flex items-start gap-2 pt-0.5 text-sm leading-6 text-muted-foreground">
                    Tap <ArrowUpFromLine className="mt-1 h-4 w-4 shrink-0 text-foreground" /> <span>the <strong className="text-foreground">Share</strong> button in Safari.</span>
                  </p>
                </li>
                <li className="flex gap-4 py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">3</span>
                  <p className="flex items-start gap-2 pt-0.5 text-sm leading-6 text-muted-foreground">
                    <Copy className="mt-1 h-4 w-4 shrink-0 text-foreground" /> <span>Choose <strong className="text-foreground">Add to Home Screen</strong>, then tap <strong className="text-foreground">Add</strong>.</span>
                  </p>
                </li>
              </ol>
            ) : installPrompt ? (
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Your browser can install the app. Select <strong className="text-foreground">Install app</strong> above and confirm in the browser prompt.
              </p>
            ) : (
              <div className="mt-3 max-w-xl space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  If your browser supports app installation, use its menu and choose <strong className="text-foreground">Install app</strong> or <strong className="text-foreground">Add to Home Screen</strong>. The exact wording varies by browser.
                </p>
                <p>
                  On Android, Chrome may show an install icon in the address bar or an install option in its menu. If it is not shown, try again after using the app for a little while.
                </p>
              </div>
            )}
          </div>

          <aside className="border-t border-border pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <h2 className="text-lg font-semibold">Share Workout Tracker</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Send the app link to a training partner. They can open it in their browser and sign in or create an account.
            </p>
            <Button onClick={shareApp} variant="secondary" className="mt-4 gap-2">
              {copied ? <Check /> : <Share2 />}
              {copied ? "Link copied" : "Share app"}
            </Button>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              Install prompts depend on your browser, device, and a secure connection. If no prompt appears, use the browser menu or the steps on this page.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}