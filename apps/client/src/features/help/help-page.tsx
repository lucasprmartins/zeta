import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, BookOpenIcon } from "@phosphor-icons/react";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function HelpPage() {
  return <PageContent>
    <PageHeader title="Ajuda" description="Encontre orientações para usar o sistema." />
    <Card className="max-w-xl">
      <CardHeader>
        <BookOpenIcon size={24} weight="regular" aria-hidden="true" className="mb-3 text-muted-foreground" />
        <CardTitle>Guias de uso</CardTitle>
        <CardDescription>Consulte as instruções das funcionalidades disponíveis para você.</CardDescription>
      </CardHeader>
      <CardContent>
        <Link to="/help/guides" className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}>
          Acessar guias <ArrowRightIcon size={18} aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  </PageContent>;
}
