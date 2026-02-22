import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { BadgeCheck, ChevronDown, ChevronUp, Heart, Loader2, MessageCircle, SkipForward, UserPlus, Volume2 } from "lucide-react";
import { buildInfoLine } from "@/lib/performer-info";
import { fetchNextPerformer, type PerformerData } from "@/services/api";
import { createIframeManager, type IframeManager } from "@/services/iframe-manager";
import {
  updatePreferences,
  getPreferredTags,
  getGenderWeights,
  isBored,
  hasShownFirstLikeFeedback,
  markFirstLikeFeedbackShown,
} from "@/services/brain";
import { getCTAState, type CTAState } from "@/services/cta-timing";
import { tracker } from "@/services/tracker";
import { getVariant } from "@/services/ab";
import TopBar from "@/components/TopBar";
import ActionStack from "@/components/ActionStack";
import PerformerProfile from "@/components/PerformerProfile";
import GenderFilterSheet from "@/components/GenderFilterSheet";
import ThumbnailOverlay from "@/components/ThumbnailOverlay";
import { playSwipe, playLike, playClick } from "@/services/sounds";

const SWIPE_DISTANCE_RATIO = 0.2;
const SWIPE_VELOCITY = 2000;
const DOUBLE_TAP_HINT_DELAY = 8000;

// A/B testable overlay timeout (default 5s)
const OVERLAY_TIMEOUT_MAP: Record<string, number> = {
  fast: 3000,
  normal: 5000,
  slow: 8000,
};

// A/B testable CTA delay multiplier
const CTA_DELAY_MAP: Record<string, number> = {
  fast: 0.5,    // CTA at 15s instead of 30s
  normal: 1,    // CTA at 30s (default)
  slow: 2,      // CTA at 60s
};

const RouletteView = () => {
  const [current, setCurrent] = useState<PerformerData | null>(null);
  const [previous, setPrevious] = useState<PerformerData | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [soundPromptOpen, setSoundPromptOpen] = useState(false);
  const [chatPromptOpen, setChatPromptOpen] = useState(false);
  const [followPromptOpen, setFollowPromptOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(() => {
    // A/B test: gender_default — start on "all" or "f" (female)
    const genderVariant = getVariant("gender_default");
    return genderVariant === "female" ? "f" : "all";
  });
  const [showDoubleTapHint, setShowDoubleTapHint] = useState(false);
  const swipeHintCountRef = useRef(0); // how many performers seen (hint shows on first 2)
  const [overlaysVisible, setOverlaysVisible] = useState(true);
  const [heartAnim, setHeartAnim] = useState<{ x: number; y: number } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const lastTapRef = useRef<number>(0);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const nextRef = useRef<PerformerData | null>(null);
  const filterRef = useRef(activeFilter);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const iframeManagerRef = useRef<IframeManager | null>(null);
  const doubleTapHintShownRef = useRef(
    typeof window !== "undefined" && sessionStorage.getItem("xcam_dth") === "1"
  );
  const hasLikedRef = useRef(false);
  const autoSkipRef = useRef(false);
  const iframeHandledRef = useRef(false); // true when goNext/goPrev/filter already managed the iframe
  const watchStartRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  const [firstLikeToast, setFirstLikeToast] = useState(false);
  const [ctaState, setCTAState] = useState<CTAState>({
    phase: "hidden",
    ctaVisible: false,
    ctaText: "Watch Her Live",
    ctaSubtext: null,
  });

  filterRef.current = activeFilter;

  // Get watch duration and reset timer
  const getWatchSeconds = useCallback(() => {
    const elapsed = (Date.now() - watchStartRef.current) / 1000;
    watchStartRef.current = Date.now();
    return elapsed;
  }, []);

  // Record brain signal for the current performer
  const recordBrainSignal = useCallback(
    (action: "skip" | "like" | "cta") => {
      if (!current) return;
      const watchSeconds = getWatchSeconds();
      updatePreferences(current.tags, action, watchSeconds, current.gender, current.age, current.country);
    },
    [current, getWatchSeconds]
  );

  // Wake Lock — keep screen awake while watching streams
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch { /* user denied or not supported */ }
    };

    // Re-acquire lock when returning to tab (browser releases on tab switch)
    const onVisibility = () => {
      if (document.visibilityState === "visible") requestLock();
    };

    requestLock();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      wakeLock?.release();
    };
  }, []);

  // Initialize iframe manager (created once, mounted when container is available)
  useEffect(() => {
    const manager = createIframeManager();
    iframeManagerRef.current = manager;
    return () => {
      manager.destroy();
      iframeManagerRef.current = null;
    };
  }, []);

  // Mount iframes into container once it exists (after loading spinner goes away)
  useEffect(() => {
    if (!loading && iframeContainerRef.current && iframeManagerRef.current) {
      iframeManagerRef.current.mount(iframeContainerRef.current);
    }
  }, [loading]);

  // React to current performer changes — tracking, thumbnail, auto-skip timer
  // Iframe loading is handled by the caller (goNext/goPrev/filter/initial load)
  useEffect(() => {
    if (!current || !iframeManagerRef.current) return;
    const manager = iframeManagerRef.current;

    // Ensure iframes are mounted (handles race with loading state)
    if (iframeContainerRef.current) {
      manager.mount(iframeContainerRef.current);
    }

    // Reset watch timer for the new performer
    watchStartRef.current = Date.now();

    // Track performer viewed
    tracker.track("performer_viewed", {
      performer_id: current.username,
      gender: current.gender,
      source: "swipe",
    });

    // Show thumbnail while iframe loads
    setShowThumbnail(true);

    // Only load iframe if not already handled by goNext/goPrev/filter
    if (!iframeHandledRef.current) {
      manager.loadActive(current.embed_url);
    }
    iframeHandledRef.current = false;

    // Hide thumbnail after stream has time to connect
    const hideTimer = setTimeout(() => setShowThumbnail(false), 3000);

    // Auto-skip: disabled — was causing premature skips on slow HLS streams
    autoSkipRef.current = false;

    return () => {
      clearTimeout(hideTimer);
    };
  }, [current]);

  // Preload next performer into ref + iframe
  const preloadNext = useCallback(async () => {
    try {
      // Pass brain's preferred tags (fewer when bored → more exploration)
      const tagCount = isBored() ? 2 : 5;
      const preferTags = getPreferredTags(tagCount);
      const data = await fetchNextPerformer(filterRef.current, preferTags);
      nextRef.current = data;
      // Preload into the inactive iframe
      if (iframeManagerRef.current && data.embed_url) {
        iframeManagerRef.current.preload(data.embed_url);
      }
    } catch {
      nextRef.current = null;
    }
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const preferTags = getPreferredTags(5);
        const data = await fetchNextPerformer(activeFilter, preferTags);
        if (!cancelled) {
          setCurrent(data);
          setLoading(false);
          // After initial load, start preloading next
          preloadNext();
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On filter change, fetch fresh performer
  const handleFilterChange = useCallback(async (filter: string) => {
    playClick();
    tracker.track("gender_filter_changed", {
      old_filter: filterRef.current,
      new_filter: filter,
    });
    setActiveFilter(filter);
    filterRef.current = filter;
    nextRef.current = null;
    setIsTransitioning(true);

    // Kill current preload
    iframeManagerRef.current?.killAll();

    try {
      const data = await fetchNextPerformer(filter);
      setPrevious(current);

      // Load new performer into iframe
      if (iframeManagerRef.current) {
        iframeManagerRef.current.loadActive(data.embed_url);
      }
      iframeHandledRef.current = true;
      setCurrent(data);

      preloadNext();
    } catch { /* stay on current */ }
    setTimeout(() => setIsTransitioning(false), 400);
  }, [current, preloadNext]);

  // --- Overlay auto-hide (A/B: overlay_timeout) ---
  const overlayTimeoutMs = OVERLAY_TIMEOUT_MAP[getVariant("overlay_timeout") ?? ""] ?? 5000;
  const resetOverlayTimer = useCallback(() => {
    setOverlaysVisible(true);
    clearTimeout(overlayTimerRef.current);
    if (overlayTimeoutMs > 0) {
      overlayTimerRef.current = setTimeout(() => {
        setOverlaysVisible(false);
      }, overlayTimeoutMs);
    }
  }, [overlayTimeoutMs]);

  useEffect(() => {
    resetOverlayTimer();
    const onInteraction = () => resetOverlayTimer();
    window.addEventListener("touchstart", onInteraction, { passive: true });
    window.addEventListener("mousemove", onInteraction, { passive: true });
    return () => {
      clearTimeout(overlayTimerRef.current);
      window.removeEventListener("touchstart", onInteraction);
      window.removeEventListener("mousemove", onInteraction);
    };
  }, [resetOverlayTimer]);

  // --- Double-tap hint ---
  useEffect(() => {
    if (doubleTapHintShownRef.current || hasLikedRef.current) return;
    const timer = setTimeout(() => {
      if (!hasLikedRef.current) {
        setShowDoubleTapHint(true);
        setTimeout(() => setShowDoubleTapHint(false), 3000);
        doubleTapHintShownRef.current = true;
        sessionStorage.setItem("xcam_dth", "1");
      }
    }, DOUBLE_TAP_HINT_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // CTA timing — update every 5s based on cumulative session time
  // A/B tests: cta_delay (timing), cta_copy (button text)
  useEffect(() => {
    const ctaCopyVariant = getVariant("cta_copy");
    const ctaCopyMap: Record<string, string> = {
      go_live: "Go Live Now",
      chat_now: "Chat Now",
    };
    const ctaDelayVariant = getVariant("cta_delay");
    const delayMultiplier = CTA_DELAY_MAP[ctaDelayVariant ?? ""] ?? 1;

    const tick = () => {
      if (!current) return;
      const sessionSeconds = (Date.now() - sessionStartRef.current) / 1000;
      const state = getCTAState(sessionSeconds, current.gender, current.num_users, delayMultiplier);
      // Apply cta_copy A/B test override
      if (ctaCopyVariant && ctaCopyMap[ctaCopyVariant]) {
        state.ctaText = ctaCopyMap[ctaCopyVariant];
      }
      setCTAState(state);
    };
    tick(); // immediate
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [current]);

  const goNext = useCallback(async () => {
    if (isTransitioning || !current) return;
    setIsTransitioning(true);
    swipeHintCountRef.current++;
    playSwipe();

    // Record skip signal for the brain
    const watchMs = (Date.now() - watchStartRef.current);
    recordBrainSignal("skip");

    // Track swipe event
    tracker.track("performer_swiped", {
      performer_id: current.username,
      direction: "up",
      time_on_performer_ms: watchMs,
    });

    // Swap preloaded next → current
    if (nextRef.current) {
      setPrevious(current);
      const next = nextRef.current;
      nextRef.current = null;

      // Iframe swap (preloaded iframe becomes active)
      iframeManagerRef.current?.swap();
      iframeHandledRef.current = true;
      setCurrent(next);

      // Start preloading the next one
      preloadNext();
    } else {
      // No preloaded — fetch inline
      try {
        const data = await fetchNextPerformer(filterRef.current);
        setPrevious(current);

        // Load directly
        if (iframeManagerRef.current) {
          iframeManagerRef.current.loadActive(data.embed_url);
        }
        iframeHandledRef.current = true;
        setCurrent(data);
        preloadNext();
      } catch { /* stay on current */ }
    }

    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning, current, preloadNext, recordBrainSignal]);

  const goPrev = useCallback(() => {
    if (isTransitioning || !previous) return;
    setIsTransitioning(true);

    // One-deep history — need to reload the previous performer's iframe
    if (iframeManagerRef.current) {
      iframeManagerRef.current.loadActive(previous.embed_url);
    }
    iframeHandledRef.current = true;
    setCurrent(previous);
    setPrevious(null);

    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning, previous]);

  // Swipe handling on the click-blocker overlay
  const handleDragEnd = (_: any, info: PanInfo) => {
    const distanceTriggered = Math.abs(info.offset.y) > window.innerHeight * SWIPE_DISTANCE_RATIO;
    const velocityTriggered = Math.abs(info.velocity.y) > SWIPE_VELOCITY;
    if (distanceTriggered || velocityTriggered) {
      if (info.offset.y < 0) goNext();
      else goPrev();
    }
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (!current) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.changedTouches[0].clientY : e.clientY;
      setHeartAnim({ x: clientX - rect.left, y: clientY - rect.top });
      setLikedIds((prev) => new Set(prev).add(current.username));
      hasLikedRef.current = true;
      setShowDoubleTapHint(false);
      setTimeout(() => setHeartAnim(null), 800);
      playLike();

      // Record like signal for the brain
      recordBrainSignal("like");

      // Track like
      tracker.track("performer_liked", {
        performer_id: current.username,
        method: "double_tap",
        time_on_performer_ms: Date.now() - watchStartRef.current,
      });

      // First-like feedback: "We'll show you more like this"
      if (!hasShownFirstLikeFeedback()) {
        markFirstLikeFeedbackShown();
        setFirstLikeToast(true);
        setTimeout(() => setFirstLikeToast(false), 2000);
      }
    }
    lastTapRef.current = now;
  };

  // Keyboard nav — guard when modals open, add Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (profileOpen) setProfileOpen(false);
        if (filterOpen) setFilterOpen(false);
        return;
      }
      if (profileOpen || filterOpen) return;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, profileOpen, filterOpen]);

  // Mouse wheel nav (desktop) — debounced to prevent rapid-fire
  const wheelCooldownRef = useRef(false);
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (profileOpen || filterOpen || wheelCooldownRef.current) return;
      if (Math.abs(e.deltaY) < 30) return; // ignore tiny scroll
      wheelCooldownRef.current = true;
      if (e.deltaY > 0) goNext();
      else goPrev();
      setTimeout(() => { wheelCooldownRef.current = false; }, 800);
    };
    window.addEventListener("wheel", handler, { passive: true });
    return () => window.removeEventListener("wheel", handler);
  }, [goNext, goPrev, profileOpen, filterOpen]);

  const overlayTransition = "opacity 0.4s ease";

  // Loading state
  if (loading || !current) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden select-none">
      <div className="desktop-wrapper">

        {/* The roulette frame — full screen on mobile, wide contained on desktop */}
        <div className="roulette-frame">
          {/* Dual iframe video container */}
          <div ref={iframeContainerRef} className="iframe-container" />

          {/* Thumbnail overlay — masks iframe loading delay */}
          <ThumbnailOverlay imageUrl={current.image_url} visible={showThumbnail} />

          {/* Click-blocker + swipe gesture layer */}
          <motion.div
            className="iframe-click-blocker"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            onClick={handleDoubleTap}
          />

          {/* Heart double-tap animation */}
          <AnimatePresence>
            {heartAnim && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="pointer-events-none absolute z-50 animate-heart-burst"
                style={{ left: heartAnim.x - 40, top: heartAnim.y - 40 }}
              >
                <Heart size={80} className="fill-primary text-primary drop-shadow-lg" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gradients */}
          <div className="absolute bottom-0 left-0 right-0 h-[35vh] gradient-bottom pointer-events-none z-[5]" />
          <div className="absolute top-0 left-0 right-0 h-24 gradient-top pointer-events-none z-[5]" />

          {/* Top Bar — inside frame, auto-hide */}
          <div className="absolute top-0 left-0 right-0 z-20" style={{ opacity: overlaysVisible ? 1 : 0, transition: overlayTransition, pointerEvents: overlaysVisible ? "auto" : "none" }}>
            <TopBar activeFilter={activeFilter} viewerCount={current.num_users} onFilterChange={handleFilterChange} onOpenFilter={() => setFilterOpen(true)} />
          </div>

          {/* Right action stack — auto-hide */}
          <div
            className="absolute right-4 bottom-[120px] z-20"
            style={{ opacity: overlaysVisible ? 1 : 0, transition: overlayTransition, pointerEvents: overlaysVisible ? "auto" : "none" }}
          >
            <ActionStack
              performer={current}
              liked={likedIds.has(current.username)}
              onLike={() => setLikedIds((prev) => {
                const next = new Set(prev);
                if (next.has(current.username)) next.delete(current.username);
                else next.add(current.username);
                return next;
              })}
              onSound={() => {
                setSoundPromptOpen(true);
                tracker.track("sound_tapped", {
                  performer_id: current.username,
                  time_on_performer_ms: Date.now() - watchStartRef.current,
                });
              }}
              onChat={() => {
                setChatPromptOpen(true);
                tracker.track("chat_tapped", {
                  performer_id: current.username,
                  time_on_performer_ms: Date.now() - watchStartRef.current,
                });
              }}
              onFollow={() => {
                setFollowPromptOpen(true);
                tracker.track("follow_tapped", {
                  performer_id: current.username,
                  time_on_performer_ms: Date.now() - watchStartRef.current,
                });
              }}
            />
          </div>

          {/* Bottom-left: LIVE badge + username — ALWAYS visible (main CTA) */}
          <div className="absolute left-4 bottom-4 z-20 max-w-[70%]">
            <div className="flex items-center gap-2 mb-1">
              <span className="live-badge">LIVE</span>
              <a
                href={current.room_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  recordBrainSignal("cta");
                  tracker.track("cta_clicked", {
                    performer_id: current.username,
                    cta_text: "username_link",
                    time_on_performer_ms: Date.now() - watchStartRef.current,
                  });
                }}
                className="text-[17px] font-bold text-foreground text-overlay hover:text-primary transition-colors"
              >{current.username}</a>
              {current.is_hd && <BadgeCheck size={16} className="text-primary fill-primary/20" />}
            </div>
            {/* Smart info line + room subject — auto-hide with overlays */}
            <div style={{ opacity: overlaysVisible ? 1 : 0, transition: overlayTransition }}>
              {(() => {
                const info = buildInfoLine(current.age, current.country, current.spoken_languages);
                if (info.hasData) {
                  return (
                    <>
                      <p className="text-[12px] text-[hsl(var(--text-secondary))] text-overlay mb-1">
                        {info.text}
                      </p>
                      <p className="text-[13px] text-[hsl(var(--text-secondary))] text-overlay line-clamp-2">
                        {current.room_subject}
                        <span className="text-foreground/50 ml-1 cursor-pointer" onClick={() => setProfileOpen(true)}>
                          ...more
                        </span>
                      </p>
                    </>
                  );
                }
                return (
                  <p className="text-[13px] text-[hsl(var(--text-secondary))] text-overlay line-clamp-2">
                    {current.room_subject}
                    <span className="text-foreground/50 ml-1 cursor-pointer" onClick={() => setProfileOpen(true)}>
                      ...more
                    </span>
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Desktop: Next button — bottom center inside frame */}
          <button onClick={goNext} className="desktop-next-btn">
            <SkipForward size={16} />
            Next
          </button>

          {/* Swipe hint (mobile) — A/B: swipe_hint (control=show, hidden=never) */}
          <AnimatePresence>
            {!overlaysVisible && swipeHintCountRef.current < 2 && getVariant("swipe_hint") !== "hidden" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute left-1/2 -translate-x-1/2 bottom-[28px] z-20 flex flex-col items-center gap-1 pointer-events-none lg:hidden"
              >
                <ChevronUp size={20} className="text-foreground/40 animate-bounce-arrow" />
                <span className="text-[11px] text-[hsl(var(--text-tertiary))]">Swipe up for next</span>
              </motion.div>
            )}
          </AnimatePresence>

        </div>{/* end roulette-frame */}

      </div>{/* end desktop-wrapper */}

      {/* Double-tap hint — centered on screen */}
      <AnimatePresence>
        {showDoubleTapHint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
          >
            <div className="glass rounded-2xl px-6 py-3 flex items-center gap-2">
              <Heart size={18} className="text-primary" />
              <span className="text-sm text-foreground font-medium">Double-tap to like</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-like feedback toast */}
      <AnimatePresence>
        {firstLikeToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed left-1/2 top-[15%] -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="glass rounded-2xl px-6 py-3 flex items-center gap-2">
              <Heart size={16} className="text-primary fill-primary" />
              <span className="text-sm text-foreground font-medium">We'll show you more like this</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversion popups — Sound / Chat / Follow */}
      <AnimatePresence>
        {(soundPromptOpen || chatPromptOpen || followPromptOpen) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/60"
              onClick={() => { setSoundPromptOpen(false); setChatPromptOpen(false); setFollowPromptOpen(false); }}
            />
            {/* Flex wrapper centers the popup without transforms (avoids Framer Motion transform conflict) */}
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-[360px] glass grain rounded-2xl overflow-hidden pointer-events-auto"
              >
                <div className="relative z-10 p-6 flex flex-col items-center gap-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                    {soundPromptOpen && <Volume2 size={24} className="text-primary" />}
                    {chatPromptOpen && <MessageCircle size={24} className="text-primary" />}
                    {followPromptOpen && <UserPlus size={24} className="text-primary" />}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-foreground mb-1">
                      {soundPromptOpen && "Want sound?"}
                      {chatPromptOpen && "Want to chat?"}
                      {followPromptOpen && `Follow ${current.username}?`}
                    </p>
                    <p className="text-[13px] text-[hsl(var(--text-secondary))] leading-relaxed">
                      {soundPromptOpen && <>Visit <span className="text-foreground font-semibold">{current.username}</span>'s room for the full experience with sound, HD video & more</>}
                      {chatPromptOpen && <>Join <span className="text-foreground font-semibold">{current.username}</span>'s live chat room to interact directly, send tips & requests</>}
                      {followPromptOpen && <>Get notified when <span className="text-foreground font-semibold">{current.username}</span> goes live. Create a free account to follow your favorites</>}
                    </p>
                  </div>
                  <a
                    href={current.room_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      const source = soundPromptOpen ? "sound" : chatPromptOpen ? "chat" : "follow";
                      tracker.track("prompt_visit_clicked", {
                        performer_id: current.username,
                        source,
                        time_on_performer_ms: Date.now() - watchStartRef.current,
                      });
                      recordBrainSignal("cta");
                      setSoundPromptOpen(false);
                      setChatPromptOpen(false);
                      setFollowPromptOpen(false);
                    }}
                    className="btn-press w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm uppercase tracking-wider glow-primary flex items-center justify-center"
                  >
                    {soundPromptOpen && `Enter ${current.username}'s Room`}
                    {chatPromptOpen && `Chat with ${current.username}`}
                    {followPromptOpen && `Visit ${current.username}'s Room`}
                  </a>
                  <button
                    onClick={() => { setSoundPromptOpen(false); setChatPromptOpen(false); setFollowPromptOpen(false); }}
                    className="btn-press text-[13px] text-[hsl(var(--text-tertiary))] font-medium"
                  >
                    Stay here
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Performer Profile Panel */}
      <PerformerProfile performer={current} open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Gender Filter Sheet */}
      <GenderFilterSheet open={filterOpen} active={activeFilter} onSelect={handleFilterChange} onClose={() => setFilterOpen(false)} />
    </div>
  );
};

export default RouletteView;
