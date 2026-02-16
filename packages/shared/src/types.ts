// Chaturbate API response shape (per room)
export interface CBPerformer {
  username: string;
  display_name: string;
  uid: number;
  age: number | null;
  gender: 'f' | 'm' | 't' | 'c' | 's';
  is_new: boolean;
  num_users: number;
  num_followers: number;
  tags: string[];
  image_url: string;
  image_url_360x270: string;
  iframe_embed: string;
  iframe_embed_revshare: string;
  chat_room_url: string;
  chat_room_url_revshare: string;
  current_show: string;
  country: string;
  room_subject: string;
  spoken_languages: string;
  birthday: string;
  location: string;
  seconds_online: number;
  is_hd: boolean;
  recorded: boolean;
}

// Our cached performer — cleaned + scored
export interface CachedPerformer {
  username: string;
  display_name: string;
  gender: 'f' | 'm' | 't' | 'c';
  age: number | null;
  num_users: number;
  tags: string[];
  normalized_tags: string[];
  image_url: string;
  iframe_embed: string;
  chat_room_url: string;
  room_subject: string;
  is_hd: boolean;
  seconds_online: number;
  quality_score: number;
  fetched_at: number; // unix timestamp
}

// What the frontend receives from /api/pool/next
export interface PerformerResponse {
  username: string;
  display_name: string;
  gender: 'f' | 'm' | 't' | 'c';
  age: number | null;
  num_users: number;
  tags: string[];
  image_url: string;
  embed_url: string;
  room_url: string;
  room_subject: string;
  is_hd: boolean;
}

// Gender filter values
export type GenderFilter = 'all' | 'f' | 'm' | 't' | 'c';

// Pool sizes per gender (from plugin merge strategy — v2.0 sizes)
export const POOL_SIZES: Record<GenderFilter, number> = {
  all: 400,
  f: 240,
  m: 160,
  t: 140,
  c: 160,
};

// Analytics event sent from frontend
export interface AnalyticsEvent {
  session_id: string;
  event_type: string;
  data: Record<string, unknown>;
  ab_variants: Record<string, string>;
  timestamp: number;
}

// Config stored in dashboard
export interface AppConfig {
  key: string;
  value: string;
  updated_at: string;
}

// Affiliate link params
export interface AffiliateConfig {
  campaign: string;
  tour: string;
  track: string;
}

// Health check response
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  pool_sizes: Record<GenderFilter, number>;
  cache_age_seconds: number;
  last_fetch_success: boolean;
  redis_connected: boolean;
}
