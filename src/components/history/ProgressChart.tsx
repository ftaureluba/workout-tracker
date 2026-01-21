"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/ui/card";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { ExerciseHistoryPoint } from "@/app/actions/history";
import { format } from "date-fns";

interface ProgressChartProps {
    data: ExerciseHistoryPoint[];
    metric: "oneRM" | "volume" | "weight";
    title: string;
    description?: string;
}

export function ProgressChart({ data, metric, title, description }: ProgressChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description || "No data available"}</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No history data found for this exercise.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => format(new Date(val), "MMM d")}
                                minTickGap={30}
                                style={{ fontSize: '0.8rem' }}
                            />
                            <YAxis style={{ fontSize: '0.8rem' }} width={30} />
                            <Tooltip
                                labelFormatter={(label) => format(new Date(label), "PPP")}
                                formatter={(value: number) => [Math.round(value), metric === "oneRM" ? "Est. 1RM" : metric === "volume" ? "Volume" : "Weight"]}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey={metric}
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
