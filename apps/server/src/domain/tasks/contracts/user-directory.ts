// Só o necessário para mencionar e atribuir autoria: nada de email, papel ou estado da conta.
export type TaskUser = {
  id: string;
  name: string;
  username: string | null;
};

export interface UserDirectory {
  // Devolve apenas as contas existentes; ids desconhecidos ficam de fora.
  byIds(ids: readonly string[]): Promise<TaskUser[]>;
  search(term: string, limit: number): Promise<TaskUser[]>;
}
