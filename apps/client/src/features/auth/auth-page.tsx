import { ArrowRightIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { ErrorNotice, Loading } from "@/components/feedback";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { registrationPolicyQuery } from "@/features/access/queries";
import { authClient } from "@/lib/auth";
import { authErrorMessage, CONNECTION_FAILED } from "@/lib/auth-errors";
import { queryClient } from "@/lib/query";

const rememberedIdentifierKey = "zeta:remembered-identifier";

function readRememberedIdentifier() {
  try {
    return localStorage.getItem(rememberedIdentifierKey)?.slice(0, 254) ?? "";
  } catch {
    return "";
  }
}

function rememberIdentifier(identifier: string | null) {
  try {
    if (identifier) {
      localStorage.setItem(rememberedIdentifierKey, identifier);
    } else {
      localStorage.removeItem(rememberedIdentifierKey);
    }
  } catch {
    /* O login continua disponível quando o armazenamento está bloqueado. */
  }
}

export function AuthPage({
  mode,
  returnTo = "/dashboard",
}: {
  mode: "login" | "register";
  returnTo?: string;
}) {
  const signingUp = mode === "register";
  const navigate = useNavigate();
  const session = authClient.useSession();
  const registration = useQuery(registrationPolicyQuery);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [rememberedIdentifier] = useState(readRememberedIdentifier);
  const [remember, setRemember] = useState(Boolean(rememberedIdentifier));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.data) {
      void navigate({ href: returnTo, replace: true });
    }
  }, [session.data, navigate, returnTo]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const identifier = String(
      data.get(signingUp ? "email" : "identifier")
    ).trim();
    const password = String(data.get("password"));
    setPending(true);
    setError(null);
    try {
      const result = signingUp
        ? await authClient.signUp.email({
            name: String(data.get("name")).trim(),
            email: identifier,
            username: String(data.get("username")).trim(),
            password,
          })
        : identifier.includes("@")
          ? await authClient.signIn.email({ email: identifier, password })
          : await authClient.signIn.username({
              username: identifier,
              password,
            });
      if (result.error) {
        setError(
          authErrorMessage(
            result.error,
            signingUp
              ? "Não foi possível criar sua conta. Confira os dados e tente novamente."
              : "Não foi possível entrar. Confira os dados e tente novamente."
          )
        );
        return;
      }
      if (signingUp && !result.data?.token) {
        form.reset();
        setAwaitingApproval(true);
        return;
      }
      if (!signingUp) {
        rememberIdentifier(remember ? identifier : null);
      }
      await queryClient.cancelQueries();
      queryClient.clear();
      await session.refetch();
    } catch {
      setError(CONNECTION_FAILED);
    } finally {
      setPending(false);
    }
  }

  if (session.isPending) {
    return <Loading label="Verificando sua sessão…" />;
  }
  if (session.data) {
    return <Loading label="Abrindo sua página…" />;
  }

  if (awaitingApproval) {
    return (
      <AuthLayout
        description="Sua conta aguarda aprovação de um administrador. Após a aprovação, você poderá entrar com seu e-mail ou nome de usuário."
        footer={
          <Link className="font-medium hover:underline" to="/login">
            Voltar para entrar
          </Link>
        }
        title="Cadastro recebido"
      >
        <p className="text-muted-foreground text-sm" role="status">
          Você já pode fechar esta página.
        </p>
      </AuthLayout>
    );
  }
  if (signingUp && registration.isPending) {
    return <Loading label="Verificando disponibilidade do cadastro…" />;
  }
  if (signingUp && registration.isError) {
    return (
      <AuthLayout
        description="Não foi possível consultar a disponibilidade do cadastro."
        footer={<Link to="/login">Voltar para entrar</Link>}
        title="Cadastro indisponível"
      >
        <ErrorNotice
          message="Tente novamente em instantes."
          retry={() => void registration.refetch()}
        />
      </AuthLayout>
    );
  }
  if (signingUp && !registration.data?.allowSignUp) {
    return (
      <AuthLayout
        description="O cadastro de novas contas está desativado. Entre em contato com o administrador para solicitar acesso."
        footer={
          <Link className="font-medium hover:underline" to="/login">
            Voltar para entrar
          </Link>
        }
        title="Cadastro fechado"
      >
        <p className="text-muted-foreground text-sm">
          Contas existentes continuam acessando normalmente.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      description={
        signingUp
          ? "Preencha os dados abaixo para criar sua conta."
          : "Use seu email ou nome de usuário para entrar."
      }
      footer={
        signingUp || registration.data?.allowSignUp ? (
          <>
            {signingUp ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
            <Link
              className="font-medium text-foreground hover:underline"
              to={signingUp ? "/login" : "/register"}
            >
              {signingUp ? "Entrar" : "Criar conta"}
            </Link>
          </>
        ) : null
      }
      title={signingUp ? "Crie sua conta" : "Entre na sua conta"}
    >
      {signingUp && registration.data?.requireApproval && (
        <p className="mb-5 text-muted-foreground text-sm">
          Seu cadastro precisará da aprovação de um administrador antes do
          primeiro acesso.
        </p>
      )}
      <form
        aria-label={signingUp ? "Criar conta" : "Entrar"}
        className="space-y-5"
        onSubmit={submit}
      >
        <fieldset className="space-y-5" disabled={pending}>
          {signingUp && (
            <Field>
              <FieldLabel htmlFor="name">Seu nome</FieldLabel>
              <Input
                autoComplete="name"
                id="name"
                maxLength={100}
                name="name"
                pattern=".*\S.*"
                placeholder="Como podemos chamar você?"
                required
              />
            </Field>
          )}
          {signingUp ? (
            <>
              <Field>
                <FieldLabel htmlFor="username">Nome de usuário</FieldLabel>
                <Input
                  aria-describedby="username-help"
                  autoCapitalize="none"
                  autoComplete="username"
                  id="username"
                  maxLength={30}
                  minLength={3}
                  name="username"
                  pattern="[a-zA-Z0-9_.]{3,30}"
                  placeholder="seu.usuario"
                  required
                  spellCheck={false}
                />
                <FieldDescription id="username-help">
                  3 a 30 caracteres: letras sem acentos, números, ponto ou
                  sublinhado.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  autoCapitalize="none"
                  autoComplete="email"
                  id="email"
                  maxLength={254}
                  name="email"
                  placeholder="voce@exemplo.com"
                  required
                  spellCheck={false}
                  type="email"
                />
              </Field>
            </>
          ) : (
            <Field>
              <FieldLabel htmlFor="identifier">
                Email ou nome de usuário
              </FieldLabel>
              <Input
                autoCapitalize="none"
                autoComplete="username"
                defaultValue={rememberedIdentifier}
                id="identifier"
                maxLength={254}
                name="identifier"
                placeholder="voce@exemplo.com ou seu.usuario"
                required
                spellCheck={false}
                type="text"
              />
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <Input
              autoComplete={signingUp ? "new-password" : "current-password"}
              id="password"
              maxLength={128}
              minLength={signingUp ? 8 : 1}
              name="password"
              placeholder={signingUp ? "Pelo menos 8 caracteres" : "Sua senha"}
              required
              type="password"
            />
          </Field>
          {!signingUp && (
            <div>
              <label
                className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
                htmlFor="remember-identifier"
              >
                <Checkbox
                  checked={remember}
                  id="remember-identifier"
                  onChange={(event) => {
                    setRemember(event.target.checked);
                    if (!event.target.checked) {
                      rememberIdentifier(null);
                    }
                  }}
                />
                Lembrar-me
              </label>
            </div>
          )}
        </fieldset>
        {error && <ErrorNotice message={error} />}
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? (
            <>
              <SpinnerGapIcon className="animate-spin" />
              {signingUp ? "Criando conta…" : "Entrando…"}
            </>
          ) : (
            <>
              {signingUp ? "Criar conta" : "Entrar"}
              <ArrowRightIcon className="ml-auto" />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
