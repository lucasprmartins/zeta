import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth";

export function PasswordForm() {
  const session = authClient.useSession();
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const form = event.currentTarget;
    const fields = new FormData(form);
    const currentPassword = String(fields.get("currentPassword"));
    const newPassword = String(fields.get("newPassword"));
    if (newPassword !== fields.get("confirmation")) {
      toast.error("A confirmação não corresponde à nova senha.");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("Escolha uma senha diferente da atual.");
      return;
    }
    setPending(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        const messages: Record<string, string> = {
          INVALID_PASSWORD: "A senha atual está incorreta.",
          PASSWORD_TOO_SHORT: "A nova senha deve ter pelo menos 8 caracteres.",
          PASSWORD_TOO_LONG: "A nova senha deve ter no máximo 128 caracteres.",
          TOO_MANY_REQUESTS:
            "Muitas tentativas. Aguarde um pouco e tente novamente.",
        };
        toast.error(
          result.error.status === 401
            ? "Sua sessão expirou. Entre novamente."
            : (messages[result.error.code ?? ""] ??
                "Não foi possível alterar a senha. Tente novamente.")
        );
        if (result.error.status === 401) {
          void session.refetch();
        }
        return;
      }
      form.reset();
      toast.success("Senha alterada.", {
        description: "Suas outras sessões foram encerradas.",
      });
      void session.refetch();
    } catch {
      toast.error(
        "Não foi possível conectar. Verifique sua conexão e tente novamente."
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form aria-label="Alterar senha" className="space-y-5" onSubmit={submit}>
      <fieldset className="space-y-4" disabled={pending}>
        <Field>
          <FieldLabel htmlFor="current-password">Senha atual</FieldLabel>
          <Input
            autoComplete="current-password"
            id="current-password"
            maxLength={128}
            name="currentPassword"
            required
            type="password"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-password">Nova senha</FieldLabel>
          <Input
            aria-describedby="password-help"
            autoComplete="new-password"
            id="new-password"
            maxLength={128}
            minLength={8}
            name="newPassword"
            required
            type="password"
          />
          <FieldDescription id="password-help">
            Use de 8 a 128 caracteres.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">
            Confirmar nova senha
          </FieldLabel>
          <Input
            autoComplete="new-password"
            id="confirm-password"
            maxLength={128}
            minLength={8}
            name="confirmation"
            required
            type="password"
          />
        </Field>
      </fieldset>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Ao alterar a senha, suas outras sessões serão encerradas.
      </p>
      <Button className="w-full sm:w-auto" disabled={pending} type="submit">
        {pending ? "Alterando…" : "Alterar senha"}
      </Button>
    </form>
  );
}
