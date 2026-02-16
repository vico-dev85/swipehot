import { useState } from "react";
import { motion } from "framer-motion";

interface AgeGateProps {
  onEnter: () => void;
}

const AgeGate = ({ onEnter }: AgeGateProps) => {
  const [remember, setRemember] = useState(false);

  const handleEnter = () => {
    if (remember) {
      document.cookie = "xcam_age_verified=true;max-age=31536000;path=/";
    }
    onEnter();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background grain">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-8 px-8 text-center relative z-10"
      >
        {/* Logo */}
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-foreground">xcam</span>
          <span className="text-primary">.</span>
          <span className="text-primary drop-shadow-[0_0_12px_hsla(348,99%,58%,0.5)]">vip</span>
        </h1>

        <p className="text-sm text-[hsl(var(--text-secondary))] max-w-[280px]">
          This website contains age-restricted content.
        </p>

        {/* CTA */}
        <button
          onClick={handleEnter}
          className="btn-press w-full max-w-[320px] h-14 rounded-full bg-primary text-primary-foreground font-bold text-base tracking-wide glow-primary"
        >
          I am 18+ — Enter
        </button>

        {/* Remember me */}
        <label className="flex items-center gap-2 cursor-pointer text-[hsl(var(--text-tertiary))] text-xs">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-transparent accent-primary"
          />
          Remember me
        </label>

        <a href="https://google.com" className="text-xs text-[hsl(var(--text-tertiary))] hover:text-foreground transition-colors">
          Leave
        </a>
      </motion.div>
    </div>
  );
};

export default AgeGate;
