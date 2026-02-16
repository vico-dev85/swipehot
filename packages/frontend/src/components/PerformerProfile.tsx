import { useRef } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { X, Eye, Heart, Clock, BadgeCheck } from "lucide-react";
import type { PerformerData } from "@/services/api";

interface PerformerProfileProps {
  performer: PerformerData;
  open: boolean;
  onClose: () => void;
}

const PerformerProfile = ({ performer, open, onClose }: PerformerProfileProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const panelWidth = panelRef.current?.offsetWidth ?? 300;
    if (info.offset.x > panelWidth * 0.3 || info.velocity.x > 500) {
      onClose();
    }
  };

  // CTA text based on gender
  const ctaText = performer.gender === "c" ? "Watch Them Live →" :
    performer.gender === "m" ? "Watch Him Live →" : "Watch Her Live →";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/50"
            onClick={onClose}
          />

          {/* Panel — swipe right to dismiss */}
          <motion.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="x"
            dragConstraints={{ left: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed top-0 right-0 bottom-0 z-50 w-[80%] max-w-[380px] glass grain overflow-y-auto"
          >
            <div className="relative z-10 p-6 flex flex-col gap-6">
              {/* Close */}
              <button onClick={onClose} className="self-end btn-press">
                <X size={24} className="text-foreground/70" />
              </button>

              {/* Avatar & name */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-foreground overflow-hidden">
                  {performer.image_url ? (
                    <img src={performer.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    performer.display_name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-foreground">{performer.username}</span>
                  {performer.is_hd && <BadgeCheck size={18} className="text-primary fill-primary/20" />}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap justify-center gap-2">
                {performer.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full border border-primary/40 text-primary text-xs font-medium uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-6 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Eye size={16} className="text-secondary" />
                  <span className="text-sm font-semibold text-foreground tabular-nums">{performer.num_users.toLocaleString()}</span>
                  <span className="text-[10px] text-[hsl(var(--text-tertiary))]">watching</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Heart size={16} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground tabular-nums">{performer.tags.length}</span>
                  <span className="text-[10px] text-[hsl(var(--text-tertiary))]">tags</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Clock size={16} className="text-accent" />
                  <span className="text-sm font-semibold text-foreground tabular-nums">{performer.age ?? "—"}</span>
                  <span className="text-[10px] text-[hsl(var(--text-tertiary))]">age</span>
                </div>
              </div>

              {/* Bio / room subject */}
              <p className="text-sm text-[hsl(var(--text-secondary))] text-center leading-relaxed">
                {performer.room_subject}
              </p>

              {/* CTA */}
              <a
                href={performer.room_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-press w-full h-14 rounded-full bg-primary text-primary-foreground font-bold text-base uppercase tracking-wider glow-primary flex items-center justify-center"
              >
                {ctaText}
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PerformerProfile;
