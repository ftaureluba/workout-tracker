import { useEffect, useState } from "react";
import { subscribeToPush, getExistingSubscription, unsubscribePush, requestNotificationPermission } from "@/lib/push";
import { useToast } from "@/app/ui/use-toast";

export function usePushNotifications() {
    const [pushEnabled, setPushEnabled] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const sub = await getExistingSubscription();
                if (mounted) setPushEnabled(!!sub);
            } catch {
                // ignore
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const togglePush = async () => {
        try {
            if (!pushEnabled) {
                // enable
                const perm = await requestNotificationPermission();
                if (perm !== "granted") {
                    toast({ title: "Notifications blocked", description: "Permission not granted" });
                    return;
                }
                const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string | undefined;
                if (!vapidKey) {
                    toast({ title: "VAPID missing", description: "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in env" });
                    return;
                }
                const sub = await subscribeToPush(vapidKey);
                if (sub) {
                    try {
                        await fetch("/api/push/subscribe", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ subscription: sub }),
                        });
                        toast({ title: "Subscribed to push", description: "Push enabled and sent to server" });
                    } catch (e) {
                        console.error("Failed to send subscription", e);
                        toast({ title: "Subscribed locally", description: "Subscription obtained but failed to POST" });
                    }
                    setPushEnabled(true);
                } else {
                    try {
                        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                            toast({ title: "Subscribe failed", description: "Push APIs not supported." });
                        } else {
                            let swResp: Response | null = null;
                            try {
                                swResp = await fetch("/sw.js", { method: "GET", cache: "no-store" });
                            } catch (e) {
                                swResp = null;
                            }
                            if (!swResp || !swResp.ok) {
                                toast({ title: "Subscribe failed", description: "/sw.js not reachable." });
                            } else {
                                const registration = await navigator.serviceWorker.getRegistration();
                                const permission = "Notification" in window ? Notification.permission : "unsupported";
                                if (!registration) {
                                    toast({ title: "Subscribe failed", description: "Service worker not registered." });
                                } else {
                                    toast({ title: "Subscribe failed", description: `Permission: ${permission}. Check console.` });
                                }
                            }
                        }
                    } catch {
                        toast({ title: "Subscribe failed", description: "Unknown error." });
                    }
                }
            } else {
                const ok = await unsubscribePush();
                if (ok) {
                    toast({ title: "Unsubscribed", description: "Push disabled" });
                    setPushEnabled(false);
                } else {
                    toast({ title: "Unsubscribe failed", description: "Could not unsubscribe" });
                }
            }
        } catch (err) {
            console.error("Toggle push failed", err);
            toast({ title: "Error", description: "Failed to toggle push" });
        }
    };

    return { pushEnabled, togglePush };
}
