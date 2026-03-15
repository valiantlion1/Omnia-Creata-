import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

export function SplashScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const t = setTimeout(() => navigate("/onboarding"), 2800);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{ height: "calc(100vh - 44px)", minHeight: "800px", background: "#060608" }}
    >
      {/* Ambient glow layers */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.04) 50%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)",
            filter: "blur(15px)",
          }}
        />
      </motion.div>

      {/* Decorative rings */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ width: "280px", height: "280px", borderColor: "rgba(201,168,76,0.08)" }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ width: "200px", height: "200px", borderColor: "rgba(201,168,76,0.12)" }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
      />

      {/* Logo container */}
      <motion.div
        className="relative flex flex-col items-center gap-6 z-10"
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
      >
        {/* Logo mark */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: "90px", height: "90px" }}
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)",
              border: "1px solid rgba(201,168,76,0.3)",
              boxShadow: "0 0 40px rgba(201,168,76,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          />
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#E8C97A" />
                <stop offset="100%" stopColor="#C9A84C" />
              </linearGradient>
            </defs>
            {/* O shape with pixel dots */}
            <circle cx="24" cy="24" r="18" stroke="url(#goldGrad)" strokeWidth="3" fill="none" />
            <circle cx="24" cy="24" r="10" fill="url(#goldGrad)" opacity="0.15" />
            <circle cx="24" cy="6" r="3" fill="url(#goldGrad)" />
            <circle cx="24" cy="42" r="3" fill="url(#goldGrad)" />
            <circle cx="6" cy="24" r="3" fill="url(#goldGrad)" />
            <circle cx="42" cy="24" r="3" fill="url(#goldGrad)" />
            <circle cx="24" cy="24" r="5" fill="url(#goldGrad)" />
          </svg>
        </div>

        {/* Brand name */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-baseline gap-0">
            <span
              className="text-[32px] tracking-tight"
              style={{ fontWeight: 800, color: "#F0F0FA", letterSpacing: "-0.02em" }}
            >
              Omnia
            </span>
            <span
              className="text-[32px] tracking-tight"
              style={{
                fontWeight: 800,
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #E8C97A 0%, #C9A84C 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Pixels
            </span>
          </div>
          <span
            className="text-[13px] tracking-widest uppercase"
            style={{ color: "#6B6B84", letterSpacing: "0.2em", fontWeight: 500 }}
          >
            by OmniaCreata
          </span>
        </div>

        {/* Tagline */}
        <motion.p
          className="text-[15px] text-center"
          style={{ color: "#8A8A9E", fontWeight: 400, letterSpacing: "0.01em" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          {t("splash.tagline")}
        </motion.p>
      </motion.div>

      {/* Loading indicator */}
      <motion.div
        className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.4 }}
      >
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#C9A84C" }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <span className="text-[12px]" style={{ color: "#6B6B84" }}>{t("splash.loading_engine")}</span>
      </motion.div>

      {/* Corner decoration */}
      <div className="absolute top-6 right-6 opacity-20">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M6 2H2v4M18 2h4v4M6 22H2v-4M18 22h4v-4" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="absolute bottom-6 left-6 opacity-20">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M6 2H2v4M18 2h4v4M6 22H2v-4M18 22h4v-4" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
