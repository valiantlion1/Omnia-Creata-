import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Download, Share2, Instagram, CheckCircle2,
  Zap, Lock, Image, FileImage, ChevronRight, Copy, ExternalLink, Sparkles
} from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";

const PORTRAIT_URL = "https://images.unsplash.com/photo-1632776088367-d0709928731e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHdvbWFuJTIwZ29sZGVuJTIwaG91ciUyMHBob3RvZ3JhcGh5fGVufDF8fHx8MTc3MjM4NzU4Mnww&ixlib=rb-4.1.0&q=80&w=400";

export function ExportScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedFormat, setSelectedFormat] = useState("jpg");
  const [selectedQuality, setSelectedQuality] = useState("hd");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [addWatermark, setAddWatermark] = useState(true);
  const [exported, setExported] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const isPro = false;

  const formats = useMemo(() => [
    { id: "jpg", label: "JPEG", descKey: "export.formats.jpg", color: "#C9A84C" },
    { id: "png", label: "PNG", descKey: "export.formats.png", color: "#4A90D9" },
    { id: "webp", label: "WebP", descKey: "export.formats.webp", color: "#3DBA8C" },
  ], []);

  const qualities = useMemo(() => [
    { id: "hd", label: "HD", desc: "1080p", free: true },
    { id: "2k", label: "2K", desc: "2048p", free: false },
    { id: "4k", label: "4K", desc: "4096p", free: false },
  ], []);

  const presets = useMemo(() => [
    { id: "instagram", icon: "IG", ratio: "1:1", color: "#E05656" },
    { id: "story", icon: "ST", ratio: "9:16", color: "#B07DD9" },
    { id: "print", icon: "PR", ratio: "A4", color: "#4A90D9" },
    { id: "ecom", icon: "EC", ratio: "1:1", color: "#3DBA8C" },
  ], []);

  const shareTargets = useMemo(() => [
    { id: "instagram", color: "#E05656", bg: "rgba(224,86,86,0.12)" },
    { id: "whatsapp", color: "#3DBA8C", bg: "rgba(61,186,140,0.12)" },
    { id: "drive", color: "#4A90D9", bg: "rgba(74,144,217,0.12)" },
    { id: "link", color: "#C9A84C", bg: "rgba(201,168,76,0.12)" },
  ], []);

  const handleExport = () => {
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareMap: Record<string, string> = {
    instagram: "https://www.instagram.com/",
    whatsapp: "https://wa.me/?text=OmniaPixels",
    drive: "https://drive.google.com/",
  };

  return (
    <div className="flex flex-col" style={{ background: "#060608", minHeight: "100%" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <ArrowLeft size={18} style={{ color: "#F0F0FA" }} />
        </button>
        <span className="text-[15px] font-bold" style={{ color: "#F0F0FA" }}>
          {t("export.title")}
        </span>
        <div style={{ width: 36 }} />
      </div>

      {/* Preview card */}
      <div className="px-5 mb-4">
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ height: "200px", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <ImageWithFallback
            src={PORTRAIT_URL}
            alt={t("export.preview_alt")}
            className="w-full h-full object-cover"
            style={{ filter: "brightness(1.1) contrast(1.12) saturate(1.25)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(6,6,8,0.85) 0%, transparent 50%)" }}
          />
          {/* Free badge watermark preview */}
          {addWatermark && !isPro && (
            <div
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
              style={{ background: "rgba(6,6,8,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E8C97A)" }}
              >
                <Sparkles size={9} style={{ color: "#060608" }} />
              </div>
              <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                {t("export.watermark_brand")}
              </span>
            </div>
          )}

          {/* Quality label */}
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: "rgba(201,168,76,0.85)", color: "#060608" }}
          >
            {t("export.ai_enhanced")}
          </div>
          <div className="absolute bottom-3 left-3">
            <p className="text-[12px] font-semibold" style={{ color: "#F0F0FA" }}>4032 × 3024</p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{t("export.preview_meta")}</p>
          </div>
        </div>
      </div>

      {/* Format selection */}
      <div className="px-5 mb-4">
        <p className="text-[12px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#6B6B84", letterSpacing: "0.1em" }}>
          {t("export.format")}
        </p>
        <div className="flex gap-2">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setSelectedFormat(fmt.id)}
              className="flex-1 py-2.5 rounded-xl flex flex-col items-center gap-0.5"
              style={{
                background: selectedFormat === fmt.id ? `${fmt.color}18` : "rgba(255,255,255,0.04)",
                border: selectedFormat === fmt.id ? `1px solid ${fmt.color}40` : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span className="text-[13px] font-bold" style={{ color: selectedFormat === fmt.id ? fmt.color : "#F0F0FA" }}>
                {fmt.label}
              </span>
              <span className="text-[10px]" style={{ color: "#6B6B84" }}>{t(fmt.descKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quality selection */}
      <div className="px-5 mb-4">
        <p className="text-[12px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#6B6B84", letterSpacing: "0.1em" }}>
          {t("export.quality")}
        </p>
        <div className="flex gap-2">
          {qualities.map((q) => (
            <button
              key={q.id}
              onClick={() => q.free || isPro ? setSelectedQuality(q.id) : navigate("/pricing")}
              className="flex-1 py-2.5 rounded-xl flex flex-col items-center gap-0.5 relative"
              style={{
                background: selectedQuality === q.id ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                border: selectedQuality === q.id ? "1px solid rgba(201,168,76,0.35)" : "1px solid rgba(255,255,255,0.07)",
                opacity: (!q.free && !isPro) ? 0.65 : 1,
              }}
            >
              {!q.free && !isPro && (
                <div
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #C9A84C, #E8C97A)" }}
                >
                  <Lock size={9} style={{ color: "#060608" }} />
                </div>
              )}
              <span className="text-[13px] font-bold" style={{ color: selectedQuality === q.id ? "#C9A84C" : "#F0F0FA" }}>
                {q.label}
              </span>
              <span className="text-[10px]" style={{ color: "#6B6B84" }}>{q.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Platform presets */}
      <div className="px-5 mb-4">
        <p className="text-[12px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#6B6B84", letterSpacing: "0.1em" }}>
          {t("export.presets_title")}
        </p>
        <div className="flex gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPreset(selectedPreset === p.id ? null : p.id)}
              className="flex-1 py-2.5 rounded-xl flex flex-col items-center gap-0.5"
              style={{
                background: selectedPreset === p.id ? `${p.color}18` : "rgba(255,255,255,0.04)",
                border: selectedPreset === p.id ? `1px solid ${p.color}40` : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span className="text-[11px] font-bold" style={{ color: selectedPreset === p.id ? p.color : "#F0F0FA" }}>
                {t(`export.presets.${p.id}`)}
              </span>
              <span className="text-[9px]" style={{ color: "#6B6B84" }}>{p.ratio}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Watermark toggle (free) */}
      {!isPro && (
        <div className="px-5 mb-4">
          <div
            className="flex items-center justify-between p-4 rounded-2xl"
            style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(201,168,76,0.15)" }}
              >
                <Sparkles size={16} style={{ color: "#C9A84C" }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#F0F0FA" }}>{t("export.watermark_title")}</p>
                <p className="text-[11px]" style={{ color: "#8A8A9E" }}>{t("export.watermark_required")}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1"
              style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.25)" }}
            >
              <Zap size={10} />
              {t("common.pro")}
            </button>
          </div>
        </div>
      )}

      {/* Share targets */}
      <div className="px-5 mb-5">
        <p className="text-[12px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#6B6B84", letterSpacing: "0.1em" }}>
          {t("export.share_title")}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {shareTargets.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (s.id === "link") {
                  handleCopyLink();
                  return;
                }
                window.open(shareMap[s.id], "_blank", "noopener,noreferrer");
              }}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
              style={{ background: s.bg, border: `1px solid ${s.color}25` }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: s.color }}>
                {s.id === "link" ? (
                  copiedLink ? <CheckCircle2 size={14} style={{ color: "#fff" }} /> : <Copy size={14} style={{ color: "#fff" }} />
                ) : s.id === "drive" ? (
                  <ExternalLink size={14} style={{ color: "#fff" }} />
                ) : s.id === "instagram" ? (
                  <Image size={14} style={{ color: "#fff" }} />
                ) : (
                  <Share2 size={14} style={{ color: "#fff" }} />
                )}
              </div>
              <span className="text-[9px] font-semibold" style={{ color: s.color }}>
                {s.id === "link" && copiedLink ? t("export.copied") : t(`export.share.${s.id}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Export success state */}
      <AnimatePresence>
        {exported && (
          <motion.div
            className="mx-5 mb-4 p-4 rounded-2xl flex items-center gap-3"
            style={{ background: "rgba(61,186,140,0.12)", border: "1px solid rgba(61,186,140,0.25)" }}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <CheckCircle2 size={24} style={{ color: "#3DBA8C", flexShrink: 0 }} />
            <div>
              <p className="text-[14px] font-bold" style={{ color: "#F0F0FA" }}>{t("export.downloaded_success")}</p>
              <p className="text-[12px]" style={{ color: "#8A8A9E" }}>{t("export.saved_to_gallery")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA buttons */}
      <div className="px-5 pb-8 flex gap-3">
        <button
          onClick={handleCopyLink}
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Share2 size={18} style={{ color: "#F0F0FA" }} />
        </button>
        <motion.button
          onClick={handleExport}
          className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)",
            color: "#060608",
            fontWeight: 700,
            fontSize: "15px",
            boxShadow: "0 0 25px rgba(201,168,76,0.3)",
          }}
          whileTap={{ scale: 0.97 }}
        >
          <Download size={18} />
          {t("export.download")}
        </motion.button>
      </div>
    </div>
  );
}
