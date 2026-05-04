import { prisma } from "../../config/prisma";
import { withLocalFallback } from "../../lib/local-fallback";

type CommunityContentResponse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  contentType: string;
  authorName: string;
  coverImage: string | null;
  body: string;
  publishedAt: string | null;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
};

type CommunityChallengeResponse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  startsAt: string;
  endsAt: string;
  badgeId: string | null;
  createdAt: string;
};

type CommunityFeedResponse = {
  featured: CommunityContentResponse[];
  latest: CommunityContentResponse[];
  challenges: CommunityChallengeResponse[];
};

function toIso(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapContent(item: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  contentType: string;
  authorName: string;
  coverImage: string | null;
  body: string;
  publishedAt: Date | string | null;
  isPremium: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}): CommunityContentResponse {
  return {
    ...item,
    publishedAt: toIso(item.publishedAt),
    createdAt: toIso(item.createdAt)!,
    updatedAt: toIso(item.updatedAt)!
  };
}

function mapChallenge(item: {
  id: string;
  title: string;
  slug: string;
  description: string;
  startsAt: Date | string;
  endsAt: Date | string;
  badgeId: string | null;
  createdAt: Date | string;
}): CommunityChallengeResponse {
  return {
    ...item,
    startsAt: toIso(item.startsAt)!,
    endsAt: toIso(item.endsAt)!,
    createdAt: toIso(item.createdAt)!
  };
}

const localFeed = {
  featured: [
    {
      id: "local-content-1",
      slug: "7-day-high-protein-reset",
      title: "7-day high-protein reset",
      summary: "A practical challenge for faster, simpler meal planning.",
      contentType: "challenge",
      authorName: "NutriTrack Coach",
      coverImage: null,
      body: "Daily recipes, quick workouts, and simple logging targets.",
      publishedAt: new Date().toISOString(),
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  latest: [
    {
      id: "local-content-1",
      slug: "7-day-high-protein-reset",
      title: "7-day high-protein reset",
      summary: "A practical challenge for faster, simpler meal planning.",
      contentType: "challenge",
      authorName: "NutriTrack Coach",
      coverImage: null,
      body: "Daily recipes, quick workouts, and simple logging targets.",
      publishedAt: new Date().toISOString(),
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "local-content-2",
      slug: "busy-day-workout",
      title: "Busy day workout",
      summary: "A short session designed for lunch breaks and crowded schedules.",
      contentType: "workout",
      authorName: "NutriTrack Coach",
      coverImage: null,
      body: "Warm-up, push-pull circuit, and cooldown.",
      publishedAt: new Date().toISOString(),
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  challenges: [
    {
      id: "local-challenge-1",
      title: "Log three breakfasts",
      slug: "log-three-breakfasts",
      description: "Build an easy morning routine with three logged breakfasts this week.",
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      badgeId: null,
      createdAt: new Date().toISOString()
    }
  ]
} satisfies CommunityFeedResponse;

export class CommunityService {
  async getFeed() {
    return withLocalFallback<CommunityFeedResponse>(
      "community.feed",
      async () => {
        const [content, challenges] = await Promise.all([
          prisma.influencerContent.findMany({
            where: {
              publishedAt: {
                not: null
              }
            },
            orderBy: {
              publishedAt: "desc"
            },
            take: 20
          }),
          prisma.challenge.findMany({
            orderBy: {
              startsAt: "asc"
            },
            take: 5
          })
        ]);
        const latest = content.map(mapContent);

        return {
          featured: latest.slice(0, 3),
          latest,
          challenges: challenges.map(mapChallenge)
        };
      },
      async () => localFeed
    );
  }
}

export const communityService = new CommunityService();
