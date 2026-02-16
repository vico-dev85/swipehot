import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { BadgeCheck, ChevronUp, Heart } from "lucide-react";
import { performers, type Performer } from "@/data/performers";
import TopBar from "@/components/TopBar";
import ActionStack from "@/components/ActionStack";
import PerformerProfile from "@/components/PerformerProfile";
import GenderFilterSheet from "@/components/GenderFilterSheet";

const SWIPE_THRESHOLD = 50;

const RouletteView = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showHint, setShowHint] = useState(true);
  const [heartAnim, setHeartAnim] = useState<{ x: number; y: number } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lastTapRef = useRef<number>(0);

  const performer = performers[currentIndex];

  const goNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setShowHint(false);
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % performers.length);
    setTimeout(() => setIsTransitioning(false), 400);
  }, [isTransitioning]);

  const goPrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + performers.length) % performers.length);
    setTimeout(() => setIsTransitioning(false), 400);
  }, [isTransitioning]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y < -SWIPE_THRESHOLD) goNext();
    else if (info.offset.y > SWIPE_THRESHOLD) goPrev();
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.changedTouches[0].clientY : e.clientY;
      setHeartAnim({ x: clientX - rect.left, y: clientY - rect.top });
      setLikedIds((prev) => new Set(prev).add(performer.id));
      setTimeout(() => setHeartAnim(null), 800);
    }
    lastTapRef.current = now;
  };

  // Keyboard nav for desktop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowRight") goNext();
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const variants = {
    enter: (d: number) => ({ y: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (d: number) => ({ y: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 bg-background overflow-hidden select-none">
      {/* Video / gradient placeholder */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={performer.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", damping: 28, stiffness: 260, mass: 0.8 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          onClick={handleDoubleTap}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{ background: performer.gradient }}
        >
          {/* Shimmer overlay to simulate video texture */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent animate-shimmer" />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Heart double-tap animation */}
      <AnimatePresence>
        {heartAnim && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none fixed z-50 animate-heart-burst"
            style={{ left: heartAnim.x - 40, top: heartAnim.y - 40 }}
          >
            <Heart size={80} className="fill-primary text-primary drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-[35vh] gradient-bottom pointer-events-none" />
      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-24 gradient-top pointer-events-none" />

      {/* Top Bar */}
      <TopBar activeFilter={activeFilter} onFilterChange={setActiveFilter} onOpenFilter={() => setFilterOpen(true)} />

      {/* Right action stack */}
      <div className="fixed right-4 bottom-[180px] z-20 lg:bottom-[200px]">
        <ActionStack
          performer={performer}
          liked={likedIds.has(performer.id)}
          onLike={() => setLikedIds((prev) => {
            const next = new Set(prev);
            if (next.has(performer.id)) next.delete(performer.id);
            else next.add(performer.id);
            return next;
          })}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
          onProfile={() => setProfileOpen(true)}
        />
      </div>

      {/* Bottom-left info block */}
      <div className="fixed left-4 bottom-[100px] z-20 max-w-[65%] lg:bottom-[120px]">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[17px] font-bold text-foreground text-overlay">{performer.name}</span>
          {performer.verified && <BadgeCheck size={16} className="text-primary fill-primary/20" />}
        </div>
        <p className="text-[11px] font-medium text-[hsl(var(--text-secondary))] text-overlay uppercase tracking-[0.05em] mb-1">
          {performer.tags.join(" • ")}
        </p>
        <p className="text-[13px] text-[hsl(var(--text-secondary))] text-overlay line-clamp-2">
          {performer.bio}
          <span className="text-foreground/50 ml-1 cursor-pointer">...more</span>
        </p>
      </div>

      {/* Primary CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-4 lg:pb-6" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <button className="btn-press w-[85%] max-w-[400px] lg:w-[70%] h-14 rounded-full bg-primary text-primary-foreground font-bold text-base uppercase tracking-[0.04em] glow-primary">
          Watch Her Live →
        </button>
      </div>

      {/* Swipe hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-[86px] z-20 flex flex-col items-center gap-1 pointer-events-none"
          >
            <ChevronUp size={20} className="text-foreground/40 animate-bounce-arrow" />
            <span className="text-[11px] text-[hsl(var(--text-tertiary))]">Swipe up for next</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performer Profile Panel */}
      <PerformerProfile performer={performer} open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Gender Filter Sheet */}
      <GenderFilterSheet open={filterOpen} active={activeFilter} onSelect={setActiveFilter} onClose={() => setFilterOpen(false)} />
    </div>
  );
};

export default RouletteView;
