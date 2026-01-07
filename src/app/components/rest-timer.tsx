"use client"

import { useEffect, useRef, useState } from "react"
import { requestNotificationPermission, subscribeToPush, getExistingSubscription } from "@/lib/push"
import { toast } from "@/app/ui/use-toast"
import { ArrowLeft, Play, Check } from "lucide-react"
import { Button } from "@/app/ui/button"

interface Props {
  defaultSeconds?: number
  label?: string
}

export default function RestTimer({ defaultSeconds = 60, label = "Rest" }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [seconds, setSeconds] = useState<number>(defaultSeconds)
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState<number>(defaultSeconds)
  const [editingMinutes, setEditingMinutes] = useState(false)
  const [editingSeconds, setEditingSeconds] = useState(false)
  const [tempMinutes, setTempMinutes] = useState(Math.floor(defaultSeconds / 60).toString())
  const [tempSeconds, setTempSeconds] = useState((defaultSeconds % 60).toString())
  const timerRef = useRef<number | null>(null)
  // Store the end timestamp so we can calculate remaining time accurately
  // even after the app was backgrounded
  const endAtRef = useRef<number | null>(null)

  const displayMinutes = Math.floor(remaining / 60)
  const displaySeconds = remaining % 60
  const totalSeconds = seconds
  const progress = (remaining / totalSeconds) * 100

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (running && endAtRef.current) {
      // Calculate remaining time from endAt timestamp on each tick
      // This ensures the timer stays accurate even after backgrounding
      const tick = () => {
        const now = Date.now()
        const newRemaining = Math.max(0, Math.floor((endAtRef.current! - now) / 1000))
        setRemaining(newRemaining)

        if (newRemaining <= 0) {
          window.clearInterval(timerRef.current ?? undefined)
          timerRef.current = null
          endAtRef.current = null
          setRunning(false)
          // Schedule onTimerEnd to run after state updates
          setTimeout(() => onTimerEnd(), 0)
        }
      }

      // Run immediately to update display right away (e.g., when returning from background)
      tick()

      timerRef.current = window.setInterval(tick, 1000)
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const handleMinutesClick = () => {
    if (!running) {
      setEditingMinutes(true)
      setTempMinutes(Math.floor(seconds / 60).toString())
    }
  }

  const handleSecondsClick = () => {
    if (!running) {
      setEditingSeconds(true)
      setTempSeconds((seconds % 60).toString())
    }
  }

  const applyTimeEdit = () => {
    const mins = Math.max(0, Math.min(99, Number.parseInt(tempMinutes) || 0))
    const secs = Math.max(0, Math.min(59, Number.parseInt(tempSeconds) || 0))
    const total = mins * 60 + secs
    if (total > 0) {
      setSeconds(total)
      setRemaining(total)
    }
    setEditingMinutes(false)
    setEditingSeconds(false)
  }

  const startWith = async (secs: number) => {
    // Request permission proactively so we can show notifications later
    await requestNotificationPermission().catch(() => { })

    // Try to obtain a PushSubscription so we can schedule a server push while backgrounded.
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string | undefined
      console.log("[RestTimer] startWith: vapidKey present?", !!vapidKey)
      let subscription = await getExistingSubscription()
      console.log("[RestTimer] startWith: existing subscription?", !!subscription)
      if (!subscription && vapidKey) {
        subscription = await subscribeToPush(vapidKey)
        console.log("[RestTimer] startWith: new subscription obtained?", !!subscription)
        if (subscription) {
          toast({ title: "Push subscribed", description: "Subscription obtained" })
        } else {
          toast({ title: "No subscription", description: "subscribeToPush returned null" })
        }
      }

      if (subscription) {
        // Ask server to schedule a push for `secs` from now. Server will persist the schedule.
        console.log("[RestTimer] Scheduling push for", secs, "seconds from now")
        try {
          const scheduleRes = await fetch("/api/push/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription,
              title: `${label} finished`,
              body: "Your rest period is over",
              delayMs: secs * 1000,
            }),
          })
          const scheduleData = await scheduleRes.json().catch(() => ({}))
          console.log("[RestTimer] /api/push/schedule response:", scheduleRes.status, scheduleData)
          if (!scheduleRes.ok) {
            toast({ title: "Schedule failed", description: `HTTP ${scheduleRes.status}: ${JSON.stringify(scheduleData)}` })
          } else {
            toast({ title: "Push scheduled", description: `Will fire in ${secs}s via worker` })
          }
        } catch (scheduleErr) {
          console.error("[RestTimer] /api/push/schedule error:", scheduleErr)
          toast({ title: "Schedule error", description: String(scheduleErr) })
        }
      } else {
        console.log("[RestTimer] No subscription available, skipping server schedule")
        toast({ title: "No push subscription", description: "Timer will only notify if app stays open" })
      }
    } catch (err) {
      console.error("[RestTimer] Push prep failed:", err)
      toast({ title: "Push prep failed", description: String(err) })
    }

    // Ensure remaining is in sync with the requested start seconds and
    // clear any previous timers before starting a new one.
    const startSecs = Math.max(0, Math.floor(secs))
    setRemaining(startSecs)
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Set the end timestamp - this is the source of truth for remaining time
    endAtRef.current = Date.now() + startSecs * 1000
    setRunning(true)
  }

  const pause = () => {
    setRunning(false)
    // When pausing, clear endAt so we can resume with the current remaining time
    endAtRef.current = null
  }

  const resume = () => {
    // Set new endAt based on current remaining time
    endAtRef.current = Date.now() + remaining * 1000
    setRunning(true)
  }

  const reset = () => {
    setRunning(false)
    endAtRef.current = null
    setRemaining(seconds)
  }

  const onTimerEnd = async () => {
    // The scheduled push via Cloudflare DO should have already fired.
    // We just show a local notification (for desktop) and toast for in-app feedback.
    // No server push here to avoid duplicate notifications.
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`${label} finished`, { body: "Time is up", icon: "/icons/icon-192x192.png" })
      }
    } catch {
      // Ignore local notification errors (e.g., iOS doesn't support new Notification())
    }

    toast({ title: "Timer finished", description: "Time is up!" })

    // Ensure UI reflects stopped state
    setRunning(false)
  }

  if (!isOpen) {
    return (
      <Button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        variant="secondary"
        size="icon"
        aria-label="Open rest timer"
        className="inline-flex h-9 w-9 p-0"
      >
        <Check className="w-5 h-5" strokeWidth={3} />
      </Button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="w-full max-w-sm  backdrop-blur-md rounded-3xl p-6 shadow-2xl pointer-events-auto timer-texture h-[80vh]" style={{ 'backgroundColor': "#1C6E8C" }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

          </div>

          {/* Circular timer display */}
          <div className="relative w-64 h-64 mx-auto mb-8">
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>

            {/* Time display in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {!running ? (
                  <div className="flex items-center gap-1">
                    {editingMinutes ? (
                      <input
                        type="number"
                        value={tempMinutes}
                        onChange={(e) => setTempMinutes(e.target.value)}
                        onBlur={applyTimeEdit}
                        onKeyDown={(e) => e.key === "Enter" && applyTimeEdit()}
                        className="w-16 bg-white/20 text-white text-5xl font-bold text-center rounded px-1 outline-none"
                        autoFocus
                        min="0"
                        max="99"
                      />
                    ) : (
                      <button onClick={handleMinutesClick} className="text-5xl font-bold text-white">
                        {String(displayMinutes).padStart(2, "0")}
                      </button>
                    )}
                    <span className="text-5xl font-bold text-white">:</span>
                    {editingSeconds ? (
                      <input
                        type="number"
                        value={tempSeconds}
                        onChange={(e) => setTempSeconds(e.target.value)}
                        onBlur={applyTimeEdit}
                        onKeyDown={(e) => e.key === "Enter" && applyTimeEdit()}
                        className="w-16 bg-white/20 text-white text-5xl font-bold text-center rounded px-1 outline-none"
                        autoFocus
                        min="0"
                        max="59"
                      />
                    ) : (
                      <button onClick={handleSecondsClick} className="text-5xl font-bold text-white">
                        {String(displaySeconds).padStart(2, "0")}
                      </button>
                    )}
                  </div>
                ) : (
                  <button className="text-5xl font-bold text-white">
                    {String(displayMinutes).padStart(2, "0")}:{String(displaySeconds).padStart(2, "0")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Label */}
          <div className="text-center mb-6">
            <p className="text-white text-lg font-medium tracking-wide">{label}</p>
          </div>



          {/* Control buttons */}
          <div className="flex justify-center">
            {!running ? (
              <button
                onClick={() => startWith(seconds)}
                className="w-20 h-20 rounded-full bg-white text-emerald-700 shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
                aria-label="Start"
              >
                <Play className="w-8 h-8 ml-1" fill="currentColor" />
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={resume}
                  className="w-20 h-20 rounded-full bg-white text-emerald-700 shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
                  aria-label="Resume"
                >
                  <Play className="w-8 h-8 ml-1" fill="currentColor" />
                </button>
                <p className="text-white text-sm font-medium">Resume</p>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={pause}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm transition-colors"
                  >
                    Pause
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
