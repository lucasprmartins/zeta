import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice } from "@/components/feedback";
import { authClient } from "@/lib/auth";

export function PasswordForm() {
  const session = authClient.useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const currentPassword = String(fields.get("currentPassword"));
    const newPassword = String(fields.get("newPassword"));
    setError(null); setSaved(false);
    if (newPassword !== fields.get("confirmation")) { setError("A confirmação não corresponde à nova senha."); return; }
    if (newPassword === currentPassword) { setError("Escolha uma senha diferente da atual."); return; }
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
        setError(result.error.status === 401 ? "Sua sessão expirou. Entre novamente." : messages[result.error.code ?? ""] ?? "Não foi possível alterar a senha. Tente novamente.");
        if (result.error.status === 401) void session.refetch();
        return;
      }
      form.reset(); setSaved(true);
      void session.refetch();
    } catch { setError("Não foi possível conectar. Verifique sua conexão e tente novamente."); }
    finally { setPending(false); }
  }
  return <form aria-label="Alterar senha" onSubmit={submit} onChange={() => { setSaved(false); setError(null); }} className="space-y-5">
    <fieldset disabled={pending} className="space-y-4">
      <div className="space-y-2"><label htmlFor="current-password" className="text-sm font-medium">Senha atual</label><Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></div>
      <div className="space-y-2"><label htmlFor="new-password" className="text-sm font-medium">Nova senha</label><Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} aria-describedby="password-help" /><p id="password-help" className="text-xs text-muted-foreground">Use de 8 a 128 caracteres.</p></div>
      <div className="space-y-2"><label htmlFor="confirm-password" className="text-sm font-medium">Confirmar nova senha</label><Input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></div>
    </fieldset>
    <p className="text-sm leading-relaxed text-muted-foreground">Ao alterar a senha, suas outras sessões serão encerradas.</p>
    {error && <ErrorNotice message={error} />}
    {saved && <p role="status" className="text-sm">Senha alterada. Use a nova senha no próximo acesso.</p>}
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Alterando…" : "Alterar senha"}</Button>
  </form>;
}
