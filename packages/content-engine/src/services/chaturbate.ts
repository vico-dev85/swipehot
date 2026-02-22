// Chaturbate API client — fetches live performer data.
// Used to validate model existence and get live stats/tags for page generation.
// Also handles screenshot downloading for living listicle pages.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Config } from '../config.js';

export interface CBRoom {
  username: string;
  display_name: string;
  age: number | null;
  gender: string;
  num_users: number;
  num_followers: number;
  tags: string[];
  image_url: string;
  image_url_360x270: string;
  room_subject: string;
  spoken_languages: string;
  country: string;
  is_hd: boolean;
  is_new: boolean;
  seconds_online: number;
  current_show: string;
}

const CB_API_BASE = 'https://chaturbate.com/api/public/affiliates/onlinerooms/';

// Fetch all currently online rooms (up to `limit`).
export async function fetchOnlineRooms(
  config: Config,
  opts: { gender?: string; limit?: number; offset?: number } = {}
): Promise<CBRoom[]> {
  const params = new URLSearchParams({
    wm: config.affiliateCampaign,
    client_ip: 'request_ip',
    format: 'json',
    limit: String(opts.limit ?? 500),
  });
  if (opts.offset) params.set('offset', String(opts.offset));
  if (opts.gender) params.set('gender', opts.gender);

  const url = `${CB_API_BASE}?${params}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ContentEngine/1.0' },
  });

  if (!res.ok) {
    throw new Error(`CB API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as { results?: unknown };
  if (!Array.isArray(data?.results)) {
    throw new Error('CB API: unexpected response shape');
  }
  return data.results as CBRoom[];
}

// Look up a specific model by username in the online rooms.
// Returns the room data if online, null if offline.
export async function findModel(config: Config, username: string): Promise<CBRoom | null> {
  // Fetch a large pool and search for the username
  const rooms = await fetchOnlineRooms(config, { limit: 500 });
  const match = rooms.find(r => r.username.toLowerCase() === username.toLowerCase());
  if (match) return match;

  // Try offset pages — model might be further back
  for (const offset of [500, 1000, 1500]) {
    try {
      const more = await fetchOnlineRooms(config, { limit: 500, offset });
      if (more.length === 0) break;
      const found = more.find(r => r.username.toLowerCase() === username.toLowerCase());
      if (found) return found;
    } catch {
      break;
    }
  }

  return null;
}

// Get top N models sorted by viewer count.
export async function getTopModels(config: Config, count: number): Promise<CBRoom[]> {
  const allRooms: CBRoom[] = [];
  for (const offset of [0, 500, 1000]) {
    try {
      const rooms = await fetchOnlineRooms(config, { limit: 500, offset });
      allRooms.push(...rooms);
      if (rooms.length < 500) break;
    } catch {
      break;
    }
  }

  return allRooms
    .sort((a, b) => b.num_users - a.num_users)
    .slice(0, count);
}

// Extract a likely Chaturbate username from a keyword phrase.
// Keywords from tier1-models come in forms like:
//   "akura_01's cam", "alana_lopez chaturbate", "latina_daily", "anabel054 onlyfans"
export function extractUsername(keyword: string): string {
  let name = keyword.trim().toLowerCase();

  // Strip known suffixes
  const suffixes = [
    "'s cam", "'s cam",
    ' nude chaturbate', ' chaturbate',
    ' onlyfans', ' stripchat', ' bongacams', ' myfreecams',
    ' cam', ' live', ' nude',
  ];
  for (const suffix of suffixes) {
    if (name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length).trim();
      break;
    }
  }

  // CB usernames use underscores, not spaces
  name = name.replace(/\s+/g, '_');

  // Strip non-alphanumeric except underscores (CB username chars)
  name = name.replace(/[^a-z0-9_]/g, '');

  return name;
}

// Build embed URL for a model page.
export function buildEmbedUrl(config: Config, username: string): string {
  const params = new URLSearchParams({
    campaign: config.affiliateCampaign,
    tour: config.affiliateTour,
    track: config.affiliateTrack,
    disable_sound: '1',
    embed_video_only: '1',
    mobileRedirect: 'auto',
  });
  return `https://${config.whitelabelDomain}/embed/${username}/?${params}`;
}

// Build CTA room URL (click-through affiliate link).
export function buildRoomUrl(config: Config, username: string): string {
  const params = new URLSearchParams({
    tour: config.affiliateTour,
    campaign: config.affiliateCampaign,
    track: config.affiliateTrack,
    room: username,
  });
  return `https://chaturbate.com/in/?${params}`;
}

// Download a model's screenshot to a local directory.
// Returns the relative path from the output root, or null on failure.
export async function downloadScreenshot(
  imageUrl: string,
  outputDir: string,
  username: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'ContentEngine/1.0' },
    });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') ? 'jpg' : 'jpg';
    const dir = join(outputDir, 'screenshots');
    await mkdir(dir, { recursive: true });
    const filename = `${username}.${ext}`;
    const filepath = join(dir, filename);
    await writeFile(filepath, buffer);
    return `screenshots/${filename}`;
  } catch (err) {
    console.warn(`[screenshot] Failed for ${username}: ${(err as Error).message}`);
    return null;
  }
}
