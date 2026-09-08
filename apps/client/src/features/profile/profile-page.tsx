import { PageContent } from "@/components/layout/page-content";
import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice } from "@/components/feedback";
import { authClient } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export function ProfilePage({ user }: { user: typeof authClient.$Infer.Session.user }) {
  const session = authClient.useSession();
  const [name, setName] = useState(user.name);
  const initialUsername = user.displayUsername ?? user.username ?? "";
  const [username, setUsername] = useState(initialUsername);
  const changed = name.trim() !== user.name || username.trim() !== initialUsername;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = name.trim();
    if (pending || !value || !changed) return;
    setPending(true); setError(null); setSaved(false);
    try {
      const result = await authClient.updateUser({ name: value, ...(username.trim() !== initialUsername ? { username: username.trim() } : {}) });
      if (result.error) {
        const messages: Record<string, string> = {
          USERNAME_IS_ALREADY_TAKEN: "Este nome de usuário já está em uso. Escolha outro.",
          USERNAME_TOO_SHORT: "O nome de usuário deve ter pelo menos 3 caracteres.",
          USERNAME_TOO_LONG: "O nome de usuário deve ter no máximo 30 caracteres.",
          INVALID_USERNAME: "Use apenas letras sem acentos, números, ponto e sublinhado.",
          INVALID_DISPLAY_USERNAME: "Nome de usuário inválido.",
          TOO_MANY_REQUESTS: "Muitas tentativas. Aguarde um pouco e tente novamente.",
        };
        setError(result.error.status === 401 ? "Sua sessão expirou. Entre novamente." : messages[result.error.code ?? ""] ?? "Não foi possível atualizar seus dados. Tente novamente.");
        if (result.error.status === 401) void session.refetch();
        return;
      }
      setName(value); setUsername(username.trim()); setSaved(true);
      void session.refetch();
    } catch { setError("Não foi possível conectar. Verifique sua conexão e tente novamente."); }
    finally { setPending(false); }
  }
  return <PageContent>
    <PageHeader title="Perfil" description="Atualize seu nome, nome de usuário e senha de acesso." />
    <div className="divide-y border-t">
      <section aria-labelledby="profile-details" className="grid gap-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10 lg:gap-16">
        <div className="space-y-2"><h2 id="profile-details" className="text-sm font-semibold">Seus dados</h2><p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Seu nome identifica você na aplicação. O nome de usuário também pode ser usado para entrar.</p></div>
        <form aria-label="Editar perfil" onSubmit={submit} className="w-full min-w-0 space-y-5 rounded-xl border p-5 sm:p-6">
          <div className="space-y-2"><label htmlFor="profile-name" className="text-sm font-medium">Seu nome</label><Input id="profile-name" name="name" autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setError(null); setSaved(false); }} required maxLength={100} pattern=".*\S.*" disabled={pending} /></div>
          <div className="space-y-2"><label htmlFor="profile-username" className="text-sm font-medium">Nome de usuário</label><Input id="profile-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(event) => { setUsername(event.target.value); setError(null); setSaved(false); }} required={Boolean(initialUsername) || username.length > 0} minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]+" disabled={pending} aria-describedby="profile-username-help" /><p id="profile-username-help" className="text-xs leading-relaxed text-muted-foreground">3 a 30 caracteres: letras sem acentos, números, ponto ou sublinhado.</p></div>
          {error && <ErrorNotice message={error} />}
          {saved && <p role="status" className="text-sm">Dados atualizados.</p>}
          <Button type="submit" disabled={pending || !name.trim() || !changed} className="w-full sm:w-auto">{pending ? "Salvando…" : "Salvar dados"}</Button>
        </form>
      </section>
      <section aria-labelledby="profile-security" className="grid gap-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10 lg:gap-16">
        <div className="space-y-2"><h2 id="profile-security" className="text-sm font-semibold">Senha</h2><p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Confirme sua senha atual para definir uma nova.</p></div>
        <div className="min-w-0 rounded-xl border p-5 sm:p-6"><PasswordForm /></div>
      </section>
    </div>
  </PageContent>;
}
