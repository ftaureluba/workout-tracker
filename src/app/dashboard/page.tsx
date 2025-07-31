import { lusitana } from "@/app/ui/fonts";
import Link from 'next/link';
import * as authExports from "@/lib/auth";

export default async function Page() {
  console.log("Auth exports:", Object.keys(authExports));
  console.log("Auth function:", authExports.auth);
  console.log("Auth type:", typeof authExports.auth);
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Dashboard
      </h1>
      <div>
        <Link href="/dashboard/workouts">My Workouts</Link>
      </div>
      <div>
        <Link href="/dashboard/profile">My Profile</Link>
      </div>
    </main>
  );
}
