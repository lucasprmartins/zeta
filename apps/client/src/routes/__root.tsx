import { createRootRoute, Link } from "@tanstack/react-router";
import { RootLayout } from "@/app/root-layout";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <main className="p-12 text-center"><h1 className="text-2xl font-semibold">Página não encontrada</h1><Link to="/" className="mt-4 inline-block text-primary underline">Voltar ao início</Link></main>,
  errorComponent: () => <main role="alert" className="p-12 text-center"><h1 className="text-2xl font-semibold">Algo deu errado</h1><p className="mt-3 text-muted-foreground">Recarregue a página para tentar novamente.</p></main>,
});
