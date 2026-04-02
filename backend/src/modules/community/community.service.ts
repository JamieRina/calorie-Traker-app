import { prisma } from "../../config/prisma";

export class CommunityService {
  async getFeed() {
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

    return {
      featured: content.slice(0, 3),
      latest: content,
      challenges
    };
  }
}

export const communityService = new CommunityService();
