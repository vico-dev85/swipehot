/**
 * Event Tracker — Client-side analytics pipeline
 *
 * Batch queue with 10s flush, Beacon API on page hide.
 * Based on Research 06: analytics-research.md
 */

import { getSessionId, getVisitorId, getSessionNumber } from "./session";

interface TrackedEvent {
  session_id: string;
  visitor_id: string;
  event_type: string;
  timestamp: string;
  device_type: "mobile" | "tablet" | "desktop";
  viewport_width: number;
  viewport_height: number;
  referrer: string;
  schema_version: number;
  ab_variants: Record<string, string>;
  [key: string]: unknown;
}

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

class EventTracker {
  private queue: TrackedEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private endpoint = `${import.meta.env.VITE_API_URL || ""}/api/events`;
  private sessionStartTime = Date.now();
  private performersViewed = 0;
  private ctaClicks = 0;
  private likesCount = 0;

  constructor() {
    // Flush every 10 seconds
    this.flushTimer = setInterval(() => this.flush(), 10_000);

    // Flush on page hide (most reliable mobile event)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.flush(true);
      }
    });

    // Heartbeat every 30s while visible
    this.heartbeatTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        this.track("session_heartbeat", {
          performers_viewed: this.performersViewed,
          total_time_ms: Date.now() - this.sessionStartTime,
          likes_count: this.likesCount,
          cta_clicks: this.ctaClicks,
        });
      }
    }, 30_000);
  }

  track(eventType: string, properties: Record<string, unknown> = {}): void {
    // Update internal counters
    if (eventType === "performer_viewed") this.performersViewed++;
    if (eventType === "cta_clicked") this.ctaClicks++;
    if (eventType === "performer_liked") this.likesCount++;

    const event: TrackedEvent = {
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      event_type: eventType,
      timestamp: new Date().toISOString(),
      device_type: getDeviceType(),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      referrer: document.referrer || "direct",
      schema_version: 1,
      ab_variants: this.getABVariants(),
      session_number: getSessionNumber(),
      ...properties,
    };

    this.queue.push(event);

    // Immediate flush if queue hits 20 events
    if (this.queue.length >= 20) {
      this.flush();
    }
  }

  private flush(useBeacon = false): void {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    const payload = JSON.stringify({ events: batch });

    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, payload);
    } else {
      fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Re-queue on failure (will retry next flush)
        this.queue.unshift(...batch);
      });
    }
  }

  private getABVariants(): Record<string, string> {
    try {
      const raw = localStorage.getItem("xcam_ab");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  destroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.flush(true);
  }
}

// Singleton
export const tracker = new EventTracker();
