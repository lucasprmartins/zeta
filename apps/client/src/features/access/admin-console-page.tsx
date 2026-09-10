import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ErrorNotice, Loading } from "@/components/feedback";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { rpc } from "@/lib/rpc";
import { accessError, accessKeys, registrationStatusQuery } from "./queries";

export function AdminConsolePage({ userId }: { userId: string }) {
  const client = useQueryClient();
  const settings = useQuery(registrationStatusQuery(userId));
  const save = useMutation({
    mutationFn: (policy: { allowSignUp: boolean; requireApproval: boolean }) =>
      rpc.access.saveRegistrationPolicy(policy),
    onSuccess: async () => {
      toast.success("Configuração atualizada.");
      await Promise.all([
        client.invalidateQueries({ queryKey: accessKeys.all(userId) }),
        client.invalidateQueries({ queryKey: ["registration-policy"] }),
      ]);
    },
    onError: (error) => toast.error(accessError(error)),
  });
  const policy = settings.data;
  const options = [
    {
      key: "allowSignUp",
      label: "Permitir cadastro",
      description:
        "Exibe a opção de criar conta no login e permite novos cadastros públicos. Contas existentes continuam acessando normalmente.",
    },
    {
      key: "requireApproval",
      label: "Exigir aprovação do administrador",
      description:
        "Novas contas só podem entrar após aprovação. Não altera contas existentes nem contas criadas pelo administrador.",
    },
  ] as const;
  return (
    <PageContent>
      <PageHeader
        description="Configure o acesso e o funcionamento da aplicação."
        title="Console"
      />
      {settings.isPending ? (
        <Loading />
      ) : settings.isError ? (
        <ErrorNotice
          message="Não foi possível carregar as configurações."
          retry={() => void settings.refetch()}
        />
      ) : (
        policy && (
          <Card className="overflow-hidden">
            <div className="border-b px-5 py-5 sm:px-6">
              <h2 className="font-medium">Cadastro e acesso</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Defina quem pode criar uma conta e quando terá acesso.
              </p>
            </div>
            <div className="divide-y">
              {options.map(({ key, label, description }) => (
                <Field
                  className="flex-row items-start gap-4 p-5 sm:p-6"
                  key={key}
                >
                  <div className="min-w-0 flex-1">
                    <FieldLabel
                      className="min-h-6 cursor-pointer"
                      htmlFor={key}
                    >
                      {label}
                    </FieldLabel>
                    <FieldDescription id={`${key}-help`}>
                      {description}
                    </FieldDescription>
                  </div>
                  <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
                    <input
                      aria-describedby={`${key}-help`}
                      checked={policy[key]}
                      className="size-5 cursor-pointer rounded border-input accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait"
                      disabled={save.isPending}
                      id={key}
                      onChange={(event) =>
                        save.mutate({
                          allowSignUp: policy.allowSignUp,
                          requireApproval: policy.requireApproval,
                          [key]: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    <span className="sr-only">{label}</span>
                  </label>
                </Field>
              ))}
            </div>
            <div className="space-y-2 border-t bg-muted/30 p-5 text-muted-foreground text-sm sm:p-6">
              <p>
                {policy.allowSignUp
                  ? policy.requireApproval
                    ? "Cadastro aberto. Novas contas aguardam aprovação para entrar."
                    : "Cadastro aberto. Novas contas podem entrar imediatamente."
                  : "Cadastro público fechado. A preferência de aprovação fica salva para quando ele for reaberto."}
              </p>
              <p>
                Desativar a exigência não aprova automaticamente contas que já
                estão pendentes.
              </p>
              {(policy.requireApproval || policy.pendingCount > 0) && (
                <Link
                  className="inline-block py-2 font-medium text-foreground underline underline-offset-4"
                  search={{ view: "approvals" }}
                  to="/admin/users"
                >
                  Ver aprovações
                  {policy.pendingCount > 0 ? ` (${policy.pendingCount})` : ""}
                </Link>
              )}
            </div>
          </Card>
        )
      )}
    </PageContent>
  );
}
