import { z } from 'zod';

export const RoleType = z.enum(['org_admin', 'member']);
export type RoleType = z.infer<typeof RoleType>;

export const UserStatus = z.enum(['active', 'deactivated']);
export type UserStatus = z.infer<typeof UserStatus>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  title: z.string().nullable(),
  department: z.string().nullable(),
  roleType: RoleType,
  status: UserStatus,
  lastLoginAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type User = z.infer<typeof UserSchema>;

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  planTier: z.string(),
  ssoConfigJson: z.record(z.unknown()).nullable(),
  dataRetentionPolicyJson: z.record(z.unknown()).nullable(),
  createdAt: z.coerce.date(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const EngineVersionSchema = z.object({
  engineVersion: z.string(),
  schemaVersion: z.string(),
  releasedAt: z.coerce.date(),
  changelog: z.string(),
  isCurrent: z.boolean(),
});
export type EngineVersion = z.infer<typeof EngineVersionSchema>;

/** Auth context injected into every request */
export const AuthContextSchema = z.object({
  user: UserSchema,
  organization: OrganizationSchema,
});
export type AuthContext = z.infer<typeof AuthContextSchema>;
