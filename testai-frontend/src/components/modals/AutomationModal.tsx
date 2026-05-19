import React, { useState, useEffect } from "react";
import {
  XMarkIcon, CalendarIcon, ClockIcon,
  BoltIcon, CheckCircleIcon
} from "@heroicons/react/24/outline";
import { projectService } from "../../services/api";

interface AutomationModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSaved: () => void;
}

const DAYS_OPTIONS = [
  { value: "DAILY",   label: "Every day" },
  { value: "MON-FRI", label: "Monday → Friday" },
  { value: "MON,WED,FRI", label: "Mon, Wed, Fri" },
  { value: "MON",     label: "Monday only" },
  { value: "SAT,SUN", label: "Weekend" },
];

const AutomationModal: React.FC<AutomationModalProps> = ({
  projectId, projectName, onClose, onSaved
}) => {
  const [enabled, setEnabled]   = useState(false);
  const [hour, setHour]         = useState(2);
  const [minute, setMinute]     = useState(0);
  const [days, setDays]         = useState("DAILY");
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await projectService.getAutomationConfig(projectId);
      const d = res.data;
      setEnabled(d.enabled);
      setHour(d.hour ?? 2);
      setMinute(d.minute ?? 0);
      setDays(d.days ?? "DAILY");
    } catch {
      // defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userStr = sessionStorage.getItem("user");
      const userId = userStr ? JSON.parse(userStr).id : null;
      await projectService.updateAutomation(projectId, {
        enabled, hour, minute, days, userId
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (h: number, m: number) =>
    `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 z-10 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl border border-orange-200 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <rect width="24" height="24" rx="4" fill="#D33833"/>
                <circle cx="12" cy="12" r="5" fill="none" stroke="white" strokeWidth="2"/>
                <circle cx="12" cy="12" r="2" fill="white"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Jenkins Automation</h3>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-5">

            {/* Toggle principal */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-800 text-sm">Automatic Execution</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jenkins will execute this project according to the schedule
                </p>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none ${
                  enabled ? "bg-orange-500" : "bg-slate-300"
                }`}
              >
                <span className={`inline-block w-4 h-4 mt-1 transform transition-transform bg-white rounded-full shadow ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>

            {/* Config horaire (visible seulement si enabled) */}
            {enabled && (
              <>
                {/* Heure */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5" />
                    Execution Hour
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">Hour (00-23)</label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={hour}
                        onChange={(e) => setHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-center bg-white focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                      />
                    </div>
                    <span className="text-2xl font-bold text-slate-400 mt-4">:</span>
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">Minute (00-59)</label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={minute}
                        onChange={(e) => setMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-center bg-white focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Jours */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Execution Days
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {DAYS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDays(opt.value)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${
                          days === opt.value
                            ? "border-orange-400 bg-orange-50 text-orange-700 font-semibold"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {days === opt.value && (
                          <CheckCircleIcon className="w-4 h-4 text-orange-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-slate-900 rounded-xl p-3 text-xs font-mono text-green-400">
                  <p className="text-slate-500 mb-1"># Scheduled Execution :</p>
                  <p>Every day → {DAYS_OPTIONS.find(d => d.value === days)?.label}</p>
                  <p>At → {formatTime(hour, minute)}</p>
                  <p className="text-slate-500 mt-1"># Jenkins Cron :</p>
                  <p>{minute} {hour} * * *</p>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <BoltIcon className="w-4 h-4" />
                )}
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationModal;