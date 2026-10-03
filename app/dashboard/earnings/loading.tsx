import { AdminPageSkeleton } from "@/components/loading/admin";

/** Route-level loading UI: shown while this page's data and code load. */
export default function Loading() {
  return <AdminPageSkeleton variant="cards" label="Loading earnings…" />;
}
