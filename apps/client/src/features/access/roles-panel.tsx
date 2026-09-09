import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilSimpleIcon, PlusIcon, ShieldCheckIcon, CrownSimpleIcon, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ErrorNotice, Loading } from "@/components/feedback";
import { rpc } from "@/lib/rpc";
import { accessError, accessKeys, rolesQuery, type AccessRole } from "./queries";
import { RoleForm } from "./role-form";

export function RolesPanel({ userId }: { userId: string }) {
  const client = useQueryClient();
  const query = useQuery(rolesQuery(userId));
  const [editor, setEditor] = useState<AccessRole | "new" | null>(null);
  const [deleting, setDeleting] = useState<AccessRole | null>(null);
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: accessKeys.all(userId) }), client.invalidateQueries({ queryKey: ["permissions"] })]); };
  const save = useMutation({ mutationFn: (input: Parameters<typeof rpc.access.saveRole>[0]) => rpc.access.saveRole(input), onSuccess: async () => { setEditor(null); toast.success("Papel salvo."); await refresh(); }, onError: (error) => toast.error(accessError(error)) });
  const remove = useMutation({ mutationFn: (id: string) => rpc.access.deleteRole({ id }), onSuccess: async () => { setDeleting(null); toast.success("Papel excluído."); await refresh(); }, onError: (error) => toast.error(accessError(error)) });
  return <section aria-label="Papéis e permissões" className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><p className="text-sm text-muted-foreground">Defina quais ações cada papel pode realizar.</p><Button size="sm" onClick={() => { save.reset(); setEditor("new"); }}><PlusIcon />Novo papel</Button></div>
    {query.isError && <ErrorNotice message="Não foi possível carregar os papéis." retry={() => void query.refetch()} />}
    {query.isPending ? <Loading /> : query.data && <Card className="overflow-hidden">
      <ul className="divide-y">{query.data.roles.map((role) => <li key={role.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-foreground/15" style={{ backgroundColor: role.color }} />
          <span className="min-w-0 break-words text-sm font-medium">{role.name}</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="flex items-center">
            {role.grants.includes("access:manage") && <RoleInfo icon={CrownSimpleIcon} label="Papel de administrador" description="Papel de administrador." />}
            {role.protected && <RoleInfo icon={ShieldCheckIcon} label="Sobre este papel do sistema" description={role.grants.includes("access:manage") ? "Papel do sistema: nome e cor podem ser editados, mas ele não pode ser excluído." : "Papel do sistema: pode ter nome, cor e permissões editados, mas não pode ser excluído."} />}
          </div>
          {!role.protected && <Button variant="ghost" size="sm" aria-label={`Excluir papel ${role.name}`} onClick={() => { remove.reset(); setDeleting(role); }}>Excluir</Button>}
          <Button variant="outline" size="icon" className="size-11 text-muted-foreground hover:text-foreground" aria-label={`Editar papel ${role.name}`} title="Editar papel" onClick={() => { save.reset(); setEditor(role); }}><PencilSimpleIcon aria-hidden="true" /></Button>
        </div>
      </li>)}</ul>
    </Card>}
    {editor && <Modal title={editor === "new" ? "Novo papel" : "Editar papel"} description="As alterações valem para todos os usuários deste papel." pending={save.isPending} onClose={() => setEditor(null)}>{save.error && <div className="mb-4"><ErrorNotice message={accessError(save.error)} /></div>}<RoleForm initial={editor === "new" ? null : editor} pending={save.isPending} onCancel={() => setEditor(null)} onSave={(fields) => save.mutate({ ...fields, ...(editor === "new" ? {} : { id: editor.id }) })} /></Modal>}
    {deleting && <Modal variant="confirmation" title="Excluir papel?" description={`O papel “${deleting.name}” só pode ser excluído se não estiver atribuído a nenhum usuário.`} pending={remove.isPending} onClose={() => setDeleting(null)}>{remove.error && <div className="mb-4"><ErrorNotice message={accessError(remove.error)} /></div>}<div className="modal-actions flex flex-col-reverse justify-end gap-2 sm:flex-row"><Button data-modal-autofocus variant="outline" disabled={remove.isPending} onClick={() => setDeleting(null)}>Cancelar</Button><Button disabled={remove.isPending} onClick={() => remove.mutate(deleting.id)}>{remove.isPending ? "Excluindo…" : "Excluir papel"}</Button></div></Modal>}
  </section>;
}


function RoleInfo({ icon: Icon, label, description }: { icon: PhosphorIcon; label: string; description: string }) {
  const [open, setOpen] = useState(false);
  return <Tooltip open={open} onOpenChange={setOpen}>
    <TooltipTrigger type="button" aria-label={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
      onClick={(event) => { event.preventDefault(); setOpen(!open); }}>
      <Icon aria-hidden="true" className="size-[18px]" />
    </TooltipTrigger>
    <TooltipContent>{description}</TooltipContent>
  </Tooltip>;
}
