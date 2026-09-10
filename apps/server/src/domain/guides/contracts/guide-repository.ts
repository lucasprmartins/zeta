import type { Guide } from "../entities/guide";
export interface GuideRepository {
  find(slug: string): Promise<Guide | null>;
  insert(guide: Guide): Promise<boolean>;
  list(
    page: number,
    grants: readonly string[] | null
  ): Promise<{ items: Guide[]; hasMore: boolean }>;
  replace(guide: Guide, expectedVersion: number): Promise<boolean>;
}
