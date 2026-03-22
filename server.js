// ─── Foodie Lover — Next.js Server ────────────────────────────────────────────
// Socket.io removed — real-time handled by Supabase Realtime
const { createServer } = require('http');
const { parse }        = require('url');
const next             = require('next');

const dev    = process.env.NODE_ENV !== 'production';
const app    = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`\n🍽️  Foodie Lover POS ready on http://localhost:${PORT}`);
    console.log(`   Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'}`);
    console.log(`   Realtime: Supabase broadcast channels`);
    console.log(`   Email:    Resend (${process.env.RESEND_API_KEY ? 'configured' : 'not set'})\n`);
  });
});
