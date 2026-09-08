import { useEffect, useRef } from "react";
import { Outlet } from "@tanstack/react-router";
import { authClient } from "@/lib/auth";
import { queryClient } from "@/lib/query";

export function RootLayout() {
  const { data, isPending } = authClient.useSession();
  const previousUser = useRef<string | null | undefined>(undefined);
  const userId = data?.user.id ?? null;
  useEffect(() => {
    if (isPending) return;
    if (previousUser.current !== undefined && previousUser.current !== userId) {
      // Também cobre alterações de sessão vindas de outra aba.
      void queryClient.cancelQueries();
      queryClient.clear();
    }
    previousUser.current = userId;
  }, [userId, isPending]);
  return <Outlet />;
}
