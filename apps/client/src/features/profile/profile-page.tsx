import { Card } from "@/components/ui/card";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { PageContent } from "@/components/layout/page-content";
import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { profileUpdate, profileUsername } from "./profile-fields";
import { authClient } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export function ProfilePage({ user }: { user: typeof authClient.$Infer.Session.user }) {
  const session = authClient.useSession();
  const [name, setName] = useState(user.name);
  const initialUsername = profileUsername(user);
  const [username, setUsername] = useState(initialUsername);
  const changed = name.trim() !== user.name || username.trim() !== initialUsername;
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = name.trim();
    if (pending || !value || !changed) return;
    setPending(true);
    try {
      const result = await authClient.updateUser(profileUpdate(user, value, username));
      if (result.error) {
        const messages: Record<string, string> = {
          USERNAME_IS_ALREADY_TAKEN: "Este nome de usuário já está em uso. Escolha outro.",
          USERNAME_TOO_SHORT: "O nome de usuário deve ter pelo menos 3 caracteres.",
          USERNAME_TOO_LONG: "O nome de usuário deve ter no máximo 30 caracteres.",
          INVALID_USERNAME: "Use apenas letras sem acentos, números, ponto e sublinhado.",
          INVALID_DISPLAY_USERNAME: "Nome de usuário inválido.",
          TOO_MANY_REQUESTS: "Muitas tentativas. Aguarde um pouco e tente novamente.",
        };
        toast.error(result.error.status === 401 ? "Sua sessão expirou. Entre novamente." : messages[result.error.code ?? ""] ?? "Não foi possível atualizar seus dados. Tente novamente.");
        if (result.error.status === 401) void session.refetch();
        return;
      }
      setName(value); setUsername(username.trim());
      toast.success("Perfil atualizado.");
      await session.refetch().catch(() => { toast.warning("Perfil salvo. Recarregue a página para atualizar os dados exibidos."); });
    } catch { toast.error("Não foi possível conectar. Verifique sua conexão e tente novamente."); }
    finally { setPending(false); }
  }
  return <PageContent>
    <PageHeader title="Perfil" description="Atualize seu nome, nome de usuário e senha de acesso." />
    <div className="divide-y border-t">
      <section aria-labelledby="profile-details" className="grid gap-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10 lg:gap-16">
        <div className="space-y-2"><h2 id="profile-details" className="text-sm font-semibold">Seus dados</h2><p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Seu nome identifica você na aplicação. O nome de usuário também pode ser usado para entrar.</p></div>
        <Card className="min-w-0 p-5 shadow-none sm:p-6"><form aria-label="Editar perfil" onSubmit={submit} className="w-full space-y-5">
          <Field><FieldLabel htmlFor="profile-name">Seu nome</FieldLabel><Input id="profile-name" name="name" autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); }} required maxLength={100} pattern=".*\S.*" disabled={pending} /></Field>
          <Field><FieldLabel htmlFor="profile-username">Nome de usuário</FieldLabel><Input id="profile-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(event) => { setUsername(event.target.value); }} required={Boolean(initialUsername) || username.length > 0} minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]+" disabled={pending} aria-describedby="profile-username-help" /><FieldDescription id="profile-username-help">3 a 30 caracteres: letras sem acentos, números, ponto ou sublinhado.</FieldDescription></Field>
          <Button type="submit" disabled={pending || !name.trim() || !changed} className="w-full sm:w-auto">{pending ? "Salvando…" : "Salvar dados"}</Button>
        </form></Card>
      </section>
      <section aria-labelledby="profile-security" className="grid gap-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10 lg:gap-16">
        <div className="space-y-2"><h2 id="profile-security" className="text-sm font-semibold">Senha</h2><p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Confirme sua senha atual para definir uma nova.</p></div>
        <Card className="min-w-0 p-5 shadow-none sm:p-6"><PasswordForm /></Card>
      </section>
    </div>
  </PageContent>;
}
