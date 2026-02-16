import type { FastifyInstance } from 'fastify';
import type { GenderFilter, PerformerResponse, CachedPerformer } from '@xcamvip/shared';
import { getPool } from '../services/pool-fetcher.js';
import { markSeen, isValidSessionId, getSeenSet } from '../services/session.js';
import { selectPerformer } from '../services/pool-matcher.js';
import { config } from '../config.js';

/**
 * Build embed URL using /embed/{username}/ path.
 *
 * IMPORTANT: The Chaturbate API's iframe_embed field uses /in/ which is a 302 redirect —
 * that does NOT work as an iframe src. The actual embeddable player lives at /embed/{username}/.
 *
 * We use chaturbate.com directly for now. When the white label domain (www.xcam.vip) SSL
 * is working, switch embedDomain to config.whitelabelDomain to avoid ad blockers.
 */
function buildEmbedUrl(performer: CachedPerformer): string {
  const embedDomain = 'chaturbate.com';
  const uname = encodeURIComponent(performer.username);
  const url = new URL(`https://${embedDomain}/embed/${uname}/`);
  url.searchParams.set('campaign', config.affiliate.campaign);
  url.searchParams.set('tour', config.affiliate.tour);
  url.searchParams.set('track', config.affiliate.track);
  url.searchParams.set('room', performer.username);
  url.searchParams.set('disable_sound', '1');
  url.searchParams.set('embed_video_only', '1');
  url.searchParams.set('join_overlay', '1');
  url.searchParams.set('mobileRedirect', 'auto');
  return url.toString();
}

/**
 * Build CTA room URL — opens performer's full room page with affiliate tracking.
 * Uses /in/ path which redirects to the room (correct for click-through, NOT for embedding).
 *
 * `track` = aggregate traffic source bucket (for Chaturbate stats page reports)
 * `sid`   = unique click ID (session + performer) — sent in postbacks for per-click attribution
 */
function buildRoomUrl(performer: CachedPerformer, sessionId: string): string {
  const domain = config.whitelabelDomain;
  const url = new URL(`https://${domain}/in/`);
  url.searchParams.set('tour', config.affiliate.tour);
  url.searchParams.set('campaign', config.affiliate.campaign);
  url.searchParams.set('track', config.affiliate.track);
  url.searchParams.set('room', performer.username);
  // sid = unique click ID for postback conversion tracking
  url.searchParams.set('sid', `${sessionId}_${performer.username}`);
  return url.toString();
}

export async function poolRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /api/pool/next — return next unseen performer
  fastify.get<{
    Querystring: {
      session_id?: string;
      gender?: string;
      prefer_tags?: string;
      alpha?: string;
    };
  }>('/api/pool/next', async (request, reply) => {
    const { session_id, gender, prefer_tags, alpha: alphaStr } = request.query;

    // Validate session ID
    if (!session_id || !isValidSessionId(session_id)) {
      return reply.status(400).send({ error: 'Invalid or missing session_id' });
    }

    // Parse gender filter
    const genderFilter: GenderFilter =
      gender && ['all', 'f', 'm', 't', 'c'].includes(gender)
        ? (gender as GenderFilter)
        : 'all';

    // Get cached pool
    const pool = await getPool(genderFilter);
    if (pool.length === 0) {
      return reply.status(503).send({ error: 'Pool empty — data not yet available' });
    }

    // Parse preferred tags for personalization scoring
    const preferTags = prefer_tags
      ? prefer_tags.split(',').map(t => t.trim().toLowerCase())
      : [];

    // Parse alpha (personalization blend ratio from client brain)
    const alpha = alphaStr ? Math.min(0.85, Math.max(0, parseFloat(alphaStr) || 0)) : 0;

    // Get seen set for session exclusion
    const seenUsernames = await getSeenSet(session_id);

    // Use pool-matcher for personalized selection
    let bestMatch = selectPerformer({ pool, seenUsernames, preferTags: preferTags, alpha });

    // If all performers seen, return random from pool (session will rotate soon)
    if (!bestMatch) {
      bestMatch = pool[Math.floor(Math.random() * pool.length)];
    }

    // Mark as seen
    await markSeen(session_id, bestMatch.username);

    // Build response
    const response: PerformerResponse = {
      username: bestMatch.username,
      display_name: bestMatch.display_name,
      gender: bestMatch.gender,
      age: bestMatch.age,
      num_users: bestMatch.num_users,
      tags: bestMatch.normalized_tags,
      image_url: bestMatch.image_url,
      embed_url: buildEmbedUrl(bestMatch),
      room_url: buildRoomUrl(bestMatch, session_id),
      room_subject: bestMatch.room_subject,
      is_hd: bestMatch.is_hd,
    };

    return reply.send(response);
  });

  // GET /api/pool/stats — pool health info (for dashboard)
  fastify.get('/api/pool/stats', async (_request, reply) => {
    const genders: GenderFilter[] = ['all', 'f', 'm', 't', 'c'];
    const sizes: Record<string, number> = {};

    for (const g of genders) {
      const pool = await getPool(g);
      sizes[g] = pool.length;
    }

    // Get total online count (sum of num_users across all pool)
    const allPool = await getPool('all');
    const totalViewers = allPool.reduce((sum, p) => sum + p.num_users, 0);

    return reply.send({
      pool_sizes: sizes,
      total_performers_cached: allPool.length,
      total_viewers: totalViewers,
    });
  });
}
