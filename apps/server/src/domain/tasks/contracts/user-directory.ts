// Só o necessário para identificar a conta na tela: nada de email, papel ou estado.
export type TaskUser = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
};

export interface UserDirectory {
  // Devolve apenas as contas existentes; ids desconhecidos ficam de fora.
  byIds(ids: readonly string[]): Promise<TaskUser[]>;
  search(term: string, limit: number): Promise<TaskUser[]>;
}
