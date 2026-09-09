import type { AccessRole } from "../entities/role";
export type AccessUser = { id: string; name: string; email: string; username: string | null; role: string; banned: boolean };
export interface AccessStore {
  role(id: string): Promise<AccessRole | null>;
  roles(): Promise<AccessRole[]>;
  user(id: string): Promise<AccessUser | null>;
  users(page: number, search: string): Promise<{ items: AccessUser[]; hasMore: boolean }>;
  save(role: AccessRole): Promise<void>;
  remove(id: string): Promise<void>;
  assigned(id: string): Promise<boolean>;
  assign(userId: string, roleId: string): Promise<void>;
  activeAdmins(): Promise<number>;
}
export interface AccessRepository extends AccessStore {
  // Serializa mudanças de acesso; todas as validações sensíveis acontecem na transação.
  transaction<T>(work: (store: AccessStore) => Promise<T>): Promise<T>;
}
