import "server-only";

import { z, idString } from "./common";

// Port of `backend/model/validation/serviceValidation.js`.

const serviceFields = {
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().nonnegative(),
  durationMinutes: z.number().int().min(5).max(480),
  category: z.string().max(80).optional().nullable(),
  isActive: z.boolean().optional(),
  barberIds: z.array(idString).optional(),
};

export const createServiceBodySchema = z.object(serviceFields);

export const updateServiceBodySchema = z.object({
  ...serviceFields,
  name: serviceFields.name.optional(),
  price: serviceFields.price.optional(),
  durationMinutes: serviceFields.durationMinutes.optional(),
});
