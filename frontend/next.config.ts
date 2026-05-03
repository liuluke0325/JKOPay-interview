import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// next-intl plugin reads `src/i18n/request.ts` for locale + messages.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Allow Next.js Image to serve our seed-time logo URLs from the same origin.
  // Reviewer hits FE dev at :3000; logos live at /logos/*.svg under public/.
  //
  // `standalone` produces a self-contained `.next/standalone/` tree
  // that runs via `node server.js` — no `next start` / full
  // node_modules at runtime. The Dockerfile copies that tree +
  // `.next/static` + `public/` into a slim runner image. `next dev`
  // is unaffected by this flag.
  output: 'standalone',
};

export default withNextIntl(nextConfig);
