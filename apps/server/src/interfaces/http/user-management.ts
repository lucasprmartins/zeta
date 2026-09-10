import type { AccessUser } from "@server/domain/authorization/contracts/access-repository";

// Contrato técnico de gestão de identidade; senhas e cookies não entram no domínio.
export type UserFields = {
  name: string;
  username: string;
  email: string;
  roleId: string;
  password?: string;
};
export interface UserManagement {
  create(headers: Headers, input: UserFields): Promise<AccessUser>;
  update(
    headers: Headers,
    input: UserFields & { userId: string }
  ): Promise<AccessUser>;
}
