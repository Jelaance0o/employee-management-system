import { AlertCircle, Check, X } from "lucide-react";

type FeedbackType = "error" | "success";

export default function TeamFeedback({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: FeedbackType;
  onDismiss: () => void;
}) {
  const Icon = type === "error" ? AlertCircle : Check;
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`ts-feedback ${type === "error" ? "ts-feedback-error" : "ts-feedback-success"}`}
    >
      <Icon size={18} className="shrink-0" />
      <p className="flex-1 text-sm">{message}</p>
      <button
        type="button"
        aria-label="Dismiss message"
        onClick={onDismiss}
        className="shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
