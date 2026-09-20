import { Client, Connection } from '@temporalio/client';
import { config } from '../config';
import { logger } from '../logger';
import { orchestrateHotelOffers, OrchestrateResult } from './workflows';

let client: Client | null = null;

/** Lazily create a shared Temporal client. */
export async function getTemporalClient(): Promise<Client> {
  if (client) {
    return client;
  }
  const connection = await Connection.connect({ address: config.temporal.address });
  client = new Client({ connection, namespace: config.temporal.namespace });
  logger.info({ address: config.temporal.address }, 'temporal client connected');
  return client;
}

/**
 * Start and await the orchestration workflow for a city.
 */
export async function runOrchestration(city: string): Promise<OrchestrateResult> {
  const c = await getTemporalClient();
  const handle = await c.workflow.start(orchestrateHotelOffers, {
    args: [city],
    taskQueue: config.temporal.taskQueue,
    workflowId: `orchestrate-${city.trim().toLowerCase()}-${Date.now()}`,
  });
  logger.info({ workflowId: handle.workflowId, city }, 'workflow started');
  return handle.result();
}
