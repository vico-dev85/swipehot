import type { FastifyInstance } from 'fastify';
import { logEvents, getBufferedCount, type EventPayload } from '../services/event-logger.js';

interface BatchBody {
  events: EventPayload[];
}

export async function eventRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /api/events — batch analytics event ingestion
  // Client sends { events: [...] } from the EventTracker flush
  fastify.post<{ Body: BatchBody }>('/api/events', async (request, reply) => {
    const body = request.body;

    // Support both single event and batch format
    let events: EventPayload[];
    if (Array.isArray((body as any).events)) {
      events = body.events;
    } else if (body && (body as any).event_type) {
      // Legacy single-event format
      events = [body as unknown as EventPayload];
    } else {
      return reply.status(400).send({ error: 'Expected { events: [...] } or single event object' });
    }

    // Basic validation — drop malformed events, keep valid ones
    const valid = events.filter((e) =>
      e && typeof e.session_id === 'string' && e.session_id.length > 0
        && typeof e.event_type === 'string' && e.event_type.length > 0
    );

    if (valid.length === 0) {
      return reply.status(400).send({ error: 'No valid events in batch' });
    }

    // Fire-and-forget persistence (don't block response)
    logEvents(valid).catch((err) => {
      fastify.log.error({ err }, 'Event logging failed');
    });

    return reply.status(202).send({ accepted: valid.length });
  });

  // GET /api/events/count — health monitoring
  fastify.get('/api/events/count', async (_request, reply) => {
    return reply.send({ buffered_in_memory: getBufferedCount() });
  });
}
