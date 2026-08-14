import { useState } from "react";
import { Target, Pencil, Check, X } from "lucide-react";
import { useProfitGoal } from "../hooks/useProfitGoal";
import { brl } from "../utils/format";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

// Formats "YYYY-MM-DD" (plain date from the database) as DD/MM/YYYY without
// falling into a timezone offset (doesn't use new Date()).
const formatDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

// ─────────────────────────────────────────────────────────────
// Component
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-32 mb-4" />
        <div className="h-3 bg-slate-100 rounded w-full mb-3" />
        <div className="h-6 bg-slate-100 rounded w-24" />
      </div>
    );
  }

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

  const atingiu = percentual >= 100;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-brand transition-all duration-200">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <Target size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-slate-900 font-bold text-base">Meta de Lucro</h3>
            <p className="text-slate-400 text-xs">
              {hasGoal
                ? `${formatDate(start)} — ${formatDate(end)}`
                : "Defina uma meta e acompanhe o progresso do período."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasGoal && atingiu && !editing && (
            <span className="bg-brand/10 text-brand font-bold text-xs px-3 py-1 rounded-full">
              Meta atingida! 🎉
            </span>
          )}
          {hasGoal ? (
            !editing && (
              <button
                onClick={openForm}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 text-xs font-medium transition-colors"
              >
                <Pencil size={12} />
                Editar meta
              </button>
            )
          ) : (
            !editing && (
              <button
                onClick={openForm}
                className="inline-flex items-center gap-1.5 bg-brand text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-brand-hover transition-colors duration-150"
              >
                <Target size={15} />
                Definir meta de lucro
              </button>
            )
          )}
        </div>
      </div>

      {hasGoal && !editing && (
        <>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-xs">Progresso</span>
            <span className="text-brand font-bold text-xs">
              {percentual.toFixed(1)}%
            </span>
          </div>
          <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-brand transition-all duration-700"
              style={{ width: `${percentual}%` }}
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-3">
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">
                Lucro atual
              </p>
              <p className="text-slate-900 font-black text-xl tabular-nums">
                {brl(lucroAtual)}
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-slate-400 text-xs">
                {atingiu ? "Meta" : `Faltam ${brl(restante)} de`}
              </p>
              <p className="text-slate-900 font-bold tabular-nums">
                {brl(goal)}
              </p>
            </div>
          </div>
        </>
      )}

      {editing && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mt-3">
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
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
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
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
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
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </label>
          </div>

          {formError && (
            <p className="text-xs text-red-500 mt-3">{formError}</p>
          )}

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-brand text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-brand-hover transition-colors duration-150 disabled:opacity-60"
            >
              <Check size={15} />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={closeForm}
              disabled={saving}
              className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
