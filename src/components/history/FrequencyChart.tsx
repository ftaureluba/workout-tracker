"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/ui/card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FrequencyData } from "@/app/actions/history";

interface FrequencyChartProps {
    data: FrequencyData[];
}

export function FrequencyChart({ data }: FrequencyChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Workout Consistency</CardTitle>
                    <CardDescription>Workouts per month over the last year</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No workout data found.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Workout Consistency</CardTitle>
                <CardDescription>Sessions completed per month</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <XAxis
                                dataKey="period"
                                style={{ fontSize: '0.8rem' }}
                                tickFormatter={(val) => {
                                    // val is YYYY-MM
                                    const [y, m] = val.split('-');
                                    const date = new Date(parseInt(y), parseInt(m) - 1);
                                    return date.toLocaleString('default', { month: 'short' });
                                }}
                            />
                            <YAxis style={{ fontSize: '0.8rem' }} allowDecimals={false} width={30} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar
                                dataKey="count"
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
