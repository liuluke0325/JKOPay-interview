import { buildServer } from './app.js';
import { loadEnv } from './lib/env.js';
import { prisma } from './lib/prisma.js';

async function main() {
  const env = loadEnv();
  const app = await buildServer();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    try {
      await app.close();
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    const docsBase = env.PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`;
    app.log.info(`Swagger UI: ${docsBase}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
