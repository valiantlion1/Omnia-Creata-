import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Check, Zap, Crown, Building2, Star,
  Gift, Sparkles, Shield, Users, ChevronRight, X
} from "lucide-react";

export function PricingScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [selectedPack, setSelectedPack] = useState<number | null>(null);

  const plans = useMemo(() => [
    {
      id: "free",
      name: t("pricing.plans.free.name"),
      price: "₺0",
      period: "",
      tag: null,
      tagColor: null,
      color: "#8A8A9E",
      borderColor: "rgba(255,255,255,0.08)",
      bgColor: "rgba(255,255,255,0.03)",
      icon: Sparkles,
      description: t("pricing.plans.free.description"),
      features: [
        { text: t("pricing.plans.free.features.credits"), included: true },
        { text: t("pricing.plans.free.features.upscale"), included: true },
        { text: t("pricing.plans.free.features.filters"), included: true },
        { text: t("pricing.plans.free.features.ads"), included: true },
        { text: t("pricing.plans.free.features.badge"), included: true, note: t("pricing.required_note") },
        { text: t("pricing.plans.free.features.cloud"), included: false },
        { text: t("pricing.plans.free.features.upscale_pro"), included: false },
        { text: t("pricing.plans.free.features.gpu"), included: false },
        { text: t("pricing.plans.free.features.batch"), included: false },
      ],
      cta: t("pricing.plans.free.cta"),
      ctaDisabled: true,
    },
    {
      id: "pro",
      name: t("pricing.plans.pro.name"),
      price: "₺299",
      priceYearly: "₺2.399",
      period: t("pricing.billing.per_month"),
      tag: t("pricing.plans.pro.tag"),
      tagColor: "#C9A84C",
      color: "#C9A84C",
      borderColor: "rgba(201,168,76,0.35)",
      bgColor: "rgba(201,168,76,0.06)",
      icon: Crown,
      description: t("pricing.plans.pro.description"),
      features: [
        { text: t("pricing.plans.pro.features.credits"), included: true },
        { text: t("pricing.plans.pro.features.modules"), included: true },
        { text: t("pricing.plans.pro.features.upscale"), included: true },
        { text: t("pricing.plans.pro.features.gpu"), included: true },
        { text: t("pricing.plans.pro.features.batch"), included: true },
        { text: t("pricing.plans.pro.features.no_badge"), included: true },
        { text: t("pricing.plans.pro.features.cloud"), included: true },
        { text: t("pricing.plans.pro.features.style"), included: true },
        { text: t("pricing.plans.pro.features.no_ads"), included: true },
      ],
      cta: t("pricing.plans.pro.cta"),
      ctaDisabled: false,
    },
    {
      id: "enterprise",
      name: t("pricing.plans.enterprise.name"),
      price: t("pricing.custom_price"),
      period: "",
      tag: t("pricing.plans.enterprise.tag"),
      tagColor: "#4A90D9",
      color: "#4A90D9",
      borderColor: "rgba(74,144,217,0.25)",
      bgColor: "rgba(74,144,217,0.05)",
      icon: Building2,
      description: t("pricing.plans.enterprise.description"),
      features: [
        { text: t("pricing.plans.enterprise.features.licenses"), included: true },
        { text: t("pricing.plans.enterprise.features.api"), included: true },
        { text: t("pricing.plans.enterprise.features.white_label"), included: true },
        { text: t("pricing.plans.enterprise.features.sla"), included: true },
        { text: t("pricing.plans.enterprise.features.gpu"), included: true },
        { text: t("pricing.plans.enterprise.features.admin"), included: true },
        { text: t("pricing.plans.enterprise.features.analytics"), included: true },
        { text: t("pricing.plans.enterprise.features.support"), included: true },
        { text: t("pricing.plans.enterprise.features.integrations"), included: true },
      ],
      cta: t("pricing.plans.enterprise.cta"),
      ctaDisabled: false,
    },
  ], [t]);

  const creditPacks = useMemo(() => [
    { amount: 50, price: "₺89", perCredit: "₺1.78", label: t("pricing.credit_packs.pack_50") },
    { amount: 200, price: "₺239", perCredit: "₺1.19", popular: true, label: t("pricing.credit_packs.pack_200") },
    { amount: 1000, price: "₺599", perCredit: "₺0.60", label: t("pricing.credit_packs.pack_1000") },
  ], [t]);

  return (
    <div className="flex flex-col" style={{ background: "#060608", minHeight: "100%" }}>
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80"
          style={{
            background: "radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <ArrowLeft size={18} style={{ color: "#F0F0FA" }} />
        </button>
        <div className="text-center">
          <span className="text-[15px] font-bold" style={{ color: "#F0F0FA" }}>
            {t("pricing.header_title")}
          </span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div className="flex-1 overflow-y-auto omnia-scroll relative z-10">
        {/* Hero */}
        <div className="px-5 py-4 text-center">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4"
            style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)" }}
          >
            <Crown size={13} style={{ color: "#C9A84C" }} />
            <span className="text-[12px] font-semibold" style={{ color: "#C9A84C" }}>
              {t("common.pro")}
            </span>
          </div>
          <h1
            className="text-[26px] mb-2"
            style={{ fontWeight: 800, color: "#F0F0FA", letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            {t("pricing.title")}{"\n"}
            <span
              style={{
                background: "linear-gradient(135deg, #E8C97A 0%, #C9A84C 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              OmniaPixels
            </span>
          </h1>
          <p className="text-[14px]" style={{ color: "#8A8A9E" }}>
            {t("pricing.subtitle")}
          </p>
        </div>

        {/* Billing toggle */}
        <div className="px-5 mb-5">
          <div
            className="flex p-1 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  background: billing === b ? "rgba(201,168,76,0.15)" : "transparent",
                  color: billing === b ? "#C9A84C" : "#6B6B84",
                  border: billing === b ? "1px solid rgba(201,168,76,0.25)" : "1px solid transparent",
                }}
              >
                {b === "monthly" ? t("pricing.billing.monthly") : (
                  <>
                    {t("pricing.billing.yearly")}
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(61,186,140,0.2)", color: "#3DBA8C" }}
                    >
                      {t("pricing.billing.discount")}
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="px-5 flex flex-col gap-3 mb-6">
          {plans.map((plan, idx) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            const displayPrice = billing === "yearly" && plan.priceYearly ? plan.priceYearly : plan.price;
            const displayPeriod = billing === "yearly" && plan.priceYearly ? t("pricing.billing.per_year") : plan.period;

            return (
              <motion.button
                key={plan.id}
                onClick={() => {
                  if (!plan.ctaDisabled) {
                    setSelectedPlan(plan.id);
                    // Mock payment logic
                    if (plan.id === "pro" || plan.id === "enterprise") {
                      // In a real app, this would open a payment modal
                      console.log(`Plan selected: ${plan.id} (${billing})`);
                    }
                  }
                }}
                className="relative text-left rounded-2xl p-4 overflow-hidden"
                style={{
                  background: isSelected ? plan.bgColor : "rgba(255,255,255,0.02)",
                  border: isSelected
                    ? `1.5px solid ${plan.borderColor}`
                    : "1px solid rgba(255,255,255,0.07)",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Popular tag */}
                {plan.tag && (
                  <div
                    className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ background: `${plan.tagColor}20`, color: plan.tagColor, border: `1px solid ${plan.tagColor}30` }}
                  >
                    {plan.tag}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${plan.color}18`, border: `1px solid ${plan.color}30` }}
                  >
                    <Icon size={20} style={{ color: plan.color }} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[22px] font-extrabold" style={{ color: "#F0F0FA" }}>
                        {displayPrice}
                      </span>
                      {displayPeriod && (
                        <span className="text-[13px]" style={{ color: "#8A8A9E" }}>{displayPeriod}</span>
                      )}
                    </div>
                    <p className="text-[12px]" style={{ color: "#6B6B84" }}>{plan.description}</p>
                  </div>
                </div>

                {/* Features (show top 4) */}
                <div className="flex flex-col gap-1.5 mb-3">
                  {plan.features.slice(0, 4).map((f) => (
                    <div key={f.text} className="flex items-center gap-2">
                      {f.included ? (
                        <Check size={13} style={{ color: plan.color, flexShrink: 0 }} />
                      ) : (
                        <X size={13} style={{ color: "#6B6B84", flexShrink: 0 }} />
                      )}
                      <span className="text-[12px]" style={{ color: f.included ? "#A0A0B8" : "#6B6B84" }}>
                        {f.text}
                        {f.note && (
                          <span className="text-[10px] ml-1" style={{ color: "#E8A830" }}>({f.note})</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div
                  className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2"
                  style={{
                    background: plan.ctaDisabled
                      ? "rgba(255,255,255,0.04)"
                      : plan.id === "pro"
                      ? "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)"
                      : `${plan.color}18`,
                    color: plan.ctaDisabled ? "#6B6B84" : plan.id === "pro" ? "#060608" : plan.color,
                    fontWeight: 700,
                    fontSize: "13px",
                    border: plan.ctaDisabled ? "1px solid rgba(255,255,255,0.07)" : "none",
                    boxShadow: plan.id === "pro" && !plan.ctaDisabled ? "0 0 20px rgba(201,168,76,0.25)" : "none",
                  }}
                >
                  {plan.cta}
                  {!plan.ctaDisabled && <ChevronRight size={14} />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="px-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6B6B84" }}>
              {t("pricing.or_buy_credits")}
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        </div>

        {/* Credit packs */}
        <div className="px-5 mb-6">
          <div className="flex gap-2">
            {creditPacks.map((pack) => (
              <motion.button
                key={pack.amount}
                onClick={() => {
                  setSelectedPack(pack.amount);
                  // Mock purchase logic
                  console.log(`Pack selected: ${pack.amount} credits`);
                }}
                className="flex-1 rounded-2xl p-3 text-center relative"
                style={{
                  background: selectedPack === pack.amount
                    ? "rgba(201,168,76,0.14)"
                    : pack.popular ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.03)",
                  border: selectedPack === pack.amount
                    ? "1px solid rgba(201,168,76,0.45)"
                    : pack.popular ? "1px solid rgba(201,168,76,0.25)" : "1px solid rgba(255,255,255,0.07)",
                }}
                whileTap={{ scale: 0.97 }}
              >
                {pack.popular && (
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: "#C9A84C", color: "#060608" }}
                  >
                    {t("pricing.popular")}
                  </div>
                )}
                <div className="text-[22px] font-extrabold" style={{ color: pack.popular ? "#C9A84C" : "#F0F0FA" }}>
                  {pack.amount}
                </div>
                <div className="text-[10px] mb-1" style={{ color: "#6B6B84" }}>{t("common.credits").toLowerCase()}</div>
                <div className="text-[14px] font-bold" style={{ color: "#F0F0FA" }}>{pack.price}</div>
                <div className="text-[9px] mt-0.5" style={{ color: "#6B6B84" }}>{pack.perCredit}/{t("common.credits").toLowerCase()}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Trust signals */}
        <div className="px-5 mb-6">
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Shield, label: t("pricing.trust.secure_payment"), desc: t("pricing.trust.secure_payment_desc"), color: "#3DBA8C" },
              { icon: Star, label: t("pricing.trust.cancel_anytime"), desc: t("pricing.trust.cancel_anytime_desc"), color: "#C9A84C" },
              { icon: Gift, label: t("pricing.trust.referral"), desc: t("pricing.trust.referral_desc"), color: "#B07DD9" },
            ].map((t) => (
              <div
                key={t.label}
                className="rounded-xl p-3 flex flex-col items-center gap-1.5 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <t.icon size={16} style={{ color: t.color }} />
                <span className="text-[10px] font-semibold" style={{ color: "#F0F0FA" }}>{t.label}</span>
                <span className="text-[9px]" style={{ color: "#6B6B84" }}>{t.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ecosystem banner */}
        <div className="px-5 mb-8">
          <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(74,144,217,0.06) 100%)", border: "1px solid rgba(201,168,76,0.15)" }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none"
              style={{ background: "linear-gradient(to left, rgba(201,168,76,0.06), transparent)" }} />
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} style={{ color: "#C9A84C" }} />
              <span className="text-[12px] font-semibold" style={{ color: "#C9A84C" }}>{t("pricing.ecosystem_pass")}</span>
            </div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: "#F0F0FA" }}>
              {t("pricing.ecosystem_apps")}
            </p>
            <p className="text-[12px]" style={{ color: "#8A8A9E" }}>
              {t("pricing.ecosystem_soon")}
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-[12px] font-semibold" style={{ color: "#C9A84C" }}>{t("pricing.early_access")}</span>
              <ChevronRight size={12} style={{ color: "#C9A84C" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
