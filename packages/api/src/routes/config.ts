import type { FastifyInstance } from 'fastify';

// Active A/B test definitions
// The frontend assigns variants on first visit and includes them in all events
const AB_TESTS = [
  {
    test_name: 'start_screen',
    variants: ['control', 'instant'], // control = splash screen, instant = skip to roulette
    traffic_pct: 100,
    status: 'running',
  },
  {
    test_name: 'cta_copy',
    variants: ['watch_live', 'go_live', 'chat_now'],
    traffic_pct: 100,
    status: 'running',
  },
];

export async function configRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /api/config — public runtime configuration for frontend
  fastify.get('/api/config', async (_request, reply) => {
    return reply.send({
      features: {
        double_tap_hint: true,
        overlay_auto_hide: true,
        swipe_to_dismiss: true,
      },
      ab_tests: AB_TESTS.filter((t) => t.status === 'running'),
    });
  });
}
