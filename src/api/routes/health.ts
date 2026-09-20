import { Router } from 'express';
import { checkSupplierHealth } from '../../temporal/activities';
import { SupplierId } from '../../types';

/**
 * GET /health — reports reachability of both suppliers (Requirement 6).
 * 200 when both reachable, 503 when at least one is unreachable.
 */
export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const suppliers: SupplierId[] = ['Supplier A', 'Supplier B'];

  const results = await Promise.all(
    suppliers.map(async (supplier) => ({
      supplier,
      reachable: await checkSupplierHealth(supplier),
    })),
  );

  const unreachable = results.filter((r) => !r.reachable).map((r) => r.supplier);
  const allHealthy = unreachable.length === 0;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    suppliers: results,
    unreachable,
  });
});
