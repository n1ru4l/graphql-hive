#!/usr/bin/env node
import {
  createServer,
  createErrorHandler,
  ensureEnv,
  startMetrics,
  registerShutdown,
} from '@hive/service-common';
import * as Sentry from '@sentry/node';
import Redis from 'ioredis';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify/dist/trpc-server-adapters-fastify.cjs.js';
import { schemaBuilderApiRouter } from './api';

async function main() {
  Sentry.init({
    serverName: 'schema',
    enabled: process.env.ENVIRONMENT === 'prod',
    environment: process.env.ENVIRONMENT,
    dsn: process.env.SENTRY_DSN,
    release: process.env.RELEASE || 'local',
  });

  const server = createServer({
    name: 'schema',
    tracing: false,
  });

  registerShutdown({
    logger: server.log,
    async onShutdown() {
      await Promise.all([server.close(), redis.disconnect(false)]);
    },
  });

  const errorHandler = createErrorHandler(server);

  const redis = new Redis({
    host: ensureEnv('REDIS_HOST'),
    port: ensureEnv('REDIS_PORT', 'number'),
    password: ensureEnv('REDIS_PASSWORD'),
    retryStrategy(times) {
      return Math.min(times * 500, 2000);
    },
    reconnectOnError(error) {
      server.log.warn('Redis reconnectOnError', error);
      return 1;
    },
    db: 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  try {
    redis.on('error', (err) => {
      errorHandler('Redis error', err);
    });

    redis.on('connect', () => {
      server.log.debug('Redis connection established');
    });

    redis.on('ready', () => {
      server.log.info('Redis connection ready');
    });

    redis.on('close', () => {
      server.log.info('Redis connection closed');
    });

    redis.on('reconnecting', (timeToReconnect) => {
      server.log.info('Redis reconnecting in %s', timeToReconnect);
    });

    const port = process.env.PORT || 6500;
    const context = {
      redis,
      logger: server.log,
      errorHandler,
    };

    server.register(fastifyTRPCPlugin, {
      prefix: '/trpc',
      trpcOptions: {
        router: schemaBuilderApiRouter,
        createContext: () => context,
      },
    });

    server.route({
      method: ['GET', 'HEAD'],
      url: '/_health',
      handler(_, res) {
        res.status(200).send();
      },
    });

    server.route({
      method: ['GET', 'HEAD'],
      url: '/_readiness',
      handler(_, res) {
        res.status(200).send();
      },
    });

    await server.listen(port, '0.0.0.0');
    if (process.env.METRICS_ENABLED === 'true') {
      await startMetrics();
    }
  } catch (error) {
    server.log.fatal(error);
    throw error;
  }
}

main().catch((err) => {
  Sentry.captureException(err, {
    level: Sentry.Severity.Fatal,
  });
  console.error(err);
  process.exit(1);
});