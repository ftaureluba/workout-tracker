import { notFound } from "next/navigation";

export default function Page() {
  // This route has been removed. Return 404 to avoid stale redirects.
  notFound();
}
