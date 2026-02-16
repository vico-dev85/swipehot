import type { FastifyInstance } from 'fastify';
import type { AnalyticsEvent } from '@xcamvip/shared';
import { isValidSessionId } from '../services/session.js';

// In-memory buffer for events — flushed to MySQL periodically
// TODO: Replace with MySQL INSERT when database is set up
const eventBuffer: AnalyticsEvent[] = [];

export async function eventRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /api/events — lightweight analytics event ingestion
  fastify.post<{ Body: AnalyticsEvent }>('/api/events', async (request, reply) => {
    const event = request.body;

    // Validate
    if (!event || !event.session_id || !event.event_type) {
      return reply.status(400).send({ error: 'Missing session_id or event_type' });
    }
    if (!isValidSessionId(event.session_id)) {
      return reply.status(400).send({ error: 'Invalid session_id format' });
    }

    // Buffer the event (fire-and-forget from frontend's perspective)
    eventBuffer.push({
      session_id: event.session_id,
      event_type: event.event_type,
      data: event.data || {},
      ab_variants: event.ab_variants || {},
      timestamp: event.timestamp || Date.now(),
    });

    // Keep buffer bounded
    if (eventBuffer.length > 10000) {
      eventBuffer.splice(0, eventBuffer.length - 10000);
    }

    return reply.status(202).send({ ok: true });
  });

  // GET /api/events/count — simple count for health monitoring
  fastify.get('/api/events/count', async (_request, reply) => {
    return reply.send({ buffered: eventBuffer.length });
  });
}
