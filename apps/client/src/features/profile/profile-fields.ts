type ProfileUser = { name: string; username?: string | null | undefined; displayUsername?: string | null | undefined };

export function profileUsername(user: ProfileUser) {
  const username = user.username ?? "";
  // Atualizações anteriores podiam deixar displayUsername com o identificador antigo.
  return user.displayUsername?.toLowerCase() === username.toLowerCase() ? user.displayUsername : username;
}

export function profileUpdate(user: ProfileUser, name: string, username: string) {
  const value = username.trim();
  return {
    name: name.trim(),
    ...(value !== profileUsername(user) ? { username: value, displayUsername: value } : {}),
  };
}
