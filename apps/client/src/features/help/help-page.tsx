import { ArrowRightIcon, BookOpenIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function HelpPage() {
  return (
    <PageContent>
      <PageHeader
        description="Encontre orientações para usar o sistema."
        title="Ajuda"
      />
      <Card className="max-w-xl">
        <CardHeader>
          <BookOpenIcon
            aria-hidden="true"
            className="mb-3 text-muted-foreground"
            size={24}
            weight="regular"
          />
          <CardTitle>Guias de uso</CardTitle>
          <CardDescription>
            Consulte as instruções das funcionalidades disponíveis para você.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            className={buttonVariants({
              variant: "outline",
              className: "w-full sm:w-auto",
            })}
            to="/help/guides"
          >
            Acessar guias <ArrowRightIcon aria-hidden="true" size={18} />
          </Link>
        </CardContent>
      </Card>
    </PageContent>
  );
}
