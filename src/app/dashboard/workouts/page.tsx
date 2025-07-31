
import Link from 'next/link';

export default function Page() {
  return (
    <div>
      <h1>Saved Workouts</h1>
      <Link href="/dashboard/workouts/new">Start a New Workout</Link>
      <ul>
        {/* Add logic to list saved workouts here */}
        <li>Workout 1</li>
        <li>Workout 2</li>
        <li>Workout 3</li>
      </ul>
    </div>
  );
}
