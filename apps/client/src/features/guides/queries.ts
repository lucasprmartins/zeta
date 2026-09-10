import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { nextPageIfMore } from "@/lib/query";
import { rpc } from "@/lib/rpc";
export type Guide = Awaited<ReturnType<typeof rpc.guides.adminGet>>;
export const guideKeys = {
  all: (userId: string) => ["guides", userId] as const,
};
export const guidesQuery = (userId: string, admin: boolean) =>
  infiniteQueryOptions({
    queryKey: [
      ...guideKeys.all(userId),
      admin ? "administration" : "published",
      "infinite",
    ],
    initialPageParam: 1,
    queryFn: async ({ signal, pageParam }) => {
      if (admin) {
        const result = await rpc.guides.adminList(
          { page: pageParam },
          { signal }
        );
        return {
          hasMore: result.hasMore,
          items: result.items.map((guide) => ({
            slug: guide.slug,
            title: guide.draft.title,
            section: guide.draft.section,
            order: guide.draft.order,
            published: !!guide.published,
          })),
        };
      }
      const result = await rpc.guides.list({ page: pageParam }, { signal });
      return {
        ...result,
        items: result.items.map((guide) => ({ ...guide, published: true })),
      };
    },
    getNextPageParam: nextPageIfMore,
  });
export const guideQuery = (userId: string, slug: string) =>
  queryOptions({
    queryKey: [...guideKeys.all(userId), "read", slug],
    queryFn: ({ signal }) => rpc.guides.read({ slug }, { signal }),
  });
export const guideEditQuery = (userId: string, slug: string) =>
  queryOptions({
    queryKey: [...guideKeys.all(userId), "edit", slug],
    queryFn: ({ signal }) => rpc.guides.adminGet({ slug }, { signal }),
  });
