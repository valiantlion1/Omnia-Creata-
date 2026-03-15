import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Sparkles, Shield, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

const slides = [
  {
    id: 0,
    icon: Sparkles,
    iconColor: "#C9A84C",
    bg: "radial-gradient(ellipse at center, rgba(201,168,76,0.12) 0%, transparent 70%)",
    tag: "onboarding.slides.0.tag",
    title: "onboarding.slides.0.title",
    description: "onboarding.slides.0.description",
    visual: (
      <div className="relative flex items-center justify-center w-48 h-48">
        {/* Animated rings */}
        {[140, 108, 76].map((size, i) => (
          <motion.div
            key={size}
            className="absolute rounded-full border"
            style={{
              width: size,
              height: size,
              borderColor: `rgba(201,168,76,${0.1 + i * 0.08})`,
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 12 + i * 4, repeat: Infinity, ease: "linear" }}
          />
        ))}
        {/* Center icon */}
        <div
          className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.2) 0%, rgba(201,168,76,0.05) 100%)",
            border: "1px solid rgba(201,168,76,0.4)",
            boxShadow: "0 0 30px rgba(201,168,76,0.25)",
          }}
        >
          <Sparkles size={36} style={{ color: "#C9A84C" }} />
        </div>
        {/* Orbiting dots */}
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <motion.div
            key={angle}
            className="absolute w-2 h-2 rounded-full"
            style={{ background: "#C9A84C", opacity: 0.6 + i * 0.08 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: i * 0.3 }}
          />
        ))}
      </div>
    ),
  },
  {
    id: 1,
    icon: Shield,
    iconColor: "#3DBA8C",
    bg: "radial-gradient(ellipse at center, rgba(61,186,140,0.1) 0%, transparent 70%)",
    tag: "onboarding.slides.1.tag",
    title: "onboarding.slides.1.title",
    description: "onboarding.slides.1.description",
    visual: (
      <div className="relative flex items-center justify-center w-48 h-48">
        <motion.div
          className="w-28 h-28 rounded-3xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(61,186,140,0.15) 0%, rgba(61,186,140,0.05) 100%)",
            border: "1px solid rgba(61,186,140,0.35)",
            boxShadow: "0 0 30px rgba(61,186,140,0.2)",
          }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Shield size={48} style={{ color: "#3DBA8C" }} />
        </motion.div>
        {/* Lock marks */}
        {[-40, 40].map((x) =>
          [-40, 40].map((y) => (
            <motion.div
              key={`${x}-${y}`}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                background: "rgba(61,186,140,0.4)",
                transform: "translate(-50%, -50%)",
              }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, delay: Math.abs(x + y) * 0.01 }}
            />
          ))
        )}
      </div>
    ),
  },
  {
    id: 2,
    icon: Zap,
    iconColor: "#4A90D9",
    bg: "radial-gradient(ellipse at center, rgba(74,144,217,0.1) 0%, transparent 70%)",
    tag: "onboarding.slides.2.tag",
    title: "onboarding.slides.2.title",
    description: "onboarding.slides.2.description",
    visual: (
      <div className="relative flex items-center justify-center w-48 h-48">
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(74,144,217,0.15) 0%, rgba(74,144,217,0.05) 100%)",
            border: "1px solid rgba(74,144,217,0.35)",
            boxShadow: "0 0 30px rgba(74,144,217,0.2)",
          }}
        >
          <Zap size={48} style={{ color: "#4A90D9" }} />
        </div>
        {/* Speed lines */}
        {[-30, -15, 0, 15, 30].map((y, i) => (
          <motion.div
            key={y}
            className="absolute rounded-full"
            style={{
              top: `calc(50% + ${y}px)`,
              height: "1.5px",
              background: "rgba(74,144,217,0.5)",
              transformOrigin: "right center",
            }}
            animate={{ width: [0, 32, 0], opacity: [0, 1, 0], right: ["50%", "60%", "70%"] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.18, ease: "easeOut" }}
          />
        ))}
      </div>
    ),
  },
];

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else navigate("/auth");
  };

  const skip = () => navigate("/auth");

  const slide = slides[current];

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{ height: "calc(100vh - 44px)", minHeight: "800px", background: "#060608" }}
    >
      {/* Background glow */}
      <motion.div
        key={current}
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0" style={{ background: slide.bg }} />
      </motion.div>

      {/* Skip button */}
      <div className="flex justify-end px-6 pt-3 pb-0 relative z-10">
        <button onClick={skip} className="text-[14px] font-medium px-3 py-1.5 rounded-full" style={{ color: "#6B6B84" }}>
          {t("onboarding.skip")}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-between px-8 pb-10 relative z-10">
        {/* Visual */}
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {slide.visual}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Text content */}
        <div className="w-full flex flex-col gap-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              className="flex flex-col gap-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Tag */}
              <div className="flex justify-center">
                <span
                  className="text-[11px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
                  style={{
                    color: slide.iconColor,
                    background: `${slide.iconColor}18`,
                    border: `1px solid ${slide.iconColor}30`,
                    letterSpacing: "0.15em",
                  }}
                >
                  {t(slide.tag)}
                </span>
              </div>

              {/* Title */}
              <h1
                className="text-center"
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                  color: "#F0F0FA",
                  whiteSpace: "pre-line",
                }}
              >
                {t(slide.title)}
              </h1>

              {/* Description */}
              <p className="text-center text-[15px] leading-relaxed" style={{ color: "#8A8A9E", fontWeight: 400 }}>
                {t(slide.description)}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress + CTA */}
          <div className="flex flex-col gap-5">
            {/* Dots */}
            <div className="flex items-center justify-center gap-2">
              {slides.map((_, i) => (
                <motion.div
                  key={i}
                  className="rounded-full cursor-pointer"
                  onClick={() => setCurrent(i)}
                  animate={{
                    width: i === current ? 24 : 8,
                    background: i === current ? "#C9A84C" : "rgba(255,255,255,0.2)",
                  }}
                  style={{ height: 8 }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={next}
              className="relative w-full py-4 rounded-2xl flex items-center justify-center gap-2 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)",
                backgroundSize: "200% 100%",
                color: "#060608",
                fontWeight: 700,
                fontSize: "16px",
                letterSpacing: "0.01em",
                boxShadow: "0 0 30px rgba(201,168,76,0.35), 0 4px 20px rgba(0,0,0,0.4)",
              }}
            >
              {current < slides.length - 1 ? (
                <>
                  {t("onboarding.next")}
                  <ChevronRight size={20} />
                </>
              ) : (
                t("onboarding.start")
              )}
            </button>

            {current === slides.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-[12px]"
                style={{ color: "#6B6B84" }}
              >
                {t("onboarding.consent_prefix")}{" "}
                <span style={{ color: "#C9A84C" }}>{t("onboarding.privacy_policy")}</span> {t("onboarding.consent_suffix")}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
