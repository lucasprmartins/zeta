import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { authClient } from "@/lib/auth";

export function PasswordForm() {
  const session = authClient.useSession();
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const currentPassword = String(fields.get("currentPassword"));
    const newPassword = String(fields.get("newPassword"));
    if (newPassword !== fields.get("confirmation")) { toast.error("A confirmação não corresponde à nova senha."); return; }
    if (newPassword === currentPassword) { toast.error("Escolha uma senha diferente da atual."); return; }
    setPending(true);
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (result.error) {
        const messages: Record<string, string> = {
          INVALID_PASSWORD: "A senha atual está incorreta.",
          PASSWORD_TOO_SHORT: "A nova senha deve ter pelo menos 8 caracteres.",
          PASSWORD_TOO_LONG: "A nova senha deve ter no máximo 128 caracteres.",
          TOO_MANY_REQUESTS: "Muitas tentativas. Aguarde um pouco e tente novamente.",
        };
        toast.error(result.error.status === 401 ? "Sua sessão expirou. Entre novamente." : messages[result.error.code ?? ""] ?? "Não foi possível alterar a senha. Tente novamente.");
        if (result.error.status === 401) void session.refetch();
        return;
      }
      form.reset();
      toast.success("Senha alterada.", { description: "Suas outras sessões foram encerradas." });
      void session.refetch();
    } catch { toast.error("Não foi possível conectar. Verifique sua conexão e tente novamente."); }
    finally { setPending(false); }
  }
  return <form aria-label="Alterar senha" onSubmit={submit} className="space-y-5">
    <fieldset disabled={pending} className="space-y-4">
      <Field><FieldLabel htmlFor="current-password">Senha atual</FieldLabel><Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></Field>
      <Field><FieldLabel htmlFor="new-password">Nova senha</FieldLabel><Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} aria-describedby="password-help" /><FieldDescription id="password-help">Use de 8 a 128 caracteres.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="confirm-password">Confirmar nova senha</FieldLabel><Input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></Field>
    </fieldset>
    <p className="text-sm leading-relaxed text-muted-foreground">Ao alterar a senha, suas outras sessões serão encerradas.</p>
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Alterando…" : "Alterar senha"}</Button>
  </form>;
}
