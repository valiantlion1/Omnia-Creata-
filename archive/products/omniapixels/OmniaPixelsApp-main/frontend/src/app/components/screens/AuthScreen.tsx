import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Shield } from "lucide-react";

export function AuthScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/home");
    }, 1500);
  };

  return (
    <div
      className="relative flex flex-col"
      style={{ minHeight: "calc(100vh - 44px)", background: "#060608" }}
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72"
          style={{
            background: "radial-gradient(ellipse, rgba(201,168,76,0.1) 0%, transparent 70%)",
            filter: "blur(30px)",
            top: "-50px",
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-4 pb-2 relative z-10">
        <button
          onClick={() => navigate("/onboarding")}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <ArrowLeft size={18} style={{ color: "#F0F0FA" }} />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-4 pb-8 gap-6 relative z-10">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)",
              border: "1px solid rgba(201,168,76,0.3)",
              boxShadow: "0 0 20px rgba(201,168,76,0.15)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="g2" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#E8C97A" />
                  <stop offset="100%" stopColor="#C9A84C" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="18" stroke="url(#g2)" strokeWidth="3" fill="none" />
              <circle cx="24" cy="24" r="5" fill="url(#g2)" />
              <circle cx="24" cy="6" r="3" fill="url(#g2)" />
              <circle cx="24" cy="42" r="3" fill="url(#g2)" />
              <circle cx="6" cy="24" r="3" fill="url(#g2)" />
              <circle cx="42" cy="24" r="3" fill="url(#g2)" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-[24px]" style={{ fontWeight: 800, color: "#F0F0FA", letterSpacing: "-0.02em" }}>
              {mode === "login" ? t("auth.login.title") : t("auth.register.title")}
            </h1>
            <p className="text-[14px] mt-1" style={{ color: "#8A8A9E" }}>
              {mode === "login"
                ? t("auth.login.subtitle")
                : t("auth.register.subtitle")}
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div
          className="flex p-1 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-all"
              style={{
                background: mode === m ? "rgba(201,168,76,0.15)" : "transparent",
                color: mode === m ? "#C9A84C" : "#6B6B84",
                border: mode === m ? "1px solid rgba(201,168,76,0.25)" : "1px solid transparent",
              }}
            >
              {m === "login" ? t("auth.login.cta") : t("auth.register.cta")}
            </button>
          ))}
        </div>

        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4"
          >
            {mode === "register" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold tracking-wide uppercase" style={{ color: "#6B6B84", letterSpacing: "0.08em" }}>
                  {t("auth.labels.name")}
                </label>
                <div
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <User size={18} style={{ color: "#6B6B84" }} />
                  <input
                    type="text"
                    placeholder={t("auth.name_placeholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[15px]"
                    style={{ color: "#F0F0FA", caretColor: "#C9A84C" }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold tracking-wide uppercase" style={{ color: "#6B6B84", letterSpacing: "0.08em" }}>
                {t("auth.labels.email")}
              </label>
              <div
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Mail size={18} style={{ color: "#6B6B84" }} />
                <input
                  type="email"
                  placeholder={t("auth.email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-[15px]"
                  style={{ color: "#F0F0FA", caretColor: "#C9A84C" }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold tracking-wide uppercase" style={{ color: "#6B6B84", letterSpacing: "0.08em" }}>
                {t("auth.labels.password")}
              </label>
              <div
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Lock size={18} style={{ color: "#6B6B84" }} />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder={t("auth.password_placeholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-[15px]"
                  style={{ color: "#F0F0FA", caretColor: "#C9A84C" }}
                />
                <button onClick={() => setShowPass(!showPass)}>
                  {showPass ? (
                    <EyeOff size={18} style={{ color: "#6B6B84" }} />
                  ) : (
                    <Eye size={18} style={{ color: "#6B6B84" }} />
                  )}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  onClick={() => window.open("mailto:support@omniacreata.com", "_blank", "noopener,noreferrer")}
                  className="text-[13px]"
                  style={{ color: "#C9A84C" }}
                >
                  {t("auth.forgot_password")}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
          style={{
            background: loading
              ? "rgba(201,168,76,0.3)"
              : "linear-gradient(135deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)",
            color: "#060608",
            fontWeight: 700,
            fontSize: "16px",
            boxShadow: loading ? "none" : "0 0 25px rgba(201,168,76,0.35), 0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {loading ? (
            <motion.div
              className="w-5 h-5 rounded-full border-2"
              style={{ borderColor: "#C9A84C", borderTopColor: "transparent" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
          ) : mode === "login" ? (
            t("auth.login.cta")
          ) : (
            t("auth.register.cta")
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          <span className="text-[12px]" style={{ color: "#6B6B84" }}>{t("auth.or")}</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>

        {/* Social buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/home")}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-3"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-[15px] font-semibold" style={{ color: "#F0F0FA" }}>
              {t("auth.social.google")}
            </span>
          </button>

          <button
            onClick={() => navigate("/home")}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-3"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <span className="text-[15px] font-semibold" style={{ color: "#F0F0FA" }}>
              {t("auth.social.apple")}
            </span>
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={() => navigate("/home")}
          className="flex items-center justify-center gap-2 py-2"
        >
          <Shield size={14} style={{ color: "#6B6B84" }} />
          <span className="text-[13px]" style={{ color: "#6B6B84" }}>
            {t("auth.skip_local")}
          </span>
        </button>
      </div>
    </div>
  );
}
