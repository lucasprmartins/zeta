// Códigos do Better Auth traduzidos uma única vez: login, cadastro, perfil e
// troca de senha compartilham o mesmo texto para a mesma falha.
const AUTH_MESSAGES: Record<string, string> = {
  ACCOUNT_PENDING_APPROVAL:
    "Sua conta aguarda aprovação de um administrador. Tente entrar novamente após a aprovação.",
  EMAIL_PASSWORD_SIGN_UP_DISABLED:
    "O cadastro de novas contas está desativado.",
  INVALID_DISPLAY_USERNAME: "Nome de usuário inválido.",
  INVALID_EMAIL_OR_PASSWORD: "Email, nome de usuário ou senha incorretos.",
  INVALID_PASSWORD: "A senha atual está incorreta.",
  INVALID_USERNAME:
    "Use apenas letras sem acentos, números, ponto e sublinhado no nome de usuário.",
  INVALID_USERNAME_OR_PASSWORD: "Email, nome de usuário ou senha incorretos.",
  PASSWORD_TOO_LONG: "A senha deve ter no máximo 128 caracteres.",
  PASSWORD_TOO_SHORT: "A senha deve ter pelo menos 8 caracteres.",
  SIGNUP_DISABLED: "O cadastro de novas contas está desativado.",
  TOO_MANY_REQUESTS: "Muitas tentativas. Aguarde um pouco e tente novamente.",
  USERNAME_IS_ALREADY_TAKEN:
    "Este nome de usuário já está em uso. Escolha outro.",
  USERNAME_TOO_LONG: "O nome de usuário deve ter no máximo 30 caracteres.",
  USERNAME_TOO_SHORT: "O nome de usuário deve ter pelo menos 3 caracteres.",
  USER_ALREADY_EXISTS:
    "Já existe uma conta com esse email. Entre para continuar.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Já existe uma conta com esse email. Entre para continuar.",
};

export function authErrorMessage(
  error: { code?: string | null | undefined } | null | undefined,
  fallback: string
): string {
  return AUTH_MESSAGES[error?.code ?? ""] ?? fallback;
}

export const CONNECTION_FAILED =
  "Não foi possível conectar. Verifique sua conexão e tente novamente.";
