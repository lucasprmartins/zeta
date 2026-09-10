import type { RpcContext } from "./context";
import type { RegistrationPolicy } from "@server/domain/authorization/entities/registration-policy";
import type { UserFields, UserManagement } from "../user-management";
import { ORPCError, os, type } from "@orpc/server";
import type { JSONSchema } from "@orpc/openapi";
import type { manageAccess } from "@server/domain/authorization/application/manage-access";
import { AccessError } from "@server/domain/authorization/entities/role";
import type { AccessRole } from "@server/domain/authorization/entities/role";
import type { AccessUser } from "@server/domain/authorization/contracts/access-repository";
import { catalog, permissions } from "@server/infrastructure/auth/access";
import { documented } from "../openapi/schema";
import { protectedProcedure, requirePermission } from "./context";

const textSchema: JSONSchema = { type: "string" };
const grantsSchema: JSONSchema = { type: "array", items: textSchema };
const colorSchema: JSONSchema = { type: "string", pattern: "^#[0-9a-fA-F]{6}$", default: "#737373" };
const roleSchema: JSONSchema = { type: "object", required: ["id", "name", "color", "grants", "protected"], properties: { id: textSchema, name: textSchema, color: colorSchema, grants: grantsSchema, protected: { type: "boolean" } } };
const object = (input: unknown): Record<string, unknown> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ORPCError("BAD_REQUEST");
  return input as Record<string, unknown>;
};
const text = (value: unknown, max = 120) => {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new ORPCError("BAD_REQUEST", { message: "Texto inválido." });
  return value.trim();
};
const saveInput = documented(type<{ id?: string; name: string; grants: string[]; color?: string }>((input) => {
  const data = object(input);
  if (!Array.isArray(data.grants) || data.grants.length > 1000 || data.grants.some((grant) => typeof grant !== "string")) throw new ORPCError("BAD_REQUEST");
  return { ...(data.id === undefined ? {} : { id: text(data.id) }), name: text(data.name, 60), ...(data.color === undefined ? {} : { color: text(data.color, 7) }), grants: data.grants as string[] };
}), { type: "object", required: ["name", "grants"], properties: { id: textSchema, name: { type: "string", minLength: 1, maxLength: 60 }, color: colorSchema, grants: grantsSchema } });
const idInput = documented(type<{ id: string }>((input) => ({ id: text(object(input).id) })), { type: "object", required: ["id"], properties: { id: textSchema } });
const assignInput = documented(type<{ userId: string; roleId: string }>((input) => { const data = object(input); return { userId: text(data.userId), roleId: text(data.roleId) }; }), { type: "object", required: ["userId", "roleId"], properties: { userId: textSchema, roleId: textSchema } });
const usersInput = documented(type<{ page?: number; search?: string } | undefined, { page: number; search: string }>((input) => {
  const data = input == null ? {} : object(input);
  const page = data.page === undefined ? 1 : Number(data.page);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || (data.search !== undefined && (typeof data.search !== "string" || data.search.length > 254))) throw new ORPCError("BAD_REQUEST");
  return { page, search: typeof data.search === "string" ? data.search.trim() : "" };
}), { type: "object", properties: { page: { type: "integer", minimum: 1, maximum: 1000000 }, search: { type: "string", maxLength: 254 } } });
const userSchema: JSONSchema = { type: "object", required: ["id", "name", "username", "email", "role", "banned"], properties: { id: textSchema, name: textSchema, username: { type: ["string", "null"] }, email: textSchema, role: { type: ["string", "null"] }, banned: { type: ["boolean", "null"] } } };
const userFieldsSchema = { type: "object", required: ["name", "username", "email", "roleId"], properties: { userId: textSchema, name: textSchema, username: textSchema, email: textSchema, roleId: textSchema, password: { type: "string", minLength: 8, maxLength: 128, writeOnly: true } } } satisfies JSONSchema;
function parseUser(input: unknown): UserFields {
  const data = object(input);
  if (data.password !== undefined && typeof data.password !== "string") throw new ORPCError("BAD_REQUEST");
  return { name: text(data.name), username: text(data.username, 30), email: text(data.email, 254), roleId: text(data.roleId), ...(data.password === undefined ? {} : { password: data.password as string }) };
}
const policySchema = { type: "object", required: ["allowSignUp", "requireApproval"], properties: { allowSignUp: { type: "boolean" }, requireApproval: { type: "boolean" } } } satisfies JSONSchema;
const policyOutput = documented(type<RegistrationPolicy>(), policySchema);
const policyInput = documented(type<RegistrationPolicy>((input) => {
  const data = object(input);
  if (typeof data.allowSignUp !== "boolean" || typeof data.requireApproval !== "boolean") throw new ORPCError("BAD_REQUEST");
  return { allowSignUp: data.allowSignUp, requireApproval: data.requireApproval };
}), policySchema);
const route = { tags: ["Controle de acesso"], spec: (operation: import("@orpc/openapi").OpenAPI.OperationObject) => ({ ...operation, security: [{ sessionCookie: [] }] }) };
const procedure = protectedProcedure.errors({ BAD_REQUEST: {}, UNAUTHORIZED: {}, FORBIDDEN: {}, NOT_FOUND: {}, CONFLICT: {} }).use(async ({ next }) => {
  try { return await next(); } catch (error) {
    if (error instanceof AccessError) throw new ORPCError(error.code, { message: error.message });
    throw error;
  }
});
export function createAccessRouter(service?: ReturnType<typeof manageAccess>, users?: UserManagement) {
  const getService = () => { if (!service) throw new ORPCError("INTERNAL_SERVER_ERROR"); return service; };
  const getUsers = () => { if (!users) throw new ORPCError("INTERNAL_SERVER_ERROR"); return users; };
  const admin = procedure.use(requirePermission(permissions.access.manage));
  return {
    registrationPolicy: os.$context<RpcContext>().route({ method: "GET", path: "/registration-policy", tags: ["Cadastro"], summary: "Política pública de cadastro" }).output(policyOutput).handler(() => getService().registrationPolicy()),
    registrationStatus: admin.route({ ...route, method: "GET", path: "/access/registration", summary: "Configuração de cadastro e pendências" })
      .output(documented(type<RegistrationPolicy & { pendingCount: number }>(), { ...policySchema, required: [...policySchema.required, "pendingCount"], properties: { ...policySchema.properties, pendingCount: { type: "integer" } } })).handler(({ context }) => getService().registrationStatus(context.user.id)),
    saveRegistrationPolicy: admin.route({ ...route, method: "PUT", path: "/access/registration", summary: "Configurar cadastro e aprovação" }).input(policyInput).output(policyOutput)
      .handler(({ context, input }) => getService().saveRegistrationPolicy(context.user.id, input)),
    pendingUsers: admin.route({ ...route, method: "GET", path: "/access/approvals", summary: "Listar cadastros pendentes" }).input(usersInput)
      .output(documented(type<{ items: AccessUser[]; hasMore: boolean }>(), { type: "object", required: ["items", "hasMore"], properties: { items: { type: "array", items: userSchema }, hasMore: { type: "boolean" } } }))
      .handler(({ context, input }) => getService().pendingUsers(context.user.id, input.page)),
    approveUser: admin.route({ ...route, method: "POST", path: "/access/approvals/{id}", summary: "Aprovar cadastro" }).input(idInput)
      .output(documented(type<{ userId: string }>(), { type: "object", required: ["userId"], properties: { userId: textSchema } }))
      .handler(({ context, input }) => getService().approve(context.user.id, input.id)),
    me: procedure.route({ ...route, method: "GET", path: "/access/me", summary: "Minhas permissões atuais" })
      .output(documented(type<{ userId: string; roleId: string | null; grants: string[] }>(), { type: "object", required: ["userId", "roleId", "grants"], properties: { userId: textSchema, roleId: { type: ["string", "null"] }, grants: grantsSchema } }))
      .handler(({ context }) => ({ userId: context.user.id, roleId: context.user.role, grants: context.user.grants })),
    roles: admin.route({ ...route, method: "GET", path: "/access/roles", summary: "Listar papéis e catálogo" })
      .output(documented(type<{ roles: AccessRole[]; catalog: typeof catalog }>(), { type: "object", required: ["roles", "catalog"], properties: { roles: { type: "array", items: roleSchema }, catalog: { type: "array", items: { type: "object", properties: { resource: textSchema, label: textSchema, actions: { type: "array", items: { type: "object", properties: { id: textSchema, label: textSchema, description: textSchema } } } } } } } }))
      .handler(async ({ context }) => ({ roles: await getService().listRoles(context.user.id), catalog })),
    saveRole: admin.route({ ...route, method: "POST", path: "/access/roles", summary: "Criar ou editar papel" }).input(saveInput).output(documented(type<AccessRole>(), roleSchema))
      .handler(({ input, context }) => getService().save(context.user.id, input)),
    deleteRole: admin.route({ ...route, method: "DELETE", path: "/access/roles/{id}", summary: "Excluir papel sem usuários" }).input(idInput).output(documented(type<{ id: string }>(), { type: "object", properties: { id: textSchema }, required: ["id"] }))
      .handler(({ input, context }) => getService().remove(context.user.id, input.id)),
    users: admin.route({ ...route, method: "GET", path: "/access/users", summary: "Listar usuários agrupados por papel" }).input(usersInput)
      .output(documented(type<{ items: AccessUser[]; hasMore: boolean }>(), { type: "object", required: ["items", "hasMore"], properties: { hasMore: { type: "boolean" }, items: { type: "array", items: userSchema } } }))
      .handler(({ input, context }) => getService().listUsers(context.user.id, input.page, input.search)),
    createUser: admin.route({ ...route, method: "POST", path: "/access/users", summary: "Criar usuário" })
      .input(documented(type<UserFields>(parseUser), { ...userFieldsSchema, required: [...userFieldsSchema.required, "password"] })).output(documented(type<AccessUser>(), userSchema))
      .handler(({ input, context }) => getUsers().create(context.headers, input)),
    updateUser: admin.route({ ...route, method: "PATCH", path: "/access/users/{userId}", summary: "Editar usuário e acesso" })
      .input(documented(type<UserFields & { userId: string }>((input) => ({ ...parseUser(input), userId: text(object(input).userId) })), { ...userFieldsSchema, required: ["userId", "name", "username", "email", "roleId"] })).output(documented(type<AccessUser>(), userSchema))
      .handler(({ input, context }) => getUsers().update(context.headers, input)),
    assignRole: admin.route({ ...route, method: "PATCH", path: "/access/users/{userId}/role", summary: "Atribuir papel a um usuário" }).input(assignInput)
      .output(documented(type<{ userId: string; roleId: string }>(), { type: "object", required: ["userId", "roleId"], properties: { userId: textSchema, roleId: textSchema } }))
      .handler(({ input, context }) => getService().assign(context.user.id, input.userId, input.roleId)),
  };
}
