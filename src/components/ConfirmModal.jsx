import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = "Excluir",
  danger = true,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <h3 className="text-slate-900 font-bold text-base text-center mb-1">
          {title}
        </h3>
        <p className="text-slate-500 text-sm text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white border border-slate-200 text-slate-600 font-medium rounded-xl px-4 py-2.5 hover:border-brand hover:text-slate-900 transition-all duration-150"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 text-white font-bold rounded-xl py-2.5 transition-colors ${
              danger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-brand hover:bg-brand-hover"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
