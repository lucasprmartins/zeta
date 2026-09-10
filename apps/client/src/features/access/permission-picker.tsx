import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type PermissionGroup = {
  resource: string;
  label: string;
  actions: readonly { id: string; label: string; description: string }[];
};
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function PermissionPicker({
  catalog,
  grants,
  onChange,
  disabled,
}: {
  catalog: readonly PermissionGroup[];
  grants: string[];
  onChange: (grants: string[]) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const groups = catalog.filter((group) =>
    normalize(group.label).includes(normalize(search))
  );

  function selectGroup(group: PermissionGroup, selected: boolean) {
    const ids = group.actions.map((action) => action.id);
    onChange(
      selected
        ? [...new Set([...grants, ...ids])]
        : grants.filter((id) => !ids.includes(id))
    );
  }

  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor="permission-search">
          Buscar funcionalidades
        </FieldLabel>
        <Input
          disabled={disabled}
          id="permission-search"
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          placeholder="Nome da funcionalidade"
          type="search"
          value={search}
        />
      </Field>
      {groups.length === 0 ? (
        <Empty className="rounded-lg border p-6">
          <EmptyTitle>Nenhuma funcionalidade encontrada</EmptyTitle>
          <EmptyDescription>
            Tente outro nome. As permissões selecionadas foram mantidas.
          </EmptyDescription>
          <Button
            disabled={disabled}
            onClick={() => setSearch("")}
            size="sm"
            type="button"
            variant="ghost"
          >
            Limpar busca
          </Button>
        </Empty>
      ) : (
        <Accordion
          className="rounded-lg border"
          disabled={disabled}
          onValueChange={setExpanded}
          type="multiple"
          value={expanded}
        >
          {groups.map((group) => {
            const selected = group.actions.filter((action) =>
              grants.includes(action.id)
            ).length;
            const summary = `${selected} de ${group.actions.length} ${group.actions.length === 1 ? "ação selecionada" : "ações selecionadas"}`;
            return (
              <AccordionItem key={group.resource} value={group.resource}>
                <AccordionTrigger>
                  <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="min-w-0 break-words">{group.label}</span>
                    <span className="shrink-0 font-normal text-muted-foreground text-xs">
                      {summary}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mb-2 flex flex-wrap gap-2 border-b pb-3">
                    <Button
                      disabled={disabled || selected === group.actions.length}
                      onClick={() => selectGroup(group, true)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Selecionar todas
                    </Button>
                    <Button
                      disabled={disabled || selected === 0}
                      onClick={() => selectGroup(group, false)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Limpar
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {group.actions.map((action) => (
                      <label
                        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-2 py-3 hover:bg-muted"
                        key={action.id}
                      >
                        <input
                          checked={grants.includes(action.id)}
                          className="mt-0.5 size-5 shrink-0 accent-foreground"
                          disabled={disabled}
                          onChange={(event) =>
                            onChange(
                              event.target.checked
                                ? [...grants, action.id]
                                : grants.filter((id) => id !== action.id)
                            )
                          }
                          type="checkbox"
                        />
                        <span>
                          <span className="block font-medium text-sm">
                            {action.label}
                          </span>
                          <span className="mt-1 block text-muted-foreground text-xs">
                            {action.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
