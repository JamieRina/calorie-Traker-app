import dayjs from "dayjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../lib/api-error";
import { localBackend } from "../../lib/local-backend";
import { withLocalFallback } from "../../lib/local-fallback";
import { calculateCalorieGoal } from "../../utils/calorie-goal";
import { ActivityLevel, GoalType, Sex, type ActivityLevel as ActivityLevelValue, type GoalType as GoalTypeValue, type Sex as SexValue } from "../../lib/domain-enums";

type UpsertProfileInput = {
  displayName?: string;
  preferences?: Array<{ type: string; value: string }>;
  dateOfBirth?: string;
  sex?: SexValue;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  activityLevel?: ActivityLevelValue;
  timezone?: string;
  locale?: string;
  onboardingDone?: boolean;
};

export async function calculateAndSaveGoalForUser(userId: string, goalType: GoalTypeValue) {
  return withLocalFallback(
    "profile.calculateGoal",
    async () => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId }
      });

      if (!profile?.currentWeightKg || !profile.heightCm || !profile.dateOfBirth) {
        throw new ApiError(400, "Profile must include date of birth, height, and current weight");
      }

      const age = dayjs().diff(profile.dateOfBirth, "year");
      const calculated = calculateCalorieGoal({
        sex: profile.sex ?? Sex.undisclosed,
        age,
        heightCm: profile.heightCm,
        weightKg: profile.currentWeightKg,
        activityLevel: profile.activityLevel ?? ActivityLevel.moderate,
        goalType
      });

      return prisma.goal.upsert({
        where: { userId },
        update: {
          goalType,
          ...calculated
        },
        create: {
          userId,
          goalType,
          ...calculated
        }
      });
    },
    async () => localBackend.saveGoal(userId, goalType) as any
  );
}

export class ProfileService {
  async getMe(userId: string) {
    return withLocalFallback(
      "profile.getMe",
      async () => {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            profile: true,
            goal: true,
            preferences: true
          }
        });

        if (!user) {
          throw new ApiError(404, "User not found");
        }

        return user;
      },
      async () => localBackend.getProfileResponse(userId) as any
    );
  }

  async upsertMe(userId: string, input: UpsertProfileInput) {
    const { displayName, preferences, dateOfBirth, ...profileInput } = input;

    return withLocalFallback(
      "profile.upsertMe",
      async () =>
        prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
          if (displayName) {
            await transaction.user.update({
              where: { id: userId },
              data: { displayName }
            });
          }

          await transaction.userProfile.upsert({
            where: { userId },
            update: {
              ...profileInput,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
            },
            create: {
              userId,
              ...profileInput,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
            }
          });

          if (preferences) {
            await transaction.dietaryPreference.deleteMany({
              where: { userId }
            });

            if (preferences.length > 0) {
              await transaction.dietaryPreference.createMany({
                data: preferences.map((preference) => ({
                  userId,
                  type: preference.type,
                  value: preference.value
                })),
                skipDuplicates: true
              });
            }
          }

          return transaction.user.findUniqueOrThrow({
            where: { id: userId },
            include: {
              profile: true,
              goal: true,
              preferences: true
            }
          });
        }),
      async () => localBackend.upsertProfile(userId, input) as any
    );
  }

  async calculateAndSaveGoal(userId: string, goalType: GoalTypeValue) {
    return calculateAndSaveGoalForUser(userId, goalType);
  }
}

export const profileService = new ProfileService();
