import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { catalog } from "@/lib/access";
import { PermissionPicker } from "./permission-picker";
import type { AccessRole } from "./queries";

export function RoleForm({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: AccessRole | null;
  pending: boolean;
  onSave: (fields: { name: string; color: string; grants: string[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#737373");
  const [grants, setGrants] = useState(
    initial?.grants.filter((id) =>
      catalog.some((group) => group.actions.some((action) => action.id === id))
    ) ?? []
  );
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ name, color, grants: initial?.id === "admin" ? [] : grants });
      }}
    >
      <fieldset className="space-y-6" disabled={pending}>
        <Field>
          <FieldLabel htmlFor="role-name">Nome do papel</FieldLabel>
          <Input
            data-modal-autofocus
            id="role-name"
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Operador"
            required
            value={name}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="role-color">Cor do papel</FieldLabel>
          <div className="flex items-center gap-3">
            <Input
              className="w-14 cursor-pointer p-1"
              id="role-color"
              onChange={(event) => setColor(event.target.value)}
              type="color"
              value={color}
            />
            <span className="inline-flex max-w-full items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full border border-foreground/15"
                style={{ backgroundColor: color }}
              />
              <span className="break-words">
                {name.trim() || "Prévia do papel"}
              </span>
            </span>
          </div>
        </Field>
        {initial?.id === "admin" ? (
          <FieldDescription>
            Acesso total às funcionalidades atuais e futuras.
          </FieldDescription>
        ) : (
          <>
            <div>
              <h3 className="font-medium text-sm">Permissões</h3>
              <FieldDescription>
                Marque as ações permitidas. Acesso aos dados continua seguindo
                as regras de cada funcionalidade.
              </FieldDescription>
            </div>
            <PermissionPicker
              catalog={catalog}
              disabled={pending}
              grants={grants}
              onChange={setGrants}
            />
          </>
        )}
      </fieldset>
      <div className="modal-actions flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <Button
          disabled={pending}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Cancelar
        </Button>
        <Button disabled={pending || !name.trim()} type="submit">
          {pending ? "Salvando…" : "Salvar papel"}
        </Button>
      </div>
    </form>
  );
}
