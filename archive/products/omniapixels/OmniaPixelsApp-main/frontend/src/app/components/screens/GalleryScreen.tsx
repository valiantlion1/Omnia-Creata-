import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Search, Grid3x3, LayoutGrid, Star, Sparkles, ZoomIn, Scissors, Wand2, Plus } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";

const PORTRAIT_URL = "https://images.unsplash.com/photo-1632776088367-d0709928731e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHdvbWFuJTIwZ29sZGVuJTIwaG91ciUyMHBob3RvZ3JhcGh5fGVufDF8fHx8MTc3MjM4NzU4Mnww&ixlib=rb-4.1.0&q=80&w=400";
const CITY_URL = "https://images.unsplash.com/photo-1612005660669-006429efefff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwbmlnaHQlMjBzdHJlZXQlMjBib2tlaCUyMHBob3RvZ3JhcGh5fGVufDF8fHx8MTc3MjM4NzU4Nnww&ixlib=rb-4.1.0&q=80&w=400";
const MOUNTAIN_URL = "https://images.unsplash.com/photo-1749401640206-19e74ab20409?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaW5lbWF0aWMlMjBsYW5kc2NhcGUlMjBtb3VudGFpbiUyMGZvZyUyMGRyYW1hdGljfGVufDF8fHx8MTc3MjM4NzU4M3ww&ixlib=rb-4.1.0&q=80&w=400";
const PRODUCT_URL = "https://images.unsplash.com/photo-1625860191460-10a66c7384fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0JTIwcGhvdG9ncmFwaHklMjB3aGl0ZSUyMGJhY2tncm91bmQlMjBtaW5pbWFsfGVufDF8fHx8MTc3MjM4NzU4M3ww&ixlib=rb-4.1.0&q=80&w=400";

const filters = ["all", "favorite", "enhanced", "upscale", "bg_remove", "deblur"] as const;

export function GalleryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("all");
  const [gridMode, setGridMode] = useState<2 | 3>(2);
  const [search, setSearch] = useState("");

  const photos = useMemo(() => [
    { id: 1, src: PORTRAIT_URL, typeKey: "gallery.type.ai_enhanced", typeTag: "enhance", icon: Sparkles, iconColor: "#C9A84C", starred: true, dateKey: "gallery.group.today" },
    { id: 2, src: MOUNTAIN_URL, typeKey: "gallery.type.upscale_4x", typeTag: "upscale", icon: ZoomIn, iconColor: "#4A90D9", starred: false, dateKey: "gallery.group.today" },
    { id: 3, src: PRODUCT_URL, typeKey: "gallery.type.bg_removed", typeTag: "bg_remove", icon: Scissors, iconColor: "#E05656", starred: true, dateKey: "gallery.group.yesterday" },
    { id: 4, src: CITY_URL, typeKey: "gallery.type.deblur", typeTag: "deblur", icon: Wand2, iconColor: "#3DBA8C", starred: false, dateKey: "gallery.group.yesterday" },
    { id: 5, src: PORTRAIT_URL, typeKey: "gallery.type.filter", typeTag: "enhance", icon: Sparkles, iconColor: "#B07DD9", starred: false, dateKey: "gallery.group.three_days_ago" },
    { id: 6, src: MOUNTAIN_URL, typeKey: "gallery.type.ai_enhanced", typeTag: "enhance", icon: Sparkles, iconColor: "#C9A84C", starred: true, dateKey: "gallery.group.three_days_ago" },
    { id: 7, src: CITY_URL, typeKey: "gallery.type.upscale_2x", typeTag: "upscale", icon: ZoomIn, iconColor: "#4A90D9", starred: false, dateKey: "gallery.group.last_week" },
  ], []);

  const filteredPhotos = useMemo(() => photos.filter((p) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "favorite") return p.starred;
    if (activeFilter === "enhanced") return p.typeTag === "enhance";
    if (activeFilter === "upscale") return p.typeTag === "upscale";
    if (activeFilter === "bg_remove") return p.typeTag === "bg_remove";
    if (activeFilter === "deblur") return p.typeTag === "deblur";
    return true;
  }), [activeFilter, photos]);

  const groups = useMemo(() => filteredPhotos.reduce<Record<string, typeof photos>>((acc, p) => {
    if (!acc[p.dateKey]) acc[p.dateKey] = [];
    acc[p.dateKey].push(p);
    return acc;
  }, {}), [filteredPhotos]);

  return (
    <div className="flex flex-col" style={{ background: "#060608", minHeight: "100%" }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[20px]" style={{ fontWeight: 800, color: "#F0F0FA", letterSpacing: "-0.02em" }}>
              {t("gallery.title")}
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: "#8A8A9E" }}>
              {t("gallery.edits_count", { count: photos.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGridMode(gridMode === 2 ? 3 : 2)}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {gridMode === 2
                ? <Grid3x3 size={16} style={{ color: "#8A8A9E" }} />
                : <LayoutGrid size={16} style={{ color: "#8A8A9E" }} />
              }
            </button>
            <button
              onClick={() => navigate("/editor")}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.2)" }}
            >
              <Plus size={18} style={{ color: "#C9A84C" }} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl mb-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Search size={16} style={{ color: "#6B6B84" }} />
          <input
            type="text"
            placeholder={t("gallery.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[14px]"
            style={{ color: "#F0F0FA", caretColor: "#C9A84C" }}
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1"
              style={{
                background: activeFilter === f ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                color: activeFilter === f ? "#C9A84C" : "#6B6B84",
                border: activeFilter === f ? "1px solid rgba(201,168,76,0.25)" : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {f === "favorite" && <Star size={11} fill={activeFilter === f ? "#C9A84C" : "none"} />}
              {t(`gallery.filters.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery grid */}
      <div className="flex-1 px-5 pb-6">
        {filteredPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <LayoutGrid size={28} style={{ color: "#6B6B84" }} />
            </div>
            <div className="text-center">
              <p className="text-[16px] font-bold" style={{ color: "#F0F0FA" }}>{t("gallery.empty_title")}</p>
              <p className="text-[13px] mt-1" style={{ color: "#6B6B84" }}>
                {t("gallery.empty_desc")}
              </p>
            </div>
          </div>
        ) : (
          Object.entries(groups).map(([dateKey, groupPhotos]) => (
            <div key={dateKey} className="mb-5">
              <p className="text-[12px] font-semibold mb-3 tracking-wide" style={{ color: "#6B6B84", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {t(dateKey)}
              </p>
              <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${gridMode}, 1fr)` }}>
                {groupPhotos.map((photo, i) => (
                  <motion.button
                    key={photo.id}
                    onClick={() => navigate("/compare")}
                    className="relative rounded-2xl overflow-hidden"
                    style={{ aspectRatio: gridMode === 2 ? "3/4" : "1/1" }}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <ImageWithFallback
                      src={photo.src}
                      alt={t(photo.typeKey)}
                      className="w-full h-full object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(6,6,8,0.8) 0%, transparent 45%)" }}
                    />

                    {/* Edit type badge */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-lg"
                        style={{ background: "rgba(6,6,8,0.75)", backdropFilter: "blur(8px)" }}
                      >
                        <photo.icon size={10} style={{ color: photo.iconColor }} />
                        <span className="text-[10px] font-semibold" style={{ color: "#F0F0FA" }}>
                          {t(photo.typeKey)}
                        </span>
                      </div>
                      {photo.starred && (
                        <Star size={14} fill="#C9A84C" style={{ color: "#C9A84C" }} />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
