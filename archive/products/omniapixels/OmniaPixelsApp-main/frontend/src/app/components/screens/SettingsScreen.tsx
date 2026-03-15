import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, User, Crown, Bell, Shield, Globe, Moon, Smartphone,
  ChevronRight, LogOut, Trash2, Star, HelpCircle, FileText,
  Zap, Gift, Share2
} from "lucide-react";

const PLAN_BADGE = {
  label: "FREE",
  color: "#8A8A9E",
  bg: "rgba(138,138,158,0.15)",
  border: "rgba(138,138,158,0.2)",
};

const themes = [
  { id: "dark", labelKey: "settings.theme.dark", icon: Moon, color: "#4A90D9" },
  { id: "amoled", labelKey: "settings.theme.amoled", icon: Moon, color: "#F0F0FA" },
  { id: "light", labelKey: "settings.theme.light", icon: Smartphone, color: "#E8A830" },
];

const languages = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "de", label: "Deutsch" },
];

type ToggleSetting = {
  id: string;
  label: string;
  desc: string;
  default: boolean;
  proOnly?: boolean;
};

const toggleSettings: ToggleSetting[] = [
  { id: "push", label: "Bildirimler", desc: "İşlem bitti uyarıları", default: true },
  { id: "email", label: "E-posta Özeti", desc: "Günlük aktivite özeti", default: false },
  { id: "ai_suggest", label: "AI Önerileri", desc: "Akıllı düzenleme ipuçları", default: true, proOnly: true },
  { id: "local_mode", label: "Önce Yerel İşlem", desc: "Gizlilik öncelikli mod", default: true, proOnly: true },
  { id: "analytics", label: "Kullanım Analizi", desc: "Ürünü iyileştirmemize yardım et", default: false },
  { id: "biometric", label: "Biyometrik Giriş", desc: "Parmak izi ile hızlı giriş", default: false },
];

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTheme, setActiveTheme] = useState(
    localStorage.getItem("omnia-theme") || "dark"
  );
  const [languageOpen, setLanguageOpen] = useState(false);
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(toggleSettings.map((s) => [s.id, s.default]))
  );

  const applyTheme = (themeId: string) => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.removeAttribute("data-theme");
    if (themeId === "dark") {
      root.classList.add("dark");
      return;
    }
    if (themeId === "amoled") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "amoled");
      return;
    }
    root.setAttribute("data-theme", "light");
  };

  const toggle = (id: string) => setToggles((prev) => ({ ...prev, [id]: !prev[id] }));

  const selectTheme = (themeId: string) => {
    setActiveTheme(themeId);
    localStorage.setItem("omnia-theme", themeId);
    applyTheme(themeId);
  };

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setLanguageOpen(false);
  };

  const shareInvite = async () => {
    const shareUrl = "https://omniacreata.com";
    if (navigator.share) {
      await navigator.share({
        title: "OmniaPixels",
        text: t("settings.share_invite_text"),
        url: shareUrl,
      });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
  };

  const currentLanguage = languages.find((lang) => i18n.language.startsWith(lang.code)) || languages[0];

  const menuItems = [
    { icon: Crown, label: t("settings.menu.plan"), desc: `${t("common.free")} · ${t("common.upgrade_pro")}`, color: "#C9A84C", action: () => navigate("/pricing") },
    { icon: Gift, label: t("settings.menu.invite"), desc: t("settings.menu.invite_desc"), color: "#B07DD9", action: shareInvite },
    { icon: Star, label: t("settings.menu.rate"), desc: t("settings.menu.rate_desc"), color: "#E8A830", action: () => window.open("https://g.page/r/CQOmniaCreata/review", "_blank", "noopener,noreferrer") },
    { icon: HelpCircle, label: t("settings.menu.help"), desc: t("settings.menu.help_desc"), color: "#4A90D9", action: () => window.open("mailto:support@omniacreata.com", "_blank", "noopener,noreferrer") },
    { icon: FileText, label: t("settings.menu.privacy"), desc: "GDPR · KVKK", color: "#8A8A9E", action: () => window.open("https://omniacreata.com/privacy", "_blank", "noopener,noreferrer") },
    { icon: Shield, label: t("settings.menu.security"), desc: t("settings.menu.security_desc"), color: "#3DBA8C", action: () => window.open("https://omniacreata.com/security", "_blank", "noopener,noreferrer") },
  ];

  const toggleSettingsList = [
    { id: "push", label: t("settings.toggles.push.label"), desc: t("settings.toggles.push.desc"), default: true },
    { id: "email", label: t("settings.toggles.email.label"), desc: t("settings.toggles.email.desc"), default: false },
    { id: "ai_suggest", label: t("settings.toggles.ai_suggest.label"), desc: t("settings.toggles.ai_suggest.desc"), default: true, proOnly: true },
    { id: "local_mode", label: t("settings.toggles.local_mode.label"), desc: t("settings.toggles.local_mode.desc"), default: true, proOnly: true },
    { id: "analytics", label: t("settings.toggles.analytics.label"), desc: t("settings.toggles.analytics.desc"), default: false },
    { id: "biometric", label: t("settings.toggles.biometric.label"), desc: t("settings.toggles.biometric.desc"), default: false },
  ];

  return (
    <div className="flex flex-col" style={{ background: "#060608", minHeight: "100%" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div style={{ width: 36 }} />
        <span className="text-[17px] font-bold" style={{ color: "#F0F0FA", letterSpacing: "-0.01em" }}>
          {t("settings.title")}
        </span>
        <div style={{ width: 36 }} />
      </div>

      <div className="flex-1 overflow-y-auto omnia-scroll pb-8">
        {/* Profile card */}
        <div className="px-5 mb-5">
          <motion.div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 100%)",
              border: "1px solid rgba(201,168,76,0.15)",
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-5"
              style={{ background: "radial-gradient(circle, #C9A84C 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />

            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
                style={{ background: "rgba(201,168,76,0.15)", border: "1.5px solid rgba(201,168,76,0.3)" }}
              >
                <span className="text-[22px] font-extrabold" style={{ color: "#C9A84C" }}>AE</span>
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "#060608", border: "1px solid rgba(201,168,76,0.3)" }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ background: "#3DBA8C" }} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-[17px] font-extrabold" style={{ color: "#F0F0FA", letterSpacing: "-0.01em" }}>
                    Ali Erdinç Yiğitaslan
                  </h2>
                </div>
                <p className="text-[12px]" style={{ color: "#8A8A9E" }}>ghostsofter12@gmail.com</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide"
                    style={{ background: PLAN_BADGE.bg, color: PLAN_BADGE.color, border: `1px solid ${PLAN_BADGE.border}` }}
                  >
                    {PLAN_BADGE.label}
                  </span>
                  <button
                    onClick={() => navigate("/pricing")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.25)" }}
                  >
                    <Zap size={10} />
                    {t("common.upgrade_pro")}
                  </button>
                </div>
              </div>
            </div>

            {/* Credits bar */}
            <div className="mt-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-[12px]" style={{ color: "#8A8A9E" }}>{t("common.daily_credits")}</span>
                <span className="text-[12px] font-bold" style={{ color: "#C9A84C" }}>8 / 10</span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: "80%", background: "linear-gradient(90deg, #C9A84C, #E8C97A)" }} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="px-5 mb-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t("settings.stats.edits"), value: "47", color: "#C9A84C" },
              { label: t("settings.stats.month"), value: "23", color: "#3DBA8C" },
              { label: t("settings.stats.credit_usage"), value: "186", color: "#4A90D9" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="text-[20px] font-extrabold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#6B6B84" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="px-5 mb-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#6B6B84", letterSpacing: "0.1em" }}>
            {t("settings.theme.label")}
          </p>
          <div className="flex gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => selectTheme(theme.id)}
                className="flex-1 py-2.5 rounded-xl flex flex-col items-center gap-1.5"
                style={{
                  background: activeTheme === theme.id ? `${theme.color}15` : "rgba(255,255,255,0.03)",
                  border: activeTheme === theme.id ? `1px solid ${theme.color}35` : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <theme.icon size={16} style={{ color: activeTheme === theme.id ? theme.color : "#6B6B84" }} />
                <span className="text-[11px] font-semibold" style={{ color: activeTheme === theme.id ? theme.color : "#6B6B84" }}>
                  {t(theme.labelKey)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="px-5 mb-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#6B6B84", letterSpacing: "0.1em" }}>
            {t("settings.language")}
          </p>
          <div className="relative">
            <button
              onClick={() => setLanguageOpen((prev) => !prev)}
              className="w-full px-4 py-3 rounded-xl text-[13px] font-semibold flex items-center justify-between"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "#F0F0FA",
              }}
            >
              <span className="flex items-center gap-2">
                <Globe size={15} style={{ color: "#C9A84C" }} />
                {currentLanguage.label}
              </span>
              <ChevronRight
                size={15}
                style={{
                  color: "#8A8A9E",
                  transform: languageOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 180ms",
                }}
              />
            </button>
            {languageOpen && (
              <div
                className="absolute left-0 right-0 mt-2 rounded-xl overflow-hidden z-20"
                style={{ background: "#101018", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {languages.map((lang, index) => {
                  const isActive = i18n.language.startsWith(lang.code);
                  return (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className="w-full px-4 py-2.5 text-[12px] font-semibold text-left flex items-center justify-between"
                      style={{
                        color: isActive ? "#C9A84C" : "#F0F0FA",
                        borderBottom: index < languages.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                        background: isActive ? "rgba(201,168,76,0.12)" : "transparent",
                      }}
                    >
                      {lang.label}
                      {isActive && (
                        <span style={{ color: "#C9A84C" }}>•</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Toggles */}
        <div className="px-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#6B6B84", letterSpacing: "0.1em" }}>
            {t("settings.preferences")}
          </p>
          <div className="flex flex-col gap-2">
            {toggleSettingsList.map((setting) => (
              <button
                key={setting.id}
                onClick={() => toggle(setting.id)}
                className="flex items-center justify-between p-3.5 rounded-xl transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="text-left">
                  <div className="text-[14px] font-semibold flex items-center gap-2" style={{ color: "#F0F0FA" }}>
                    {setting.label}
                    {setting.proOnly && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#C9A84C]/20 text-[#C9A84C]">PRO</span>
                    )}
                  </div>
                  <div className="text-[11px]" style={{ color: "#8A8A9E" }}>{setting.desc}</div>
                </div>
                <div
                  className="w-11 h-6 rounded-full relative transition-all duration-300"
                  style={{
                    background: toggles[setting.id] ? "#C9A84C" : "rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300"
                    style={{
                      left: toggles[setting.id] ? "24px" : "4px",
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="h-8" />

        {/* Menu items */}
        <div className="px-5 mb-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#6B6B84", letterSpacing: "0.1em" }}>
            {t("settings.account_more")}
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {menuItems.map((item, i, arr) => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-all"
                style={{
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}15` }}
                >
                  <item.icon size={16} style={{ color: item.color }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: "#F0F0FA" }}>{item.label}</p>
                  <p className="text-[11px]" style={{ color: "#6B6B84" }}>{item.desc}</p>
                </div>
                <ChevronRight size={15} style={{ color: "#6B6B84", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>

        {/* GDPR actions */}
        <div className="px-5 mb-5">
          <div className="flex gap-2">
            <button
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify({ account: "Ali Erdinç Yiğitaslan", email: "ghostsofter12@gmail.com", plan: "free" }, null, 2)],
                  { type: "application/json" }
                );
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "omniapixels-account-data.json";
                anchor.click();
                URL.revokeObjectURL(url);
              }}
              className="flex-1 py-3 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#8A8A9E" }}
            >
              <Share2 size={14} />
              {t("settings.gdpr.download")}
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="flex-1 py-3 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-2"
              style={{ background: "rgba(224,86,86,0.06)", border: "1px solid rgba(224,86,86,0.15)", color: "#E05656" }}
            >
              <Trash2 size={14} />
              {t("settings.gdpr.delete")}
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="px-5 mb-6">
          <button
            onClick={() => navigate("/auth")}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[14px] font-semibold"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#F0F0FA" }}
          >
            <LogOut size={16} style={{ color: "#E05656" }} />
            <span style={{ color: "#E05656" }}>{t("settings.logout")}</span>
          </button>
        </div>
        {/* Version */}
        <div className="px-5 pb-4 text-center">
          <p className="text-[11px]" style={{ color: "#4A4A5A" }}>
            OmniaPixels v1.0.0-rc · by OmniaCreata
          </p>
          <p className="text-[10px] mt-1" style={{ color: "#3A3A4A" }}>
            © 2026 Ali Erdinç Yiğitaslan · omniacreata.com
          </p>
        </div>
      </div>
    </div>
  );
}
