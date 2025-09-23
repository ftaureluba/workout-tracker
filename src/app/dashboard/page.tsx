'use client'
import Link from 'next/link';
import { Menu, User, Plus, Dumbbell, Clock, Target, X } from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { useState } from "react";


export default  function Page() {

  interface Routine {
    id: number;
    name: string;
    exercises: number;
    duration: string;
    lastPerformed: string;
    description: string;
    exerciseList: string[];
    difficulty: string;
  }

  const [selectedWorkout, setSelectedWorkout] = useState<Routine | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const routines = [
    {
      id: 1,
      name: "Push Day",
      exercises: 6,
      duration: "45 min",
      lastPerformed: "2 days ago",
      description: "Focus on chest, shoulders, and triceps",
      exerciseList: [
        "Bench Press - 4 sets x 8-10 reps",
        "Overhead Press - 3 sets x 8-12 reps",
        "Incline Dumbbell Press - 3 sets x 10-12 reps",
        "Lateral Raises - 3 sets x 12-15 reps",
        "Tricep Dips - 3 sets x 10-15 reps",
        "Push-ups - 2 sets x max reps",
      ],
      difficulty: "Intermediate",
    },
    {
      id: 2,
      name: "Pull Day",
      exercises: 5,
      duration: "40 min",
      lastPerformed: "4 days ago",
      description: "Target your back, biceps, and rear delts",
      exerciseList: [
        "Pull-ups - 4 sets x 6-10 reps",
        "Barbell Rows - 4 sets x 8-10 reps",
        "Lat Pulldowns - 3 sets x 10-12 reps",
        "Face Pulls - 3 sets x 12-15 reps",
        "Bicep Curls - 3 sets x 10-12 reps",
      ],
      difficulty: "Intermediate",
    },
    {
      id: 3,
      name: "Leg Day",
      exercises: 7,
      duration: "60 min",
      lastPerformed: "1 week ago",
      description: "Complete lower body strength and power",
      exerciseList: [
        "Squats - 4 sets x 8-10 reps",
        "Romanian Deadlifts - 4 sets x 8-10 reps",
        "Bulgarian Split Squats - 3 sets x 10 each leg",
        "Leg Press - 3 sets x 12-15 reps",
        "Calf Raises - 4 sets x 15-20 reps",
        "Leg Curls - 3 sets x 10-12 reps",
        "Walking Lunges - 2 sets x 20 steps",
      ],
      difficulty: "Advanced",
    },
    {
      id: 4,
      name: "Full Body",
      exercises: 8,
      duration: "50 min",
      lastPerformed: "3 days ago",
      description: "Balanced workout hitting all major muscle groups",
      exerciseList: [
        "Deadlifts - 3 sets x 6-8 reps",
        "Push-ups - 3 sets x 10-15 reps",
        "Squats - 3 sets x 10-12 reps",
        "Pull-ups - 3 sets x 5-10 reps",
        "Overhead Press - 3 sets x 8-10 reps",
        "Plank - 3 sets x 30-60 seconds",
        "Mountain Climbers - 3 sets x 20 reps",
        "Burpees - 2 sets x 8-12 reps",
      ],
      difficulty: "Beginner",
    },
  ]
  const handleWorkoutClick = (routine: Routine) => {
    setSelectedWorkout(routine)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedWorkout(null)
  }
  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Menu className="h-6 w-6" />
        </Button>

        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          <User className="h-6 w-6" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Workouts</h1>
          <p className="text-muted-foreground text-sm">Choose a routine or start a free workout</p>
        </div>

        {/* Routine Cards */}
        <div className="grid gap-4 mb-6">
          {routines.map((routine) => (
            <Card
              key={routine.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleWorkoutClick(routine)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">{routine.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>{routine.exercises} exercises</span>
                  <span>{routine.duration}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Last performed: {routine.lastPerformed}</div>
              </CardContent>
            </Card>
          ))}

          {/* Create New Routine Card */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-muted-foreground font-medium">Create New Routine</span>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button className="w-full h-12 text-base font-semibold" size="lg">
          <Dumbbell className="h-5 w-5 mr-2" />
          Start Empty Workout
        </Button>
      </div>

      {isModalOpen && selectedWorkout && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-background w-full max-h-[80vh] rounded-t-xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">{selectedWorkout.name}</h2>
              <Button variant="ghost" size="icon" onClick={closeModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
              <p className="text-muted-foreground mb-4">{selectedWorkout.description}</p>

              {/* Workout Stats */}
              <div className="flex gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedWorkout.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedWorkout.difficulty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedWorkout.exercises} exercises</span>
                </div>
              </div>

              {/* Exercise List */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Exercises</h3>
                <div className="space-y-2">
                  {selectedWorkout.exerciseList.map((exercise: string, index: number) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">{exercise}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-background">
              <Button className="w-full h-12 text-base font-semibold" size="lg">
                <Dumbbell className="h-5 w-5 mr-2" />
                Start Workout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
