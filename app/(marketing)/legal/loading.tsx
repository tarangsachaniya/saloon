import { ProsePageSkeleton } from "@/components/loading/marketing";

/** Route-level loading UI: shown while this page's data and code load. */
export default function Loading() {
  return <ProsePageSkeleton label="Loading…" />;
}
