import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { accessControl, roles } from "./access";

// Mesma origem: cookies são enviados pelo navegador; o Vite faz o proxy no desenvolvimento.
export const authClient = createAuthClient({
  plugins: [adminClient({ ac: accessControl, roles }), usernameClient()],
});
