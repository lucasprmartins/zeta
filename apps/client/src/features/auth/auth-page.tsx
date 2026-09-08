import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { AuthLayout } from "@/components/layout/auth-layout";
import { ErrorNotice, Loading } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth";
import { queryClient } from "@/lib/query";

const authErrors: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email, nome de usuário ou senha incorretos.",
  INVALID_USERNAME_OR_PASSWORD: "Email, nome de usuário ou senha incorretos.",
  USERNAME_IS_ALREADY_TAKEN: "Este nome de usuário já está em uso. Escolha outro.",
  USERNAME_TOO_SHORT: "O nome de usuário deve ter pelo menos 3 caracteres.",
  USERNAME_TOO_LONG: "O nome de usuário deve ter no máximo 30 caracteres.",
  INVALID_USERNAME: "Use apenas letras sem acentos, números, ponto e sublinhado no nome de usuário.",
  INVALID_DISPLAY_USERNAME: "Nome de usuário inválido.",
  USER_ALREADY_EXISTS: "Já existe uma conta com esse email. Entre para continuar.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com esse email. Entre para continuar.",
  PASSWORD_TOO_SHORT: "A senha deve ter pelo menos 8 caracteres.",
  TOO_MANY_REQUESTS: "Muitas tentativas. Aguarde um pouco e tente novamente.",
};

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const signingUp = mode === "register";
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const identifier = String(data.get(signingUp ? "email" : "identifier")).trim();
    const password = String(data.get("password"));
    setPending(true);
    setError(null);
    try {
      const result = signingUp
        ? await authClient.signUp.email({ name: String(data.get("name")).trim(), email: identifier, username: String(data.get("username")).trim(), password })
        : identifier.includes("@")
          ? await authClient.signIn.email({ email: identifier, password })
          : await authClient.signIn.username({ username: identifier, password });
      if (result.error) {
        setError(authErrors[result.error.code ?? ""] ?? (signingUp ? "Não foi possível criar sua conta. Confira os dados e tente novamente." : "Não foi possível entrar. Confira os dados e tente novamente."));
        return;
      }
      await queryClient.cancelQueries();
      queryClient.clear();
      await session.refetch();
      await navigate({ to: "/dashboard", replace: true });
    } catch {
      setError("Não foi possível conectar. Verifique sua conexão e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (session.isPending) return <Loading label="Verificando sua sessão…" />;
  if (session.data) return <Navigate to="/dashboard" replace />;

  return <AuthLayout
    title={signingUp ? "Crie sua conta" : "Entre na sua conta"}
    description={signingUp ? "Preencha os dados abaixo para criar sua conta." : "Use seu email ou nome de usuário para entrar."}
    footer={<>{signingUp ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}<Link to={signingUp ? "/login" : "/register"} className="font-medium text-foreground hover:underline">{signingUp ? "Entrar" : "Criar conta"}</Link></>}
  >
        <form onSubmit={submit} className="space-y-5" aria-label={signingUp ? "Criar conta" : "Entrar"}>
          <fieldset disabled={pending} className="space-y-5">
            {signingUp && <div className="space-y-2"><label htmlFor="name" className="text-sm font-medium">Seu nome</label><Input id="name" name="name" autoComplete="name" placeholder="Como podemos chamar você?" required maxLength={100} pattern=".*\S.*" /></div>}
            {signingUp ? <>
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">Nome de usuário</label>
                <Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="seu.usuario" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]+" aria-describedby="username-help" />
                <p id="username-help" className="text-xs leading-relaxed text-muted-foreground">3 a 30 caracteres: letras sem acentos, números, ponto ou sublinhado.</p>
              </div>
              <div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">Email</label><Input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="voce@exemplo.com" required maxLength={254} /></div>
            </> : <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium">Email ou nome de usuário</label>
              <Input id="identifier" name="identifier" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="voce@exemplo.com ou seu.usuario" required maxLength={254} />
            </div>}
            <div className="space-y-2"><label htmlFor="password" className="text-sm font-medium">Senha</label><Input id="password" name="password" type="password" autoComplete={signingUp ? "new-password" : "current-password"} placeholder={signingUp ? "Pelo menos 8 caracteres" : "Sua senha"} required minLength={signingUp ? 8 : 1} maxLength={128} /></div>
          </fieldset>
          {error && <ErrorNotice message={error} />}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? <><SpinnerGapIcon className="animate-spin" />{signingUp ? "Criando conta…" : "Entrando…"}</> : <>{signingUp ? "Criar conta" : "Entrar"}<ArrowRightIcon className="ml-auto" /></>}</Button>
        </form>
  </AuthLayout>;
}
