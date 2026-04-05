import type {
  Comment,
  Follow,
  Like,
  Post,
  Restaurant,
  Save,
  User,
  UserId,
  AppNotification,
} from "@/types";

export const MOCK_USERS: User[] = [
  {
    id: "u1",
    handle: "you",
    avatarUrl: null,
  },
  {
    id: "u2",
    handle: "minaal",
    avatarUrl: null,
  },
  {
    id: "u3",
    handle: "jamesk",
    avatarUrl: null,
  },
  {
    id: "u4",
    handle: "saran",
    avatarUrl: null,
  },
  {
    id: "u5",
    handle: "omar",
    avatarUrl: null,
  },
];

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: "r1",
    name: "KLSentralBites Café",
    slug: "klsentralbites-cafe",
    hashtag: "KLSentralBitesCafe",
  },
  {
    id: "r2",
    name: "Bangsar Noodle Lab",
    slug: "bangsar-noodle-lab",
    hashtag: "BangsarNoodleLab",
  },
  {
    id: "r3",
    name: "The Lunch Club",
    slug: "the-lunch-club",
    hashtag: "TheLunchClub",
  },
  {
    id: "r4",
    name: "Petaling Rice House",
    slug: "petaling-rice-house",
    hashtag: "PetalingRiceHouse",
  },
  {
    id: "r5",
    name: "Sentral Salad Co",
    slug: "sentral-salad-co",
    hashtag: "SentralSaladCo",
  },
  {
    id: "r6",
    name: "Mont Kiara Bowl",
    slug: "mont-kiara-bowl",
    hashtag: "MontKiaraBowl",
  },
];

export const MOCK_POSTS: Post[] = [];

export const MOCK_COMMENTS: Comment[] = [];

export const MOCK_LIKES: Like[] = [];

export const MOCK_SAVES: Save[] = [];

export const MOCK_FOLLOWS: Follow[] = [];

export function buildNotifications(
  posts: Post[],
  likes: Like[],
  comments: Comment[],
  follows: Follow[],
  currentUserId: UserId,
): AppNotification[] {
  const myPostIds = new Set(
    posts.filter((p) => p.authorId === currentUserId).map((p) => p.id),
  );
  const out: AppNotification[] = [];

  for (const like of likes) {
    if (!myPostIds.has(like.postId) || like.userId === currentUserId) continue;
    out.push({
      id: `n-like-${like.postId}-${like.userId}`,
      type: "like",
      actorId: like.userId,
      postId: like.postId,
      createdAt: "2026-03-26T10:00:00Z",
    });
  }
  for (const c of comments) {
    if (!myPostIds.has(c.postId) || c.authorId === currentUserId) continue;
    out.push({
      id: `n-c-${c.id}`,
      type: "comment",
      actorId: c.authorId,
      postId: c.postId,
      createdAt: c.createdAt,
      preview: c.body,
    });
  }
  for (const f of follows) {
    if (
      f.followingId !== currentUserId ||
      f.followerId === currentUserId
    ) {
      continue;
    }
    out.push({
      id: `n-follow-${f.followerId}-${f.followingId}`,
      type: "follow",
      actorId: f.followerId,
      createdAt: "2026-03-26T11:00:00Z",
    });
  }
  return out.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
