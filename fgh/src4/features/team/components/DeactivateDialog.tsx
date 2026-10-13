import { AlertCircle, LoaderCircle } from "lucide-react";
import type { Teammate } from "../team.types";
import TeamDialog from "./TeamDialog";
import TeamFeedback from "./TeamFeedback";

export default function DeactivateDialog({
  teammate,
  busy,
  error,
  onDismissError,
  onClose,
  onConfirm,
}: {
  teammate: Teammate | null;
  busy: boolean;
  error: string;
  onDismissError: () => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!teammate) return null;
  return (
    <TeamDialog
      title="Deactivate teammate?"
      description={`This will deactivate ${teammate.full_name}'s account. The account will remain in the workspace list.`}
      onClose={onClose}
    >
      {error && (
        <div className="mb-4">
          <TeamFeedback
            message={error}
            type="error"
            onDismiss={onDismissError}
          />
        </div>
      )}
      <div className="ts-feedback ts-feedback-error">
        <AlertCircle size={18} />
        <p className="text-sm">
          Confirm the account before continuing. This action affects the
          teammate's ability to access the workspace.
        </p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="ts-button-secondary ts-focus rounded-lg px-4 py-2.5 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="ts-button-danger ts-focus inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {busy && <LoaderCircle size={16} className="animate-spin" />}
          Deactivate account
        </button>
      </div>
    </TeamDialog>
  );
}
