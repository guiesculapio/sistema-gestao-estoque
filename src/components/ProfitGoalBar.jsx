import { useState } from "react";
import { Target, Pencil, Check, X } from "lucide-react";
import { useProfitGoal } from "../hooks/useProfitGoal";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const brl = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

// Formata "YYYY-MM-DD" (date puro do banco) como DD/MM/YYYY sem cair em
// deslocamento de timezone (não usa new Date()).
const formatDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────
export default function ProfitGoalBar() {
  const {
    goal,
    lucroAtual,
    percentual,
    restante,
    start,
    end,
    loading,
    hasGoal,
    updatePreferences,
    refetch,
  } = useProfitGoal();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ goal: "", start: "", end: "" });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const CARD =
    "bg-white rounded-xl border border-slate-200/80 shadow-sm p-5";

  const openForm = () => {
    setForm({
      goal: goal ? String(goal) : "",
      start: start || "",
      end: end || "",
    });
    setFormError(null);
    setEditing(true);
  };

  const closeForm = () => {
    setEditing(false);
    setFormError(null);
  };

  const handleSave = async () => {
    const goalValue = Number(form.goal);
    if (!Number.isFinite(goalValue) || goalValue <= 0) {
      setFormError("Informe uma meta de lucro maior que zero.");
      return;
    }
    if (!form.start || !form.end) {
      setFormError("Informe as datas de início e fim.");
      return;
    }
    if (form.start > form.end) {
      setFormError("A data de início não pode ser depois da data de fim.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const { success, error } = await updatePreferences({
      profit_goal: goalValue,
      profit_goal_start: form.start,
      profit_goal_end: form.end,
    });
    setSaving(false);

    if (!success) {
      setFormError(error || "Não foi possível salvar a meta.");
      return;
    }

    setEditing(false);
    await refetch();
  };

  // Cor da barra por faixa de progresso.
  const barColor =
    percentual >= 75
      ? "bg-emerald-500"
      : percentual >= 40
        ? "bg-teal-500"
        : "bg-amber-500";

  const atingiu = percentual >= 100;

  // ── Formulário ──────────────────────────────────────────────
  if (editing) {
    return (
      <div className={CARD}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
            <Target size={16} className="text-white" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">
            {hasGoal ? "Editar meta de lucro" : "Definir meta de lucro"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Meta de lucro (R$)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.goal}
              onChange={(e) =>
                setForm((f) => ({ ...f, goal: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
              placeholder="0,00"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Data início
            </span>
            <input
              type="date"
              value={form.start}
              onChange={(e) =>
                setForm((f) => ({ ...f, start: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Data fim
            </span>
            <input
              type="date"
              value={form.end}
              onChange={(e) =>
                setForm((f) => ({ ...f, end: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
            />
          </label>
        </div>

        {formError && (
          <p className="text-xs text-red-600 mt-3">{formError}</p>
        )}

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            <Check size={15} />
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button
            onClick={closeForm}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-60"
          >
            <X size={15} />
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ── Sem meta definida ───────────────────────────────────────
  if (!hasGoal) {
    return (
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Target size={18} className="text-slate-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700">
                Meta de Lucro
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina uma meta e acompanhe o progresso do período.
              </p>
            </div>
          </div>
          <button
            onClick={openForm}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            <Target size={15} />
            Definir meta de lucro
          </button>
        </div>
      </div>
    );
  }

  // ── Meta definida ───────────────────────────────────────────
  return (
    <div className={CARD}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500 ring-4 ring-teal-400/30 flex items-center justify-center shadow-sm">
            <Target size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-700">Meta de Lucro</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatDate(start)} — {formatDate(end)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {atingiu && (
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold ring-1 ring-emerald-200">
              Meta atingida! 🎉
            </span>
          )}
          <button
            onClick={openForm}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Pencil size={12} />
            Editar meta
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="relative w-full bg-slate-100 rounded-full h-4 overflow-hidden">
        <div
          className={`h-4 rounded-full ${barColor} transition-all duration-700 flex items-center justify-end`}
          style={{ width: `${percentual}%` }}
        >
          {percentual >= 15 && (
            <span className="text-[10px] font-bold text-white pr-2">
              {percentual.toFixed(1)}%
            </span>
          )}
        </div>
        {percentual < 15 && (
          <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-slate-500">
            {percentual.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Lucro atual x meta */}
      <div className="flex items-center justify-between mt-2.5">
        <div>
          <p className="text-[11px] text-slate-400">Lucro atual</p>
          <p className="text-sm font-bold text-slate-700 tabular-nums">
            {brl(lucroAtual)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400">
            {atingiu ? "Meta" : `Faltam ${brl(restante)} de`}
          </p>
          <p className="text-sm font-bold text-slate-700 tabular-nums">
            {brl(goal)}
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-[11px] text-slate-400 mt-2">Atualizando...</p>
      )}
    </div>
  );
}
