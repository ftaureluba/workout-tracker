
import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/app/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/app/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/app/ui/popover";
import { cn } from "@/lib/utils";
import { ExerciseOption } from "@/app/actions/history";

interface ExerciseSelectorProps {
    exercises: ExerciseOption[];
    selectedExerciseId?: string;
    onSelect: (id: string | undefined) => void;
}

export function ExerciseSelector({ exercises, selectedExerciseId, onSelect }: ExerciseSelectorProps) {
    const [open, setOpen] = React.useState(false);

    const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedExercise ? selectedExercise.name : "Select exercise..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search exercise..." />
                    <CommandList>
                        <CommandEmpty>No exercise found.</CommandEmpty>
                        <CommandGroup>
                            {exercises.map((exercise) => (
                                <CommandItem
                                    key={exercise.id}
                                    value={exercise.name}
                                    onSelect={(currentValue) => {
                                        // CommandItem value is practically the name here.
                                        // We match back by ID or name
                                        onSelect(exercise.id === selectedExerciseId ? undefined : exercise.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedExerciseId === exercise.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {exercise.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
