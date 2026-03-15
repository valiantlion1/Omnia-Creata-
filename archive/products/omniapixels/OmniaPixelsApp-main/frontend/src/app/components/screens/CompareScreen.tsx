import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Share2, Trash2, ZoomIn, Info } from "lucide-react";

const BEFORE_URL = "https://images.unsplash.com/photo-1632776088367-d0709928731e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHdvbWFuJTIwZ29sZGVuJTIwaG91ciUyMHBob3RvZ3JhcGh5fGVufDF8fHx8MTc3MjM4NzU4Mnww&ixlib=rb-4.1.0&q=80&w=600";

export function CompareScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sliderPos, setSliderPos] = useState(50);
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current || !isDragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const startDrag = () => { isDragging.current = true; };
  const stopDrag = () => { isDragging.current = false; };

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 44px)", background: "#060608" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <ArrowLeft size={18} style={{ color: "#F0F0FA" }} />
        </button>
        <span className="text-[15px] font-bold" style={{ color: "#F0F0FA" }}>{t("compare.title")}</span>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: showInfo ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.06)",
            border: showInfo ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Info size={16} style={{ color: showInfo ? "#C9A84C" : "#F0F0FA" }} />
        </button>
      </div>

      {/* Compare view */}
      <div
        ref={containerRef}
        className="relative mx-4 rounded-2xl overflow-hidden cursor-ew-resize select-none"
        style={{ height: "320px", flexShrink: 0 }}
        onMouseMove={handleMouseMove}
        onMouseDown={startDrag}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchMove={handleMouseMove}
        onTouchStart={startDrag}
        onTouchEnd={stopDrag}
      >
        {/* After (full) */}
        <div className="absolute inset-0">
          <img
            src={BEFORE_URL}
            alt="After"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(1.1) contrast(1.12) saturate(1.25)" }}
          />
          <div
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: "rgba(61,186,140,0.85)", color: "#fff" }}
          >
            {t("compare.after")}
          </div>
        </div>

        {/* Before (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <img
            src={BEFORE_URL}
            alt="Before"
            className="absolute inset-0 object-cover"
            style={{ width: `${10000 / sliderPos}%`, maxWidth: "none" }}
          />
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: "rgba(138,138,158,0.85)", color: "#fff" }}
          >
            {t("compare.before")}
          </div>
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 cursor-ew-resize"
          style={{ left: `${sliderPos}%`, transform: "translateX(-50%)", background: "#fff" }}
        >
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
            whileTap={{ scale: 1.2 }}
          >
            <ZoomIn size={16} style={{ color: "#060608" }} />
          </motion.div>
        </div>

        {/* Hint text */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <span
            className="text-[11px] px-3 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}
          >
            {t("compare.drag")}
          </span>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <motion.div
          className="mx-4 mt-3 rounded-2xl p-4"
          style={{ background: "rgba(14,14,24,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("compare.meta.edit_type"), value: "AI Enhance" },
              { label: t("compare.meta.model"), value: "RealESRGAN" },
              { label: t("compare.meta.process_time"), value: "1.8s" },
              { label: t("compare.meta.date"), value: "01 Mar 2026" },
              { label: t("compare.meta.resolution"), value: "4032 × 3024" },
              { label: t("compare.meta.size"), value: "8.2 MB" },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-[10px] font-semibold uppercase" style={{ color: "#6B6B84", letterSpacing: "0.08em" }}>{item.label}</div>
                <div className="text-[13px] font-semibold mt-0.5" style={{ color: "#F0F0FA" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quality indicator */}
      <div className="mx-4 mt-4 rounded-2xl p-4" style={{ background: "rgba(14,14,24,0.8)", border: "1px solid rgba(201,168,76,0.15)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold" style={{ color: "#F0F0FA" }}>{t("compare.ai_score")}</span>
          <span className="text-[20px]" style={{ fontWeight: 800, color: "#C9A84C" }}>94/100</span>
        </div>
        <div className="flex gap-2">
          {[
            { label: t("compare.metrics.sharpness"), score: 96, color: "#3DBA8C" },
            { label: t("compare.metrics.color"), score: 92, color: "#C9A84C" },
            { label: t("compare.metrics.noise"), score: 94, color: "#4A90D9" },
          ].map((metric) => (
            <div key={metric.label} className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-[10px]" style={{ color: "#6B6B84" }}>{metric.label}</span>
                <span className="text-[10px] font-bold" style={{ color: metric.color }}>{metric.score}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: metric.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${metric.score}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mx-4 mt-4 flex gap-3">
        <button
          onClick={() => navigate("/home")}
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(224,86,86,0.12)", border: "1px solid rgba(224,86,86,0.2)" }}
        >
          <Trash2 size={18} style={{ color: "#E05656" }} />
        </button>
        <button
          onClick={() => navigate("/export")}
          className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F0FA" }}
        >
          <Share2 size={16} />
          {t("export.share_title")}
        </button>
        <button
          onClick={() => navigate("/export")}
          className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[14px] font-bold"
          style={{
            background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)",
            color: "#060608",
            boxShadow: "0 0 20px rgba(201,168,76,0.25)",
          }}
        >
          <Download size={16} />
          {t("export.download")}
        </button>
      </div>
    </div>
  );
}
