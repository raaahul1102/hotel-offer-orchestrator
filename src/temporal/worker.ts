import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';
import { config } from '../config';
import { logger } from '../logger';

/**
 * Temporal worker: hosts the workflow code and activity implementations,
 * polling the shared task queue.
 */
async function run(): Promise<void> {
  const connection = await NativeConnection.connect({
    address: config.temporal.address,
  });

  const worker = await Worker.create({
    connection,
    namespace: config.temporal.namespace,
    taskQueue: config.temporal.taskQueue,
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  logger.info(
    { taskQueue: config.temporal.taskQueue, address: config.temporal.address },
    'temporal worker started',
  );
  await worker.run();
}

run().catch((err) => {
  logger.error({ err: (err as Error).message }, 'worker failed to start');
  process.exit(1);
});
