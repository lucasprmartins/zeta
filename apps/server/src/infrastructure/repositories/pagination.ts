// Uma linha a mais que o tamanho da página revela se há continuação, sem um
// segundo `count(*)`. As listagens do domínio compartilham este contrato.
export const PAGE_SIZE = 20;

// Lê uma linha além da página para descobrir se existe a próxima.
export const pageLimit = PAGE_SIZE + 1;
export const pageOffset = (page: number) => (page - 1) * PAGE_SIZE;

export function paginate<T>(rows: readonly T[]): {
  items: T[];
  hasMore: boolean;
} {
  return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}
