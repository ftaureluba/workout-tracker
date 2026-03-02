import React from "react";
import { Button } from "@/app/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "@/lib/sidebar";
import { usePushNotifications } from "../hooks/usePushNotifications";

interface WorkoutHeaderProps {
    workoutName: string;
}

export function WorkoutHeader({ workoutName }: WorkoutHeaderProps) {
    const { toggle: toggleSidebar } = useSidebar();
    const { pushEnabled, togglePush } = usePushNotifications();

    return (
        <header className="w-full border-b bg-card/30 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => toggleSidebar()}
                    aria-label="Toggle sidebar"
                >
                    <Menu className="h-6 w-6" />
                </Button>
                <h1 className="text-2xl font-bold mb-4 text-center">{workoutName}</h1>
                <div></div> {/* Spacer to center the title if needed */}
            </div>

            <div className="flex justify-end px-4 pb-2">
                <button
                    onClick={togglePush}
                    className="ml-3 px-3 py-1 bg-gray-800 text-white rounded text-sm"
                >
                    {pushEnabled ? "Disable push" : "Enable push"}
                </button>
            </div>
        </header>
    );
}
