import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth";
import { PasswordForm } from "./password-form";
import { profileUpdate, profileUsername } from "./profile-fields";

export function ProfilePage({
  user,
}: {
  user: typeof authClient.$Infer.Session.user;
}) {
  const session = authClient.useSession();
  const [name, setName] = useState(user.name);
  const initialUsername = profileUsername(user);
  const [username, setUsername] = useState(initialUsername);
  const changed =
    name.trim() !== user.name || username.trim() !== initialUsername;
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = name.trim();
    if (pending || !value || !changed) {
      return;
    }
    setPending(true);
    try {
      const result = await authClient.updateUser(
        profileUpdate(user, value, username)
      );
      if (result.error) {
        const messages: Record<string, string> = {
          USERNAME_IS_ALREADY_TAKEN:
            "Este nome de usuário já está em uso. Escolha outro.",
          USERNAME_TOO_SHORT:
            "O nome de usuário deve ter pelo menos 3 caracteres.",
          USERNAME_TOO_LONG:
            "O nome de usuário deve ter no máximo 30 caracteres.",
          INVALID_USERNAME:
            "Use apenas letras sem acentos, números, ponto e sublinhado.",
          INVALID_DISPLAY_USERNAME: "Nome de usuário inválido.",
          TOO_MANY_REQUESTS:
            "Muitas tentativas. Aguarde um pouco e tente novamente.",
        };
        toast.error(
          result.error.status === 401
            ? "Sua sessão expirou. Entre novamente."
            : (messages[result.error.code ?? ""] ??
                "Não foi possível atualizar seus dados. Tente novamente.")
        );
        if (result.error.status === 401) {
          void session.refetch();
        }
        return;
      }
      setName(value);
      setUsername(username.trim());
      toast.success("Perfil atualizado.");
      await session.refetch().catch(() => {
        toast.warning(
          "Perfil salvo. Recarregue a página para atualizar os dados exibidos."
        );
      });
    } catch {
      toast.error(
        "Não foi possível conectar. Verifique sua conexão e tente novamente."
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <PageContent>
      <PageHeader
        description="Atualize seu nome, nome de usuário e senha de acesso."
        title="Perfil"
      />
      <div className="divide-y border-t">
        <section
          aria-labelledby="profile-details"
          className="grid gap-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10 lg:gap-16"
        >
          <div className="space-y-2">
            <h2 className="font-semibold text-sm" id="profile-details">
              Seus dados
            </h2>
            <p className="max-w-xs text-muted-foreground text-sm leading-relaxed">
              Seu nome identifica você na aplicação. O nome de usuário também
              pode ser usado para entrar.
            </p>
          </div>
          <Card className="min-w-0 p-5 shadow-none sm:p-6">
            <form
              aria-label="Editar perfil"
              className="w-full space-y-5"
              onSubmit={submit}
            >
              <Field>
                <FieldLabel htmlFor="profile-name">Seu nome</FieldLabel>
                <Input
                  autoComplete="name"
                  disabled={pending}
                  id="profile-name"
                  maxLength={100}
                  name="name"
                  onChange={(event) => {
                    setName(event.target.value);
                  }}
                  pattern=".*\S.*"
                  required
                  value={name}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-username">
                  Nome de usuário
                </FieldLabel>
                <Input
                  aria-describedby="profile-username-help"
                  autoCapitalize="none"
                  autoComplete="username"
                  disabled={pending}
                  id="profile-username"
                  maxLength={30}
                  minLength={3}
                  name="username"
                  onChange={(event) => {
                    setUsername(event.target.value);
                  }}
                  pattern="[a-zA-Z0-9_.]+"
                  required={Boolean(initialUsername) || username.length > 0}
                  spellCheck={false}
                  value={username}
                />
                <FieldDescription id="profile-username-help">
                  3 a 30 caracteres: letras sem acentos, números, ponto ou
                  sublinhado.
                </FieldDescription>
              </Field>
              <Button
                className="w-full sm:w-auto"
                disabled={pending || !name.trim() || !changed}
                type="submit"
              >
                {pending ? "Salvando…" : "Salvar dados"}
              </Button>
            </form>
          </Card>
        </section>
        <section
          aria-labelledby="profile-security"
          className="grid gap-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10 lg:gap-16"
        >
          <div className="space-y-2">
            <h2 className="font-semibold text-sm" id="profile-security">
              Senha
            </h2>
            <p className="max-w-xs text-muted-foreground text-sm leading-relaxed">
              Confirme sua senha atual para definir uma nova.
            </p>
          </div>
          <Card className="min-w-0 p-5 shadow-none sm:p-6">
            <PasswordForm />
          </Card>
        </section>
      </div>
    </PageContent>
  );
}
