import { useState } from "react";
import { motion } from "framer-motion";

interface AgeGateProps {
  onEnter: () => void;
}

const AgeGate = ({ onEnter }: AgeGateProps) => {
  const [remember, setRemember] = useState(false);

  const handleEnter = () => {
    if (remember) {
      document.cookie = "xcam_age_verified=true;max-age=31536000;path=/;SameSite=Strict;Secure";
    }
    onEnter();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background grain">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass rounded-3xl p-8 mx-4 w-full max-w-[380px] flex flex-col items-center gap-6 text-center relative z-10"
      >
        {/* Logo image */}
        <img
          src="/logo.png"
          alt="xcam.vip"
          className="h-10 object-contain"
        />

        {/* Warning */}
        <div>
          <p className="text-[15px] font-semibold text-foreground mb-2">
            Age Verification Required
          </p>
          <p className="text-[13px] text-[hsl(var(--text-secondary))] leading-relaxed">
            This website contains adult content and is only suitable for those 18 years or older.
          </p>
        </div>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          className="btn-press w-full h-13 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-[15px] tracking-wide glow-primary"
        >
          I am 18 or older — Enter
        </button>

        {/* Leave button */}
        <a
          href="https://google.com"
          className="btn-press w-full py-3 rounded-full border border-[rgba(255,255,255,0.12)] text-[14px] text-[hsl(var(--text-secondary))] font-medium hover:bg-white/5 transition-colors text-center"
        >
          Leave this site
        </a>

        {/* Remember me */}
        <label className="flex items-center gap-2.5 cursor-pointer text-[hsl(var(--text-tertiary))] text-[12px]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-transparent accent-primary"
          />
          Don't ask me again
        </label>

        {/* Legal links */}
        <div className="flex items-center gap-3 pt-2 border-t border-[rgba(255,255,255,0.06)] w-full justify-center">
          <a href="/legal/privacy" className="text-[10px] text-[hsl(var(--text-tertiary))] hover:text-foreground/60 transition-colors">
            Privacy
          </a>
          <span className="text-[10px] text-[hsl(var(--text-tertiary))]">·</span>
          <a href="/legal/terms" className="text-[10px] text-[hsl(var(--text-tertiary))] hover:text-foreground/60 transition-colors">
            Terms
          </a>
          <span className="text-[10px] text-[hsl(var(--text-tertiary))]">·</span>
          <a href="/legal/2257" className="text-[10px] text-[hsl(var(--text-tertiary))] hover:text-foreground/60 transition-colors">
            18 USC 2257
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default AgeGate;
