/**
 * Dual Iframe Manager — with center-crop for portrait viewports
 *
 * Two permanent <iframe> elements — never created/destroyed.
 * Recycle via about:blank, preload next performer, crossfade swap.
 * Center-crops 16:9 video to fill portrait viewport (from reference code).
 * Based on research: researches/results/5th.md
 */

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const MEDIA_AR = 16 / 9; // Chaturbate streams are 16:9

export interface IframeManager {
  mount(container: HTMLElement): void;
  loadActive(embedUrl: string): void;
  preload(embedUrl: string): void;
  swap(): void;
  killAll(): void;
  destroy(): void;
  hasPreloaded(): boolean;
  setMuted(muted: boolean): void;
}

export function createIframeManager(): IframeManager {
  const iframeA = document.createElement("iframe");
  const iframeB = document.createElement("iframe");
  let activeIframe = iframeA;
  let preloadIframe = iframeB;
  let mounted = false;
  let preloadedUrl: string | null = null;
  let canvas: HTMLDivElement | null = null; // Inner canvas (wider than viewport for center-crop)
  let container: HTMLElement | null = null;

  // Configure iframe attributes (matching original reference code)
  function configureIframe(iframe: HTMLIFrameElement) {
    iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen; picture-in-picture");
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("referrerpolicy", "origin");
    iframe.setAttribute("loading", "eager");
    iframe.title = "Live stream";
    // Iframes fill the canvas (which is wider than viewport for center-crop)
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      will-change: opacity;
      transition: opacity 0.6s ease;
    `;
  }

  configureIframe(iframeA);
  configureIframe(iframeB);

  function setVisible(iframe: HTMLIFrameElement) {
    iframe.style.opacity = "1";
    iframe.style.pointerEvents = "none"; // Click-blocker handles interaction
  }

  function setHidden(iframe: HTMLIFrameElement) {
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
  }

  function recycleIframe(iframe: HTMLIFrameElement) {
    iframe.src = "about:blank";
  }

  /**
   * Center-crop calculation (from original reference code):
   * Makes the canvas wider than the container so the 16:9 video
   * fills the full height, then horizontally centers the crop.
   */
  function applyCrop() {
    if (!container || !canvas) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return;

    const containerAR = cw / ch;
    // How wide the canvas needs to be (%) so the 16:9 video covers the full height
    const widthPct = containerAR < MEDIA_AR
      ? (MEDIA_AR / containerAR) * 100
      : 100;

    canvas.style.width = widthPct + "%";
    canvas.style.height = "100%";

    // Center the crop horizontally
    const canvasWidth = canvas.offsetWidth;
    const overflow = Math.max(0, canvasWidth - cw);
    canvas.style.left = -(overflow / 2) + "px";
    canvas.style.top = "0px";
  }

  // Resize handler
  function onResize() {
    applyCrop();
  }

  // Visibility change handler — kill preload when tab hidden
  function onVisibilityChange() {
    if (document.hidden) {
      recycleIframe(preloadIframe);
      preloadedUrl = null;
    }
  }

  // Set initial visibility
  setVisible(iframeA);
  setHidden(iframeB);

  return {
    mount(containerEl: HTMLElement) {
      if (mounted) return;
      container = containerEl;

      // Create inner canvas div (wider than viewport for center-crop)
      canvas = document.createElement("div");
      canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      `;
      canvas.appendChild(iframeA);
      canvas.appendChild(iframeB);
      containerEl.appendChild(canvas);

      mounted = true;
      applyCrop();
      // Retry crop after layout settles (container may not have dimensions yet)
      requestAnimationFrame(() => applyCrop());

      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibilityChange);
    },

    loadActive(embedUrl: string) {
      activeIframe.src = embedUrl;
      setVisible(activeIframe);
      setHidden(preloadIframe);
    },

    preload(embedUrl: string) {
      if (preloadedUrl === embedUrl) return;
      preloadedUrl = embedUrl;

      // Set src directly — no about:blank recycle needed.
      // The browser navigates away from whatever's loaded (usually already blank after swap cleanup).
      preloadIframe.src = embedUrl;

      // On iOS, keep preload iframe visible behind active for autoplay
      if (isIOS) {
        preloadIframe.style.opacity = "1";
        preloadIframe.style.zIndex = "0";
        activeIframe.style.zIndex = "1";
      }
    },

    swap() {
      const incoming = preloadIframe;
      const outgoing = activeIframe;
      let cleanedUp = false;

      requestAnimationFrame(() => {
        setVisible(incoming);
        setHidden(outgoing);

        // After fade-out, recycle old iframe — but only if nothing was preloaded into it
        const cleanup = () => {
          if (cleanedUp) return;
          cleanedUp = true;
          // If preload() already loaded a new URL into this iframe, don't destroy it
          if (preloadedUrl !== null) return;
          requestAnimationFrame(() => {
            recycleIframe(outgoing);
          });
        };
        outgoing.addEventListener("transitionend", cleanup, { once: true });
        setTimeout(cleanup, 700); // Fallback
      });

      activeIframe = incoming;
      preloadIframe = outgoing;
      preloadedUrl = null;
    },

    killAll() {
      recycleIframe(iframeA);
      recycleIframe(iframeB);
      setHidden(iframeA);
      setHidden(iframeB);
      preloadedUrl = null;
    },

    destroy() {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      this.killAll();
      if (mounted && canvas) {
        canvas.remove();
        mounted = false;
      }
    },

    hasPreloaded() {
      return preloadedUrl !== null;
    },

    setMuted(muted: boolean) {
      const currentSrc = activeIframe.src;
      if (!currentSrc || currentSrc === "about:blank") return;
      try {
        const url = new URL(currentSrc);
        // Chaturbate uses disable_sound=1 for muted, disable_sound=0 for unmuted
        // (removing the param defaults to muted — must explicitly set 0)
        url.searchParams.set("disable_sound", muted ? "1" : "0");
        const newSrc = url.toString();
        if (newSrc !== currentSrc) {
          activeIframe.src = newSrc;
        }
      } catch { /* invalid URL */ }
    },
  };
}
