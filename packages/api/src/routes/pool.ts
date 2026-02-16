import type { FastifyInstance } from 'fastify';
import type { GenderFilter, PerformerResponse } from '@xcamvip/shared';
import { getPool } from '../services/pool-fetcher.js';
import { markSeen, hasSeen, isValidSessionId } from '../services/session.js';
import { config } from '../config.js';

// Build the affiliate embed URL from raw iframe URL
function buildEmbedUrl(rawEmbed: string): string {
  try {
    const url = new URL(rawEmbed);
    url.searchParams.set('campaign', config.affiliate.campaign);
    url.searchParams.set('tour', config.affiliate.tour);
    url.searchParams.set('track', config.affiliate.track);
    url.searchParams.set('disable_sound', '1');
    return url.toString();
  } catch {
    return rawEmbed;
  }
}

// Build the affiliate room URL for CTA click-through
function buildRoomUrl(chatRoomUrl: string): string {
  try {
    const url = new URL(chatRoomUrl);
    url.searchParams.set('campaign', config.affiliate.campaign);
    url.searchParams.set('tour', config.affiliate.tour);
    url.searchParams.set('track', config.affiliate.track);
    return url.toString();
  } catch {
    return chatRoomUrl;
  }
}

export async function poolRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /api/pool/next — return next unseen performer
  fastify.get<{
    Querystring: {
      session_id?: string;
      gender?: string;
      prefer_tags?: string;
    };
  }>('/api/pool/next', async (request, reply) => {
    const { session_id, gender, prefer_tags } = request.query;

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
    const preferredTags = prefer_tags
      ? prefer_tags.split(',').map(t => t.trim().toLowerCase())
      : [];

    // Find first unseen performer, with optional tag-preference scoring
    let bestMatch: typeof pool[number] | null = null;
    let bestScore = -Infinity;

    for (const performer of pool) {
      // Session exclusion check
      const seen = await hasSeen(session_id, performer.username);
      if (seen) continue;

      // Simple scoring: quality_score + tag overlap bonus
      let score = performer.quality_score;
      if (preferredTags.length > 0) {
        const overlap = performer.normalized_tags.filter(t => preferredTags.includes(t)).length;
        score += overlap * 10; // 10 points per matching tag
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = performer;
      }
    }

    // If all performers seen, return random from pool (session will rotate soon)
    if (!bestMatch) {
      bestMatch = pool[Math.floor(Math.random() * pool.length)];
    }

    // Mark as seen
    await markSeen(session_id, bestMatch.username);

    // Build response (never expose raw pool data — security fix from re-review)
    const response: PerformerResponse = {
      username: bestMatch.username,
      display_name: bestMatch.display_name,
      gender: bestMatch.gender,
      age: bestMatch.age,
      num_users: bestMatch.num_users,
      tags: bestMatch.normalized_tags,
      image_url: bestMatch.image_url,
      embed_url: buildEmbedUrl(bestMatch.iframe_embed),
      room_url: buildRoomUrl(bestMatch.chat_room_url),
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
