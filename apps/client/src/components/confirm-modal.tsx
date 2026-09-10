import type { ReactNode } from "react";
import { ErrorNotice } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

// Confirmação destrutiva: painel inferior no mobile, foco inicial em Cancelar e
// bloqueio do fechamento enquanto a mutation está em andamento.
export function ConfirmModal({
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancelar",
  pending = false,
  error,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  error?: string | undefined;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal
      description={description}
      footer={
        <>
          <Button
            data-modal-autofocus
            disabled={pending}
            onClick={onClose}
            variant="outline"
          >
            {cancelLabel}
          </Button>
          <Button disabled={pending} onClick={onConfirm}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </>
      }
      onClose={onClose}
      pending={pending}
      title={title}
      variant="confirmation"
    >
      {children}
      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} />
        </div>
      )}
    </Modal>
  );
}
