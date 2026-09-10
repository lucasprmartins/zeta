import { useQuery } from "@tanstack/react-query";
import { registrationPolicyQuery } from "@/features/access/queries";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { AuthLayout } from "@/components/layout/auth-layout";
import { ErrorNotice, Loading } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth";
import { queryClient } from "@/lib/query";

const rememberedIdentifierKey = "zeta:remembered-identifier";

function readRememberedIdentifier() {
  try { return localStorage.getItem(rememberedIdentifierKey)?.slice(0, 254) ?? ""; }
  catch { return ""; }
}

function rememberIdentifier(identifier: string | null) {
  try {
    if (identifier) localStorage.setItem(rememberedIdentifierKey, identifier);
    else localStorage.removeItem(rememberedIdentifierKey);
  } catch { /* O login continua disponível quando o armazenamento está bloqueado. */ }
}

const authErrors: Record<string, string> = {
  EMAIL_PASSWORD_SIGN_UP_DISABLED: "O cadastro de novas contas está desativado.",
  SIGNUP_DISABLED: "O cadastro de novas contas está desativado.",
  ACCOUNT_PENDING_APPROVAL: "Sua conta aguarda aprovação de um administrador. Tente entrar novamente após a aprovação.",
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
  const registration = useQuery(registrationPolicyQuery);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [rememberedIdentifier] = useState(readRememberedIdentifier);
  const [remember, setRemember] = useState(Boolean(rememberedIdentifier));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
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
      if (signingUp && !result.data?.token) {
        form.reset();
        setAwaitingApproval(true);
        return;
      }
      if (!signingUp) rememberIdentifier(remember ? identifier : null);
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

  if (awaitingApproval) return <AuthLayout title="Cadastro recebido" description="Sua conta aguarda aprovação de um administrador. Após a aprovação, você poderá entrar com seu e-mail ou nome de usuário." footer={<Link to="/login" className="font-medium hover:underline">Voltar para entrar</Link>}><p className="text-sm text-muted-foreground" role="status">Você já pode fechar esta página.</p></AuthLayout>;
  if (signingUp && registration.isPending) return <Loading label="Verificando disponibilidade do cadastro…" />;
  if (signingUp && registration.isError) return <AuthLayout title="Cadastro indisponível" description="Não foi possível consultar a disponibilidade do cadastro." footer={<Link to="/login">Voltar para entrar</Link>}><ErrorNotice message="Tente novamente em instantes." retry={() => void registration.refetch()} /></AuthLayout>;
  if (signingUp && !registration.data?.allowSignUp) return <AuthLayout title="Cadastro fechado" description="O cadastro de novas contas está desativado. Entre em contato com o administrador para solicitar acesso." footer={<Link to="/login" className="font-medium hover:underline">Voltar para entrar</Link>}><p className="text-sm text-muted-foreground">Contas existentes continuam acessando normalmente.</p></AuthLayout>;

  return <AuthLayout
    title={signingUp ? "Crie sua conta" : "Entre na sua conta"}
    description={signingUp ? "Preencha os dados abaixo para criar sua conta." : "Use seu email ou nome de usuário para entrar."}
    footer={signingUp || registration.data?.allowSignUp ? <>{signingUp ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}<Link to={signingUp ? "/login" : "/register"} className="font-medium text-foreground hover:underline">{signingUp ? "Entrar" : "Criar conta"}</Link></> : null}
  >
        {signingUp && registration.data?.requireApproval && <p className="mb-5 text-sm text-muted-foreground">Seu cadastro precisará da aprovação de um administrador antes do primeiro acesso.</p>}
        <form onSubmit={submit} className="space-y-5" aria-label={signingUp ? "Criar conta" : "Entrar"}>
          <fieldset disabled={pending} className="space-y-5">
            {signingUp && <Field><FieldLabel htmlFor="name">Seu nome</FieldLabel><Input id="name" name="name" autoComplete="name" placeholder="Como podemos chamar você?" required maxLength={100} pattern=".*\S.*" /></Field>}
            {signingUp ? <>
              <Field>
                <FieldLabel htmlFor="username">Nome de usuário</FieldLabel>
                <Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="seu.usuario" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]+" aria-describedby="username-help" />
                <FieldDescription id="username-help">3 a 30 caracteres: letras sem acentos, números, ponto ou sublinhado.</FieldDescription>
              </Field>
              <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="voce@exemplo.com" required maxLength={254} /></Field>
            </> : <Field>
              <FieldLabel htmlFor="identifier">Email ou nome de usuário</FieldLabel>
              <Input id="identifier" name="identifier" defaultValue={rememberedIdentifier} type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="voce@exemplo.com ou seu.usuario" required maxLength={254} />
            </Field>}
            <Field><FieldLabel htmlFor="password">Senha</FieldLabel><Input id="password" name="password" type="password" autoComplete={signingUp ? "new-password" : "current-password"} placeholder={signingUp ? "Pelo menos 8 caracteres" : "Sua senha"} required minLength={signingUp ? 8 : 1} maxLength={128} /></Field>
            {!signingUp && <div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm" htmlFor="remember-identifier">
                <input id="remember-identifier" type="checkbox" checked={remember} onChange={(event) => {
                  setRemember(event.target.checked);
                  if (!event.target.checked) rememberIdentifier(null);
                }} className="size-4 shrink-0 cursor-pointer rounded border-input accent-primary focus-visible:outline-2 focus-visible:outline-offset-2" />
                Lembrar-me
              </label>
            </div>}
          </fieldset>
          {error && <ErrorNotice message={error} />}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? <><SpinnerGapIcon className="animate-spin" />{signingUp ? "Criando conta…" : "Entrando…"}</> : <>{signingUp ? "Criar conta" : "Entrar"}<ArrowRightIcon className="ml-auto" /></>}</Button>
        </form>
  </AuthLayout>;
}
