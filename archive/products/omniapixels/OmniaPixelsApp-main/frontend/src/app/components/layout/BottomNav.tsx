import { useNavigate, useLocation } from "react-router-dom";
import { Home, Images, Clock, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

const navItems = [
  { path: "/home", icon: Home, labelKey: "common.home" },
  { path: "/gallery", icon: Images, labelKey: "common.gallery" },
  { path: "/queue", icon: Clock, labelKey: "common.queue" },
  { path: "/settings", icon: Settings, labelKey: "common.settings" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-40"
      style={{
        background: "rgba(10, 10, 18, 0.92)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        height: "80px",
        paddingBottom: "16px",
      }}
    >
      <div className="flex items-start justify-around pt-2">
        {navItems.map(({ path, icon: Icon, labelKey }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1 px-4 pt-1 rounded-xl transition-all"
              style={{ minWidth: "64px" }}
            >
              <div
                className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all"
                style={{
                  background: active ? "rgba(201,168,76,0.15)" : "transparent",
                }}
              >
                {active && (
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{ boxShadow: "0 0 12px rgba(201,168,76,0.3)" }}
                  />
                )}
                <Icon
                  size={20}
                  style={{ color: active ? "#C9A84C" : "#6B6B84" }}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              </div>
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{ color: active ? "#C9A84C" : "#6B6B84" }}
              >
                {t(labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
