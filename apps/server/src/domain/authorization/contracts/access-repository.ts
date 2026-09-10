import type { RegistrationPolicy } from "../entities/registration-policy";
import type { AccessRole } from "../entities/role";
export type AccessUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  banned: boolean;
};
export interface AccessStore {
  activeAdmins(): Promise<number>;
  approve(userId: string): Promise<boolean>;
  assign(userId: string, roleId: string): Promise<void>;
  assigned(id: string): Promise<boolean>;
  pendingCount(): Promise<number>;
  pendingUsers(
    page: number
  ): Promise<{ items: AccessUser[]; hasMore: boolean }>;
  registrationPolicy(): Promise<RegistrationPolicy>;
  remove(id: string): Promise<void>;
  role(id: string): Promise<AccessRole | null>;
  roles(): Promise<AccessRole[]>;
  save(role: AccessRole): Promise<void>;
  saveRegistrationPolicy(policy: RegistrationPolicy): Promise<void>;
  user(id: string): Promise<AccessUser | null>;
  users(
    page: number,
    search: string
  ): Promise<{ items: AccessUser[]; hasMore: boolean }>;
}
export interface AccessRepository extends AccessStore {
  // Serializa mudanças de acesso; todas as validações sensíveis acontecem na transação.
  transaction<T>(work: (store: AccessStore) => Promise<T>): Promise<T>;
}
