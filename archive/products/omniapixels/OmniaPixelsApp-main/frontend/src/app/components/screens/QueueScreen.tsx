import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Clock, CheckCircle2, XCircle, RotateCcw, X,
  Sparkles, ZoomIn, Scissors, Wand2, Plus
} from "lucide-react";

type JobStatus = "processing" | "waiting" | "done" | "failed";

interface Job {
  id: string;
  type: string;
  icon: typeof Sparkles;
  iconColor: string;
  progress: number;
  status: JobStatus;
  image: string;
  startedAt: string;
  eta?: string;
}

const PORTRAIT_URL = "https://images.unsplash.com/photo-1632776088367-d0709928731e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHdvbWFuJTIwZ29sZGVuJTIwaG91ciUyMHBob3RvZ3JhcGh5fGVufDF8fHx8MTc3MjM4NzU4Mnww&ixlib=rb-4.1.0&q=80&w=200";
const CITY_URL = "https://images.unsplash.com/photo-1612005660669-006429efefff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwbmlnaHQlMjBzdHJlZXQlMjBib2tlaCUyMHBob3RvZ3JhcGh5fGVufDF8fHx8MTc3MjM4NzU4Nnww&ixlib=rb-4.1.0&q=80&w=200";
const MOUNTAIN_URL = "https://images.unsplash.com/photo-1749401640206-19e74ab20409?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaW5lbWF0aWMlMjBsYW5kc2NhcGUlMjBtb3VudGFpbiUyMGZvZyUyMGRyYW1hdGljfGVufDF8fHx8MTc3MjM4NzU4M3ww&ixlib=rb-4.1.0&q=80&w=200";

const initialJobs: Job[] = [
  { id: "j1", type: "AI Enhance", icon: Sparkles, iconColor: "#C9A84C", progress: 73, status: "processing", image: PORTRAIT_URL, startedAt: "09:41", eta: "~12s" },
  { id: "j2", type: "Upscale 4×", icon: ZoomIn, iconColor: "#4A90D9", progress: 0, status: "waiting", image: CITY_URL, startedAt: "09:42", eta: "~45s" },
  { id: "j3", type: "BG Remove", icon: Scissors, iconColor: "#E05656", progress: 100, status: "done", image: MOUNTAIN_URL, startedAt: "09:38" },
  { id: "j4", type: "Deblur", icon: Wand2, iconColor: "#3DBA8C", progress: 0, status: "failed", image: PORTRAIT_URL, startedAt: "09:35" },
];

const statusConfig = {
  processing: { key: "queue.status.processing", color: "#C9A84C", bg: "rgba(201,168,76,0.12)" },
  waiting: { key: "queue.status.waiting", color: "#8A8A9E", bg: "rgba(138,138,158,0.12)" },
  done: { key: "queue.status.done", color: "#3DBA8C", bg: "rgba(61,186,140,0.12)" },
  failed: { key: "queue.status.failed", color: "#E05656", bg: "rgba(224,86,86,0.12)" },
};

export function QueueScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState(initialJobs);
  const [filter, setFilter] = useState<"all" | JobStatus>("all");

  // Simulate progress
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs((prev) =>
        prev.map((job) => {
          if (job.status === "processing" && job.progress < 100) {
            const newProgress = Math.min(job.progress + 3, 100);
            return {
              ...job,
              progress: newProgress,
              status: newProgress === 100 ? "done" : "processing",
            };
          }
          return job;
        })
      );
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const filteredJobs = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
  const activeCount = jobs.filter((j) => j.status === "processing" || j.status === "waiting").length;
  const doneCount = jobs.filter((j) => j.status === "done").length;

  const removeJob = (id: string) => setJobs((prev) => prev.filter((j) => j.id !== id));
  const retryJob = (id: string) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: "processing", progress: 0 } : j)));

  return (
    <div className="flex flex-col" style={{ background: "#060608", minHeight: "100%" }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[20px]" style={{ fontWeight: 800, color: "#F0F0FA", letterSpacing: "-0.02em" }}>
              {t("queue.title")}
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: "#8A8A9E" }}>
              {activeCount > 0 ? t("queue.active_jobs", { count: activeCount }) : t("queue.all_done")}
            </p>
          </div>
          <button
            onClick={() => navigate("/editor")}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.2)" }}
          >
            <Plus size={20} style={{ color: "#C9A84C" }} />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: t("queue.stats.active"), value: activeCount, color: "#C9A84C" },
            { label: t("queue.stats.completed"), value: doneCount, color: "#3DBA8C" },
            { label: t("queue.stats.total"), value: jobs.length, color: "#8A8A9E" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="text-[20px]" style={{ fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "#6B6B84" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {(["all", "processing", "waiting", "done", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold"
              style={{
                background: filter === f ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                color: filter === f ? "#C9A84C" : "#6B6B84",
                border: filter === f ? "1px solid rgba(201,168,76,0.25)" : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {f === "all" ? t("gallery.filters.all") : t(statusConfig[f].key)}
            </button>
          ))}
        </div>
      </div>

      {/* Job list */}
      <div className="flex-1 px-5 flex flex-col gap-3 pb-6">
        <AnimatePresence>
          {filteredJobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Clock size={28} style={{ color: "#6B6B84" }} />
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold" style={{ color: "#F0F0FA" }}>{t("queue.empty_title")}</p>
                <p className="text-[13px] mt-1" style={{ color: "#6B6B84" }}>{t("queue.empty_desc")}</p>
              </div>
              <button
                onClick={() => navigate("/editor")}
                className="px-6 py-3 rounded-2xl text-[14px] font-semibold"
                style={{ background: "rgba(201,168,76,0.12)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.2)" }}
              >
                {t("queue.add_photo")}
              </button>
            </motion.div>
          ) : (
            filteredJobs.map((job) => {
              const cfg = statusConfig[job.status];
              return (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl p-4 relative overflow-hidden"
                  style={{
                    background: "rgba(14,14,24,0.8)",
                    border: `1px solid ${job.status === "processing" ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  {job.status === "processing" && (
                    <div
                      className="absolute bottom-0 left-0 h-0.5 transition-all duration-500"
                      style={{
                        width: `${job.progress}%`,
                        background: "linear-gradient(90deg, #C9A84C, #E8C97A)",
                      }}
                    />
                  )}

                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                      <img src={job.image} alt="" className="w-full h-full object-cover" />
                      {job.status === "processing" && (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: "rgba(6,6,8,0.5)" }}>
                          <motion.div
                            className="w-5 h-5 rounded-full border-2"
                            style={{ borderColor: "rgba(201,168,76,0.3)", borderTopColor: "#C9A84C" }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          />
                        </div>
                      )}
                      {job.status === "done" && (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: "rgba(6,6,8,0.4)" }}>
                          <CheckCircle2 size={20} style={{ color: "#3DBA8C" }} />
                        </div>
                      )}
                      {job.status === "failed" && (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: "rgba(6,6,8,0.4)" }}>
                          <XCircle size={20} style={{ color: "#E05656" }} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <job.icon size={14} style={{ color: job.iconColor }} />
                        <span className="text-[14px] font-semibold" style={{ color: "#F0F0FA" }}>
                          {job.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {t(cfg.key)}
                        </span>
                        {job.status === "processing" && (
                          <span className="text-[11px]" style={{ color: "#8A8A9E" }}>
                            {job.progress}% · {job.eta}
                          </span>
                        )}
                        {job.status === "waiting" && (
                          <span className="text-[11px]" style={{ color: "#8A8A9E" }}>{job.eta}</span>
                        )}
                        <span className="text-[11px]" style={{ color: "#6B6B84" }}>{job.startedAt}</span>
                      </div>

                      {job.status === "processing" && (
                        <div className="mt-2 w-full h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg, #C9A84C, #E8C97A)" }}
                            animate={{ width: `${job.progress}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5">
                      {(job.status === "processing" || job.status === "waiting") && (
                        <button
                          onClick={() => removeJob(job.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(224,86,86,0.12)" }}
                        >
                          <X size={14} style={{ color: "#E05656" }} />
                        </button>
                      )}
                      {job.status === "failed" && (
                        <button
                          onClick={() => retryJob(job.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(201,168,76,0.12)" }}
                        >
                          <RotateCcw size={14} style={{ color: "#C9A84C" }} />
                        </button>
                      )}
                      {job.status === "done" && (
                        <button
                          onClick={() => navigate("/compare")}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(61,186,140,0.12)" }}
                        >
                          <CheckCircle2 size={14} style={{ color: "#3DBA8C" }} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
