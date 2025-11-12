"use client";

import { type ActiveSession } from "@/lib/types";

interface ResumeSessionCardProps {
  session: ActiveSession;
  onResume: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
}

export function ResumeSessionCard({ session, onResume, onDelete }: ResumeSessionCardProps) {
  const startedDate = new Date(session.startedAt);
  const lastSavedDate = new Date(session.lastSaved);
  const now = new Date();
  
  const minutesAgo = Math.floor((now.getTime() - lastSavedDate.getTime()) / 60000);
  const hoursAgo = Math.floor(minutesAgo / 60);
  
  let timeAgoText = "";
  if (minutesAgo < 1) {
    timeAgoText = "just now";
  } else if (minutesAgo < 60) {
    timeAgoText = `${minutesAgo}m ago`;
  } else if (hoursAgo < 24) {
    timeAgoText = `${hoursAgo}h ago`;
  } else {
    timeAgoText = startedDate.toLocaleDateString();
  }

  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
  
  const totalSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.length,
    0
  );

  return (
    <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 hover:border-orange-400 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{session.workoutName}</h3>
          <p className="text-sm text-gray-600">
            Started {startedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">{timeAgoText}</span>
          {onDelete && (
            <button
              onClick={() => onDelete(session.sessionId)}
              aria-label="Delete session"
              className="text-sm text-red-500 bg-white px-2 py-1 rounded"
            >
              X
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-700 mb-3">
        <div>
          <span className="font-semibold">{session.exercises.length}</span> exercises
        </div>
        <span>•</span>
        <div>
          <span className="font-semibold">{completedSets}</span> / {totalSets} sets completed
        </div>
      </div>

      <button
        onClick={() => onResume(session.sessionId)}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
      >
        Resume Workout
      </button>
    </div>
  );
}
