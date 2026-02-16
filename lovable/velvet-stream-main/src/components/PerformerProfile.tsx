import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, Heart, Clock, BadgeCheck } from "lucide-react";
import type { Performer } from "@/data/performers";
import { performers } from "@/data/performers";

interface PerformerProfileProps {
  performer: Performer;
  open: boolean;
  onClose: () => void;
}

const PerformerProfile = ({ performer, open, onClose }: PerformerProfileProps) => {
  const similar = performers.filter((p) => p.id !== performer.id).slice(0, 4);

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

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[80%] max-w-[380px] glass grain overflow-y-auto"
          >
            <div className="relative z-10 p-6 flex flex-col gap-6">
              {/* Close */}
              <button onClick={onClose} className="self-end btn-press">
                <X size={24} className="text-foreground/70" />
              </button>

              {/* Avatar & name */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-foreground">
                  {performer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-foreground">{performer.name}</span>
                  {performer.verified && <BadgeCheck size={18} className="text-primary fill-primary/20" />}
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
                  <span className="text-sm font-semibold text-foreground tabular-nums">{performer.viewers.toLocaleString()}</span>
                  <span className="text-[10px] text-[hsl(var(--text-tertiary))]">watching</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Heart size={16} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground tabular-nums">{performer.likes}</span>
                  <span className="text-[10px] text-[hsl(var(--text-tertiary))]">likes</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Clock size={16} className="text-accent" />
                  <span className="text-sm font-semibold text-foreground tabular-nums">{performer.onlineTime}</span>
                  <span className="text-[10px] text-[hsl(var(--text-tertiary))]">online</span>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm text-[hsl(var(--text-secondary))] text-center leading-relaxed">
                {performer.bio}
              </p>

              {/* CTA */}
              <button className="btn-press w-full h-14 rounded-full bg-primary text-primary-foreground font-bold text-base uppercase tracking-wider glow-primary">
                Watch Her Live →
              </button>

              {/* Similar */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold text-[hsl(var(--text-tertiary))] uppercase tracking-wider">Similar Performers</span>
                <div className="flex gap-3">
                  {similar.map((s) => (
                    <div key={s.id} className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-xs font-bold text-foreground">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[10px] text-[hsl(var(--text-tertiary))] truncate max-w-[56px]">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PerformerProfile;
