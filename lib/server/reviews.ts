import "server-only";

import prisma from "./prisma";

/** Average + count of PUBLISHED reviews, per salon. Salons with none are absent. */
export type RatingSummary = { average: number; count: number };

export async function getRatingSummaries(salonIds: string[]): Promise<Map<string, RatingSummary>> {
  const result = new Map<string, RatingSummary>();
  if (salonIds.length === 0) return result;

  const rows = await prisma.review.groupBy({
    by: ["salonId"],
    where: { salonId: { in: salonIds }, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const row of rows) {
    if (row._avg.rating !== null && row._count._all > 0) {
      result.set(row.salonId, {
        average: Math.round(row._avg.rating * 10) / 10,
        count: row._count._all,
      });
    }
  }
  return result;
}

/** Recent published reviews with a written comment, newest first. */
export function getRecentReviews({ salonId, take = 6, minRating = 1 }: { salonId?: string; take?: number; minRating?: number } = {}) {
  return prisma.review.findMany({
    where: {
      status: "PUBLISHED",
      comment: { not: null },
      rating: { gte: minRating },
      ...(salonId ? { salonId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      rating: true,
      comment: true,
      authorName: true,
      createdAt: true,
      ownerReply: true,
      salon: { select: { name: true, slug: true } },
    },
  });
}
