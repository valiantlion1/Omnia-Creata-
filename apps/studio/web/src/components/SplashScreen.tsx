import { motion } from 'framer-motion'

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4"
      >
        <motion.img
          src="/omnia-crest.png"
          alt="Omnia Creata"
          width={280}
          height={280}
          className="rounded-none select-none"
          initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-[28px] font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 [text-shadow:0_0_18px_rgba(212,175,55,0.45)]"
        >
          Omnia Creata Studio
        </motion.span>
      </motion.div>

      {/* subtle animated vignette glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,167,45,0.12),transparent_60%)]" />
    </div>
  )
}