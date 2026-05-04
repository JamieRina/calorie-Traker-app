import { prisma } from "../../config/prisma";
import { localBackend } from "../../lib/local-backend";
import { withLocalFallback } from "../../lib/local-fallback";
import { type ProgressRecord } from "../../lib/service-contracts";

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
    return withLocalFallback<ProgressRecord>(
      "progress.create",
      async () =>
        db.progressEntry.create({
          data: {
            userId,
            ...input,
            recordedAt: new Date(input.recordedAt)
          }
        }),
      async () => localBackend.createProgressEntry(userId, input)
    );
  }

  async list(userId: string) {
    return withLocalFallback<ProgressRecord[]>(
      "progress.list",
      async () =>
        prisma.progressEntry.findMany({
          where: { userId },
          orderBy: { recordedAt: "desc" },
          take: 30
        }),
      async () => localBackend.listProgressEntries(userId)
    );
  }
}

export const progressService = new ProgressService();
