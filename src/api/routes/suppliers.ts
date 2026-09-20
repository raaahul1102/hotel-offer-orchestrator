import { Router } from 'express';
import { SUPPLIER_A_HOTELS, SUPPLIER_B_HOTELS } from '../../suppliers/data';

/**
 * Mock supplier endpoints (Requirement 4). Returns static, deterministic data.
 */
export const suppliersRouter = Router();

suppliersRouter.get('/supplierA/hotels', (_req, res) => {
  res.json(SUPPLIER_A_HOTELS);
});

suppliersRouter.get('/supplierB/hotels', (_req, res) => {
  res.json(SUPPLIER_B_HOTELS);
});
