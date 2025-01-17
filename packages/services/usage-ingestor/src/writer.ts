import * as Sentry from '@sentry/node';
import { got } from 'got';
import Agent from 'agentkeepalive';
import type { FastifyLoggerInstance } from '@hive/service-common';
import { compress } from '@hive/usage-common';
import {
  operationsOrder,
  registryOrder,
  legacyOperationsOrder,
  legacyRegistryOrder,
  joinIntoSingleMessage,
} from './serializer';

export interface ClickHouseConfig {
  protocol: string;
  host: string;
  port: number;
  username: string;
  password: string;
}

const operationsFields = operationsOrder.join(', ');
const registryFields = registryOrder.join(', ');
const legacyOperationsFields = legacyOperationsOrder.join(', ');
const legacyRegistryFields = legacyRegistryOrder.join(', ');

const agentConfig: Agent.HttpOptions = {
  // Keep sockets around in a pool to be used by other requests in the future
  keepAlive: true,
  // Sets the working socket to timeout after N ms of inactivity on the working socket
  timeout: 60_000,
  // Sets the free socket to timeout after N ms of inactivity on the free socket
  freeSocketTimeout: 30_000,
  // Sets the socket active time to live
  socketActiveTTL: 60_000,
  maxSockets: 10,
  maxFreeSockets: 10,
  scheduling: 'lifo',
};

export function createWriter({
  clickhouse,
  clickhouseCloud,
  logger,
}: {
  clickhouse: ClickHouseConfig;
  clickhouseCloud: ClickHouseConfig | null;
  logger: FastifyLoggerInstance;
}) {
  const httpAgent = new Agent(agentConfig);
  const httpsAgent = new Agent.HttpsAgent(agentConfig);

  const agents = {
    http: httpAgent,
    https: httpsAgent,
  };

  return {
    async writeOperations(operations: string[]) {
      const csv = joinIntoSingleMessage(operations);
      const compressed = await compress(csv);
      const sql = `INSERT INTO operations (${operationsFields}) FORMAT CSV`;

      await Promise.all([
        writeCsv(clickhouse, agents, sql, compressed),
        clickhouseCloud
          ? writeCsv(clickhouseCloud, agents, sql, compressed).catch(error => {
              logger.error('Failed to write operations to ClickHouse Cloud %s', error);
              // Ignore errors from clickhouse cloud
              return Promise.resolve();
            })
          : Promise.resolve(),
      ]);
    },
    async writeRegistry(records: string[]) {
      const csv = joinIntoSingleMessage(records);
      const compressed = await compress(csv);
      const sql = `INSERT INTO operation_collection (${registryFields}) FORMAT CSV`;

      await Promise.all([
        writeCsv(clickhouse, agents, sql, compressed),
        clickhouseCloud
          ? writeCsv(clickhouseCloud, agents, sql, compressed).catch(error => {
              logger.error('Failed to write operation_collection to ClickHouse Cloud %s', error);
              // Ignore errors from clickhouse cloud
              return Promise.resolve();
            })
          : Promise.resolve(),
      ]);
    },
    legacy: {
      async writeOperations(operations: string[]) {
        const csv = joinIntoSingleMessage(operations);

        await writeCsv(
          clickhouse,
          agents,
          `INSERT INTO operations_new (${legacyOperationsFields}) FORMAT CSV`,
          await compress(csv)
        );
      },
      async writeRegistry(records: string[]) {
        const csv = joinIntoSingleMessage(records);
        await writeCsv(
          clickhouse,
          agents,
          `INSERT INTO operations_registry (${legacyRegistryFields}) FORMAT CSV`,
          await compress(csv)
        );
      },
    },
    destroy() {
      httpAgent.destroy();
      httpsAgent.destroy();
    },
  };
}

async function writeCsv(
  config: ClickHouseConfig,
  agents: {
    http: Agent;
    https: Agent.HttpsAgent;
  },
  query: string,
  body: Buffer
) {
  return got
    .post(`${config.protocol ?? 'https'}://${config.host}:${config.port}`, {
      body,
      searchParams: {
        query,
      },
      username: config.username,
      password: config.password,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'text/csv',
        'Content-Encoding': 'gzip',
      },
      retry: {
        calculateDelay(info) {
          if (info.attemptCount >= 5) {
            // After 5 retries, stop.
            return 0;
          }

          return info.attemptCount * 250;
        },
      },
      timeout: {
        lookup: 2000,
        connect: 2000,
        secureConnect: 2000,
        request: 30_000,
      },
      agent: {
        http: agents.http,
        https: agents.https,
      },
    })
    .catch(error => {
      Sentry.captureException(error, {
        level: 'error',
        extra: {
          query,
        },
      });
      return Promise.reject(error);
    });
}
