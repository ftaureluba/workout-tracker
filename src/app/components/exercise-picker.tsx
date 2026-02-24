"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Search, X, Loader2 } from "lucide-react"

type Exercise = {
  id: string
  name: string
  description?: string
  notes?: string
  bodyParts: string[] // Now a direct array
  equipment: string[] // Now a direct array
  movementType: string
  movementPattern: string
  lastPerformedAt?: Date
  bestWeight?: number
  bestVolume?: number
  best1RM?: number
  userId?: string
  createdAt?: Date
  updatedAt?: Date
}

interface ExercisePickerProps {
  isOpen: boolean
  onClose: () => void
  onAddExercise: (exercise: { id: string; name: string }) => void
}

export default function ExercisePicker({ isOpen, onClose, onAddExercise }: ExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [selectedMovementType, setSelectedMovementType] = useState<string | null>(null)
  const [selectedMovementPattern, setSelectedMovementPattern] = useState<string | null>(null)

  // Fetch exercises when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchExercises()
    }
  }, [isOpen])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/exercises")
      if (!response.ok) {
        throw new Error("Failed to fetch exercises")
      }
      const data = await response.json()
      setExercises(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Error fetching exercises:", err)
    } finally {
      setLoading(false)
    }
  }

  const toggleBodyPart = (bodyPart: string) => {
    setSelectedBodyParts((prev) =>
      prev.includes(bodyPart) ? prev.filter((bp) => bp !== bodyPart) : [...prev, bodyPart],
    )
  }

  const toggleEquipment = (equip: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(equip) ? prev.filter((e) => e !== equip) : [...prev, equip],
    )
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedBodyParts([])
    setSelectedEquipment([])
    setSelectedMovementType(null)
    setSelectedMovementPattern(null)
  }

  const hasActiveFilters =
    searchQuery ||
    selectedBodyParts.length > 0 ||
    selectedEquipment.length > 0 ||
    selectedMovementType ||
    selectedMovementPattern

  // Extract unique body parts, equipment, movement types, and patterns from data
  // Filter out "unknown" or empty values to keep UI clean
  const filterOptions = useMemo(() => {
    const bodyParts = new Set<string>()
    const equipment = new Set<string>()
    const movementTypes = new Set<string>()
    const movementPatterns = new Set<string>()

    exercises.forEach((exercise) => {
      exercise.bodyParts.forEach((bp) => { if (bp && bp.toLowerCase() !== 'unknown') bodyParts.add(bp) })
      exercise.equipment.forEach((eq) => { if (eq && eq.toLowerCase() !== 'unknown') equipment.add(eq) })
      if (exercise.movementType && exercise.movementType.toLowerCase() !== 'unknown') movementTypes.add(exercise.movementType)
      if (exercise.movementPattern && exercise.movementPattern.toLowerCase() !== 'unknown') movementPatterns.add(exercise.movementPattern)
    })

    return {
      bodyParts: Array.from(bodyParts).sort(),
      equipment: Array.from(equipment).sort(),
      movementTypes: Array.from(movementTypes).sort(),
      movementPatterns: Array.from(movementPatterns).sort(),
    }
  }, [exercises])

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase())

      // Body parts filtering
      let matchesBodyPart = true
      if (selectedBodyParts.length > 0) {
        matchesBodyPart = selectedBodyParts.some((bp) => exercise.bodyParts.includes(bp))
      }

      // Equipment filtering
      let matchesEquipment = true
      if (selectedEquipment.length > 0) {
        matchesEquipment = selectedEquipment.some((eq) => exercise.equipment.includes(eq))
      }

      // Movement type filtering
      const matchesMovementType = !selectedMovementType || exercise.movementType === selectedMovementType

      // Movement pattern filtering
      const matchesMovementPattern =
        !selectedMovementPattern || exercise.movementPattern === selectedMovementPattern

      return matchesSearch && matchesBodyPart && matchesEquipment && matchesMovementType && matchesMovementPattern
    })
  }, [searchQuery, selectedBodyParts, selectedEquipment, selectedMovementType, selectedMovementPattern, exercises])

  const handleAddExercise = (exercise: { id: string; name: string }) => {
    onAddExercise(exercise)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-0 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Add exercise</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 space-y-4 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-input"
              disabled={loading}
            />
          </div>

          {/* Body Part Filters */}
          {filterOptions.bodyParts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">Body Part</label>
                {selectedBodyParts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBodyParts([])}
                    className="h-auto py-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.bodyParts.map((bodyPart) => (
                  <Badge
                    key={bodyPart}
                    variant={selectedBodyParts.includes(bodyPart) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => toggleBodyPart(bodyPart)}
                  >
                    {bodyPart}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Equipment Filters */}
          {filterOptions.equipment.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">Equipment</label>
                {selectedEquipment.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEquipment([])}
                    className="h-auto py-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.equipment.map((equip) => (
                  <Badge
                    key={equip}
                    variant={selectedEquipment.includes(equip) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => toggleEquipment(equip)}
                  >
                    {equip}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Movement Type Filters */}
          {filterOptions.movementTypes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">Movement Type</label>
                {selectedMovementType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMovementType(null)}
                    className="h-auto py-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.movementTypes.map((type) => (
                  <Badge
                    key={type}
                    variant={selectedMovementType === type ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => setSelectedMovementType(selectedMovementType === type ? null : type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Movement Pattern Filters */}
          {filterOptions.movementPatterns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">Movement Pattern</label>
                {selectedMovementPattern && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMovementPattern(null)}
                    className="h-auto py-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.movementPatterns.map((pattern) => (
                  <Badge
                    key={pattern}
                    variant={selectedMovementPattern === pattern ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => setSelectedMovementPattern(selectedMovementPattern === pattern ? null : pattern)}
                  >
                    {pattern}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Clear All Filters */}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="w-full bg-transparent">
              <X className="h-4 w-4 mr-2" />
              Clear all filters
            </Button>
          )}
        </div>

        {/* Exercise List */}
        <div className="flex-1 mt-4 min-h-0 border-t">
          <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            <div className="px-0 py-0">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-lg font-medium">Loading exercises...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium">Error loading exercises</p>
                  <p className="text-sm mt-1">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchExercises} className="mt-4">
                    Retry
                  </Button>
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium">No exercises found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                filteredExercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="flex items-center justify-between py-4 px-6 hover:bg-accent/50 transition-colors group border-b border-border last:border-0"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="font-medium text-lg">{exercise.name}</div>
                      {exercise.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{exercise.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {exercise.bodyParts.length > 0 && exercise.bodyParts.some(x => x.toLowerCase() !== 'unknown') && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {exercise.bodyParts.filter(x => x.toLowerCase() !== 'unknown').join(", ")}
                          </span>
                        )}
                        {exercise.equipment.length > 0 && exercise.equipment.some(x => x.toLowerCase() !== 'unknown') && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {exercise.equipment.filter(x => x.toLowerCase() !== 'unknown').join(", ")}
                          </span>
                        )}
                        {exercise.movementType && exercise.movementType.toLowerCase() !== 'unknown' && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">{exercise.movementType}</span>
                        )}
                      </div>
                      {exercise.best1RM && (
                        <div className="text-xs text-muted-foreground">
                          Best 1RM: {exercise.best1RM} • Last: {exercise.lastPerformedAt ? new Date(exercise.lastPerformedAt).toLocaleDateString() : "Never"}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddExercise({ id: exercise.id, name: exercise.name })}
                      className="opacity-100 ml-4 shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
