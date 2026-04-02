import { prisma } from "../../config/prisma";
import { localBackend } from "../../lib/local-backend";
import { withLocalFallback } from "../../lib/local-fallback";

type ProgressDbClient = Pick<typeof prisma, "progressEntry">;

export type CreateProgressInput = {
  weightKg?: number;
  bodyFatPct?: number;
  mood?: string;
  note?: string;
  recordedAt: string;
};

export class ProgressService {
  async create(userId: string, input: CreateProgressInput, db: ProgressDbClient = prisma) {
    return withLocalFallback(
      "progress.create",
      async () =>
        db.progressEntry.create({
          data: {
            userId,
            ...input,
            recordedAt: new Date(input.recordedAt)
          }
        }),
      async () => localBackend.createProgressEntry(userId, input) as any
    );
  }

  async list(userId: string) {
    return withLocalFallback(
      "progress.list",
      async () =>
        prisma.progressEntry.findMany({
          where: { userId },
          orderBy: { recordedAt: "desc" },
          take: 30
        }),
      async () => localBackend.listProgressEntries(userId) as any
    );
  }
}

export const progressService = new ProgressService();
