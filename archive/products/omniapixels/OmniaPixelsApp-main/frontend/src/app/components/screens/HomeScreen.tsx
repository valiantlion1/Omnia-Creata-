import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Sparkles, Scissors, ZoomIn, Wand2, Palette, Eye,
  Bell, ChevronRight, Plus, Star, Zap, TrendingUp, Gift
} from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";

const PORTRAIT_URL = "https://images.unsplash.com/photo-1632776088367-d0709928731e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHdvbWFuJTIwZ29sZGVuJTIwaG91ciUyMHBob3RvZ3JhcGh5fGVufDF8fHx8MTc3MjM4NzU4Mnww&ixlib=rb-4.1.0&q=80&w=400";
const CITY_URL = "https://images.unsplash.com/photo-1612005660669-006429efefff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwbmlnaHQlMjBzdHJlZXQlMjBib2tlaCUyMHBob3RvZ3JhcGh5fGVufDF8fHx8MTc3MjM4NzU4Nnww&ixlib=rb-4.1.0&q=80&w=400";
const MOUNTAIN_URL = "https://images.unsplash.com/photo-1749401640206-19e74ab20409?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaW5lbWF0aWMlMjBsYW5kc2NhcGUlMjBtb3VudGFpbiUyMGZvZyUyMGRyYW1hdGljfGVufDF8fHx8MTc3MjM4NzU4M3ww&ixlib=rb-4.1.0&q=80&w=400";

export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [credits] = useState(8);
  const maxCredits = 10;

  const quickActions = useMemo(() => [
    { id: "enhance", icon: Sparkles, label: t("home.quick_actions.enhance"), color: "#C9A84C", bg: "rgba(201,168,76,0.12)", credits: 1 },
    { id: "bg", icon: Scissors, label: t("home.quick_actions.bg_remove"), color: "#E05656", bg: "rgba(224,86,86,0.12)", credits: 2 },
    { id: "upscale", icon: ZoomIn, label: t("home.quick_actions.upscale"), color: "#4A90D9", bg: "rgba(74,144,217,0.12)", credits: 2 },
    { id: "denoise", icon: Wand2, label: t("home.quick_actions.deblur"), color: "#3DBA8C", bg: "rgba(61,186,140,0.12)", credits: 1 },
    { id: "style", icon: Palette, label: t("home.quick_actions.style"), color: "#B07DD9", bg: "rgba(176,125,217,0.12)", credits: 3 },
    { id: "compare", icon: Eye, label: t("home.quick_actions.compare"), color: "#E8A830", bg: "rgba(232,168,48,0.12)", credits: 0 },
  ], [t]);

  const recentPhotos = useMemo(() => [
    { id: 1, src: PORTRAIT_URL, type: t("home.quick_actions.enhance"), time: "2h", stars: true },
    { id: 2, src: CITY_URL, type: t("home.quick_actions.bg_remove"), time: "1d", stars: false },
    { id: 3, src: MOUNTAIN_URL, type: t("home.quick_actions.upscale"), time: "3d", stars: true },
  ], [t]);

  return (
    <div className="flex flex-col min-h-full bg-[#060608]">
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-[#C9A84C]">
              OmniaPixels
            </p>
            <h2 className="text-[20px] mt-0.5 font-extrabold tracking-[-0.02em] text-[#F0F0FA]">
              {t("common.hello")}, Ali 👋
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10"
            >
              <Bell size={16} className="text-[#8A8A9E]" />
              <div
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C9A84C]"
              />
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden border-[1.5px] border-[#C9A84C]/40"
            >
              <span className="text-[13px] font-bold text-[#C9A84C]">AE</span>
            </div>
          </div>
        </div>

        {/* Credits card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl p-4 relative overflow-hidden border border-[#C9A84C]/20 bg-gradient-to-br from-[#C9A84C]/10 to-[#C9A84C]/5"
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-[radial-gradient(circle,_#C9A84C_0%,_transparent_70%)] translate-x-1/4 -translate-y-1/4" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#C9A84C]/20 text-[#C9A84C]"
              >
                {t("common.free")}
              </div>
              <span className="text-[13px] text-[#8A8A9E]">{t("common.daily_credits")}</span>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/25"
            >
              <Zap size={11} />
              {t("common.upgrade_pro")}
            </button>
          </div>
          <div className="flex items-end justify-between mb-2">
            <span className="text-[28px] font-extrabold text-[#F0F0FA]">{credits}</span>
            <span className="text-[14px] mb-1" style={{ color: "#6B6B84" }}>/ {maxCredits} {t("common.credits").toLowerCase()}</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #C9A84C, #E8C97A)" }}
              initial={{ width: 0 }}
              animate={{ width: `${(credits / maxCredits) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <Gift size={12} style={{ color: "#C9A84C" }} />
            <span className="text-[11px]" style={{ color: "#8A8A9E" }}>{t("home.ad_bonus")}</span>
          </div>
        </motion.div>
      </div>

      {/* Import CTA */}
      <div className="px-5 mb-4">
        <motion.button
          onClick={() => navigate("/editor")}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)",
            boxShadow: "0 0 30px rgba(201,168,76,0.3), 0 4px 20px rgba(0,0,0,0.4)",
          }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={20} style={{ color: "#060608" }} />
          <span className="text-[16px]" style={{ fontWeight: 700, color: "#060608" }}>
            {t("common.new_project")}
          </span>
        </motion.button>
      </div>

      {/* Projects / Templates Toggle */}
      <div className="px-5 mb-5 flex gap-4">
        <button className="text-[15px] font-bold text-[#F0F0FA] border-b-2 border-[#C9A84C] pb-1">
          {t("home.projects")}
        </button>
        <button className="text-[15px] font-medium text-[#6B6B84]">
          {t("home.templates")}
        </button>
      </div>

      {/* Recent Projects (Grid) */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {recentPhotos.map((photo, i) => (
            <motion.button
              key={photo.id}
              onClick={() => navigate("/editor")}
              className="relative rounded-2xl overflow-hidden aspect-[3/4]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <ImageWithFallback
                src={photo.src}
                alt={photo.type}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(6,6,8,0.85) 0%, transparent 50%)" }}
              />
              <div className="absolute bottom-3 left-3 right-3">
                <span className="text-[12px] font-semibold text-white block mb-0.5">Project {i + 1}</span>
                <span className="text-[10px] text-[#A0A0B8]">{photo.time} ago</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("home.stats.edited"), value: "47", color: "#C9A84C" },
            { label: t("home.stats.this_week"), value: "12", color: "#3DBA8C" },
            { label: t("home.stats.saved"), value: "23", color: "#4A90D9" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="text-[22px]" style={{ fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "#6B6B84" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
