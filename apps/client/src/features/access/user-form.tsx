import { EyeIcon, EyeSlashIcon, SparkleIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorNotice } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { authClient } from "@/lib/auth";
import { actionErrorMessage } from "@/lib/query";
import { rpc } from "@/lib/rpc";
import { type AccessRole, type AccessUser, accessKeys } from "./queries";

export function UserForm({
  initial,
  roles,
  actorId,
  onClose,
}: {
  initial: AccessUser | null;
  roles: AccessRole[];
  actorId: string;
  onClose: () => void;
}) {
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
    setPending(true);
    setError(null);
    try {
      const fields = {
        name,
        username,
        email,
        roleId,
        ...(password ? { password } : {}),
      };
      // Credenciais ficam apenas no formulário, fora do cache de mutations.
      if (initial) {
        await rpc.access.updateUser({ ...fields, userId: initial.id });
      } else {
        await rpc.access.createUser(fields);
      }
      setPassword("");
      toast.success(initial ? "Usuário atualizado." : "Usuário criado.");
      onClose();
      await Promise.all([
        client.invalidateQueries({ queryKey: accessKeys.all(actorId) }),
        client.invalidateQueries({ queryKey: ["permissions"] }),
        ...(initial?.id === actorId
          ? [authClient.getSession({ query: { disableCookieCache: true } })]
          : []),
      ]);
    } catch (cause) {
      const message = actionErrorMessage(cause);
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }
  function generatePassword() {
    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    setPassword(
      Array.from(
        crypto.getRandomValues(new Uint8Array(20)),
        (value) => alphabet[value % 64]
      ).join("")
    );
    setVisible(true);
  }
  return (
    <Modal
      description="Gerencie os dados da conta e o acesso à aplicação."
      onClose={onClose}
      pending={pending}
      title={initial ? "Editar usuário" : "Adicionar usuário"}
    >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {error && <ErrorNotice message={error} />}
        <fieldset className="space-y-6" disabled={pending}>
          <section aria-labelledby="account-heading" className="space-y-4">
            <h3 className="font-medium text-sm" id="account-heading">
              Dados da conta
            </h3>
            <Field>
              <FieldLabel htmlFor="managed-name">Nome</FieldLabel>
              <Input
                autoComplete="off"
                data-modal-autofocus
                id="managed-name"
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="managed-username">
                Nome de usuário
              </FieldLabel>
              <Input
                autoCapitalize="none"
                autoComplete="off"
                id="managed-username"
                maxLength={30}
                minLength={3}
                onChange={(event) => setUsername(event.target.value)}
                pattern="[a-zA-Z0-9_.]{3,30}"
                required
                spellCheck={false}
                value={username}
              />
              <FieldDescription>
                3 a 30 caracteres: letras sem acento, números, ponto ou
                sublinhado.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="managed-email">E-mail</FieldLabel>
              <Input
                autoComplete="off"
                id="managed-email"
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </Field>
          </section>
          <section
            aria-labelledby="access-heading"
            className="space-y-4 border-t pt-6"
          >
            <h3 className="font-medium text-sm" id="access-heading">
              Acesso
            </h3>
            <Field>
              <FieldLabel htmlFor="managed-role">Papel</FieldLabel>
              <NativeSelect
                id="managed-role"
                onChange={(event) => setRoleId(event.target.value)}
                required
                value={roleId}
              >
                {!roles.some((role) => role.id === roleId) && (
                  <NativeSelectOption value="">
                    Selecione um papel
                  </NativeSelectOption>
                )}
                {roles.map((role) => (
                  <NativeSelectOption key={role.id} value={role.id}>
                    {role.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </section>
          <section
            aria-labelledby="password-heading"
            className="space-y-4 border-t pt-6"
          >
            <h3 className="font-medium text-sm" id="password-heading">
              Segurança
            </h3>
            <Field>
              <FieldLabel htmlFor="managed-password">
                {initial ? "Nova senha" : "Senha"}
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  autoComplete="new-password"
                  className="min-w-0"
                  id="managed-password"
                  maxLength={128}
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required={!initial}
                  type={visible ? "text" : "password"}
                  value={password}
                />
                <Button
                  aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setVisible(!visible)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  {visible ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                </Button>
              </div>
              <FieldDescription>
                {initial
                  ? "Deixe em branco para manter a senha atual. Ao redefinir, todas as sessões do usuário serão encerradas."
                  : "Use de 8 a 128 caracteres."}
              </FieldDescription>
            </Field>
            <Button
              onClick={generatePassword}
              size="sm"
              type="button"
              variant="outline"
            >
              <SparkleIcon size={18} />
              Gerar senha
            </Button>
          </section>
        </fieldset>
        <div className="modal-actions">
          <Button
            disabled={pending}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
          <Button disabled={pending} type="submit">
            {pending
              ? "Salvando…"
              : initial
                ? "Salvar alterações"
                : "Adicionar usuário"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
