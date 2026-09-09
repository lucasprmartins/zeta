import { useState } from "react";
import { EyeIcon, EyeSlashIcon, SparkleIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Modal } from "@/components/ui/modal";
import { ErrorNotice } from "@/components/feedback";
import { rpc } from "@/lib/rpc";
import { authClient } from "@/lib/auth";
import { accessError, accessKeys, type AccessRole, type AccessUser } from "./queries";

export function UserForm({ initial, roles, actorId, onClose }: { initial: AccessUser | null; roles: AccessRole[]; actorId: string; onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState(initial?.name ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [roleId, setRoleId] = useState(initial?.role ?? "user");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setPending(true); setError(null);
    try {
      const fields = { name, username, email, roleId, ...(password ? { password } : {}) };
      // Credenciais ficam apenas no formulário, fora do cache de mutations.
      if (initial) await rpc.access.updateUser({ ...fields, userId: initial.id });
      else await rpc.access.createUser(fields);
      setPassword("");
      toast.success(initial ? "Usuário atualizado." : "Usuário criado.");
      onClose();
      await Promise.all([client.invalidateQueries({ queryKey: accessKeys.all(actorId) }), client.invalidateQueries({ queryKey: ["permissions"] }), ...(initial?.id === actorId ? [authClient.getSession({ query: { disableCookieCache: true } })] : [])]);
    } catch (cause) { const message = accessError(cause); setError(message); toast.error(message); }
    finally { setPending(false); }
  }
  function generatePassword() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    setPassword(Array.from(crypto.getRandomValues(new Uint8Array(20)), (value) => alphabet[value & 63]).join(""));
    setVisible(true);
  }
  return <Modal title={initial ? "Editar usuário" : "Adicionar usuário"} description="Gerencie os dados da conta e o acesso à aplicação." pending={pending} onClose={onClose}>
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {error && <ErrorNotice message={error} />}
      <fieldset disabled={pending} className="space-y-6">
        <section className="space-y-4" aria-labelledby="account-heading"><h3 id="account-heading" className="text-sm font-medium">Dados da conta</h3>
          <Field><FieldLabel htmlFor="managed-name">Nome</FieldLabel><Input id="managed-name" data-modal-autofocus value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} autoComplete="off" /></Field>
          <Field><FieldLabel htmlFor="managed-username">Nome de usuário</FieldLabel><Input id="managed-username" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]{3,30}" autoCapitalize="none" autoComplete="off" spellCheck={false} /><FieldDescription>3 a 30 caracteres: letras sem acento, números, ponto ou sublinhado.</FieldDescription></Field>
          <Field><FieldLabel htmlFor="managed-email">E-mail</FieldLabel><Input id="managed-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="off" /></Field>
        </section>
        <section className="space-y-4 border-t pt-6" aria-labelledby="access-heading"><h3 id="access-heading" className="text-sm font-medium">Acesso</h3>
          <Field><FieldLabel htmlFor="managed-role">Papel</FieldLabel><NativeSelect id="managed-role" value={roleId} onChange={(event) => setRoleId(event.target.value)} required>{!roles.some((role) => role.id === roleId) && <NativeSelectOption value="">Selecione um papel</NativeSelectOption>}{roles.map((role) => <NativeSelectOption key={role.id} value={role.id}>{role.name}</NativeSelectOption>)}</NativeSelect></Field>
        </section>
        <section className="space-y-4 border-t pt-6" aria-labelledby="password-heading"><h3 id="password-heading" className="text-sm font-medium">Segurança</h3>
          <Field><FieldLabel htmlFor="managed-password">{initial ? "Nova senha" : "Senha"}</FieldLabel><div className="flex gap-2"><Input id="managed-password" className="min-w-0" type={visible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required={!initial} minLength={8} maxLength={128} autoComplete="new-password" /><Button type="button" variant="outline" size="icon" aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible(!visible)}>{visible ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}</Button></div><FieldDescription>{initial ? "Deixe em branco para manter a senha atual. Ao redefinir, todas as sessões do usuário serão encerradas." : "Use de 8 a 128 caracteres."}</FieldDescription></Field>
          <Button type="button" variant="outline" size="sm" onClick={generatePassword}><SparkleIcon size={18} />Gerar senha</Button>
        </section>
      </fieldset>
      <div className="modal-actions flex flex-col-reverse justify-end gap-2 sm:flex-row"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando…" : initial ? "Salvar alterações" : "Adicionar usuário"}</Button></div>
    </form>
  </Modal>;
}
