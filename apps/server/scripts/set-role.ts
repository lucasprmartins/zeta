import { parseArgs } from "node:util";
import { assignRole } from "@server/domain/authorization/application/manage-access";
import { createDatabase } from "@server/infrastructure/database/client";
import { user } from "@server/infrastructure/database/schema/auth";
import { createAccessRepository } from "@server/infrastructure/repositories/drizzle-access-repository";
import { eq } from "drizzle-orm";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: { email: { type: "string" }, role: { type: "string" } },
  strict: true,
});
if (!(values.email && values.role)) {
  throw new Error("Use --email <email> --role <papel cadastrado>.");
}
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL é obrigatória.");
}
const database = createDatabase(url);
try {
  const rows = await database.db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, values.email.trim().toLowerCase()));
  if (rows.length !== 1) {
    throw new Error(
      "Conta não encontrada. Cadastre a conta antes de atribuir um papel."
    );
  }
  const roleId = values.role;
  await createAccessRepository(database.db).transaction((store) =>
    assignRole(store, rows[0]!.id, roleId)
  );
  console.info("Papel atualizado. Atualize a sessão no navegador.");
} finally {
  await database.close();
}
