import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fetchPoolStats } from "@/services/api";

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen = ({ onStart }: StartScreenProps) => {
  const [viewerCount, setViewerCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stats = await fetchPoolStats();
        if (active) setViewerCount(stats.total_viewers);
      } catch { /* silent — will show fallback */ }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 animate-gradient-shift grain"
        style={{
          background: "linear-gradient(135deg, #0a0015 0%, #0d1b2a 25%, #1a0a2e 50%, #0a1628 75%, #0a0015 100%)",
          backgroundSize: "400% 400%",
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col items-center gap-10 px-8 w-full"
      >
        {/* Online counter */}
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--text-secondary))]">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse-live" />
          <span className="tabular-nums font-medium">
            {viewerCount !== null ? `${viewerCount.toLocaleString()} live now` : "Live now"}
          </span>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-5xl font-black tracking-tight">
            <span className="text-foreground">xcam</span>
            <span className="text-primary">.</span>
            <span className="text-primary drop-shadow-[0_0_16px_hsla(348,99%,58%,0.6)]">vip</span>
          </h1>
          <p className="text-sm font-medium text-[hsl(var(--text-tertiary))] tracking-[0.2em] uppercase">
            Live. Random. Real.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 w-full mt-4">
          <button
            onClick={onStart}
            className="btn-press w-[85%] max-w-[400px] h-14 rounded-full bg-primary text-primary-foreground font-bold text-base uppercase tracking-wider glow-primary"
          >
            Start Watching
          </button>
          <p className="text-xs text-[hsl(var(--text-tertiary))]">
            Free. No signup required.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default StartScreen;
