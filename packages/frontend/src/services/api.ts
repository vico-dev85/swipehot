import { getSessionId, incrementCount } from "./session";
import { getAlpha } from "./brain";

export interface PerformerData {
  username: string;
  display_name: string;
  gender: "f" | "m" | "t" | "c";
  age: number | null;
  num_users: number;
  tags: string[];
  image_url: string;
  embed_url: string;
  room_url: string;
  room_subject: string;
  is_hd: boolean;
}

export interface PoolStats {
  pool_sizes: Record<string, number>;
  total_performers_cached: number;
  total_viewers: number;
}

// Map UI gender keys to API gender filter codes
const GENDER_MAP: Record<string, string> = {
  all: "all",
  women: "f",
  men: "m",
  trans: "t",
  couples: "c",
};

export async function fetchNextPerformer(
  gender: string = "all",
  preferTags: string[] = []
): Promise<PerformerData> {
  const sessionId = getSessionId();
  const genderCode = GENDER_MAP[gender] ?? "all";

  const alpha = getAlpha();
  const params = new URLSearchParams({
    session_id: sessionId,
    gender: genderCode,
  });
  if (preferTags.length > 0) {
    params.set("prefer_tags", preferTags.join(","));
  }
  if (alpha > 0) {
    params.set("alpha", alpha.toFixed(2));
  }

  const res = await fetch(`/api/pool/next?${params}`);
  if (!res.ok) {
    throw new Error(`Pool error: ${res.status}`);
  }

  incrementCount();
  return res.json();
}

export async function fetchPoolStats(): Promise<PoolStats> {
  const res = await fetch("/api/pool/stats");
  if (!res.ok) {
    throw new Error(`Stats error: ${res.status}`);
  }
  return res.json();
}

export interface AppConfig {
  features: {
    double_tap_hint: boolean;
    overlay_auto_hide: boolean;
    swipe_to_dismiss: boolean;
  };
  ab_tests: Array<{
    test_name: string;
    variants: string[];
    traffic_pct: number;
  }>;
}

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch("/api/config");
  if (!res.ok) {
    throw new Error(`Config error: ${res.status}`);
  }
  return res.json();
}
