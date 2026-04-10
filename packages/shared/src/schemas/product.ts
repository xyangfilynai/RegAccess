import { z } from 'zod';

export const DeviceClass = z.enum(['I', 'II', 'III']);
export type DeviceClass = z.infer<typeof DeviceClass>;

export const RegulatoryPathway = z.enum(['510k', 'de_novo', 'pma']);
export type RegulatoryPathway = z.infer<typeof RegulatoryPathway>;

export const PCCPStatus = z.enum(['none', 'authorized', 'pending']);
export type PCCPStatus = z.infer<typeof PCCPStatus>;

export const SoftwareLevelOfConcern = z.enum(['minor', 'moderate', 'major']);
export type SoftwareLevelOfConcern = z.infer<typeof SoftwareLevelOfConcern>;

export const ProductSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  productName: z.string().min(1).max(255),
  deviceFamily: z.string().max(255).nullable(),
  deviceClass: DeviceClass,
  regulatoryPathwayBaseline: RegulatoryPathway,
  predicateDevice: z.string().max(255).nullable(),
  pccpStatus: PCCPStatus,
  softwareLevelOfConcern: SoftwareLevelOfConcern,
  jurisdictionsJson: z.record(z.unknown()).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Product = z.infer<typeof ProductSchema>;

export const CreateProductSchema = z.object({
  productName: z.string().min(1).max(255),
  deviceFamily: z.string().max(255).optional().nullable(),
  deviceClass: DeviceClass,
  regulatoryPathwayBaseline: RegulatoryPathway,
  predicateDevice: z.string().max(255).optional().nullable(),
  pccpStatus: PCCPStatus.default('none'),
  softwareLevelOfConcern: SoftwareLevelOfConcern,
  jurisdictionsJson: z.record(z.unknown()).optional().nullable(),
});
export type CreateProduct = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
