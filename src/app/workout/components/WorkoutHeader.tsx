import React from "react";
import { Button } from "@/app/ui/button";
import { Menu, Bell, BellOff } from "lucide-react";
import { useSidebar } from "@/lib/sidebar";
import { usePushNotifications } from "../hooks/usePushNotifications";

interface WorkoutHeaderProps {
    workoutName: string;
}

export function WorkoutHeader({ workoutName }: WorkoutHeaderProps) {
    const { toggle: toggleSidebar } = useSidebar();
    const { pushEnabled, togglePush } = usePushNotifications();

    return (
        <header className="w-full border-b bg-card/30 backdrop-blur-sm relative">
            <div className="flex items-center justify-between p-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 flex-shrink-0"
                    onClick={() => toggleSidebar()}
                    aria-label="Toggle sidebar"
                >
                    <Menu className="h-6 w-6" />
                </Button>

                <h1 className="text-xl font-bold text-center truncate px-2 flex-grow">{workoutName}</h1>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={togglePush}
                    aria-label={pushEnabled ? "Disable push notifications" : "Enable push notifications"}
                >
                    {pushEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                </Button>
            </div>
        </header>
    );
}
