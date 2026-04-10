import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  AuthContext,
  Product,
  CreateProduct,
  ChangeCase,
  CreateCase,
  UpdateCase,
  AuditEvent,
} from '@changepath/shared';

// -- Auth --

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<AuthContext>('/api/me'),
  });
}

// -- Products --

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<Product[]>('/api/products'),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => api.get<Product>(`/api/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProduct) => api.post<Product>('/api/products', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

// -- Cases --

interface CaseWithProduct extends ChangeCase {
  product: { productName: string };
  caseOwner: { id: string; name: string } | null;
}

export function useCases(filters?: { status?: string; productId?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.productId) params.set('productId', filters.productId);
  const qs = params.toString();

  return useQuery({
    queryKey: ['cases', filters],
    queryFn: () => api.get<CaseWithProduct[]>(`/api/cases${qs ? `?${qs}` : ''}`),
  });
}

export function useCase(id: string | undefined) {
  return useQuery({
    queryKey: ['cases', id],
    queryFn: () => api.get<CaseWithProduct>(`/api/cases/${id}`),
    enabled: !!id,
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCase) => api.post<CaseWithProduct>('/api/cases', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cases'] }),
  });
}

export function useUpdateCase(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCase) => api.patch<CaseWithProduct>(`/api/cases/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['cases', id] });
    },
  });
}

// -- Assessments --

export interface AssessmentResponse {
  id?: string;
  caseId: string;
  answersJson: Record<string, unknown>;
  derivedStateJson: Record<string, unknown> | null;
  engineOutputJson: Record<string, unknown> | null;
  completenessStatusJson: Record<string, unknown> | null;
  updatedAt?: string;
}

export function useAssessment(caseId: string | undefined) {
  return useQuery({
    queryKey: ['assessment', caseId],
    queryFn: () => api.get<AssessmentResponse>(`/api/cases/${caseId}/assessment`),
    enabled: !!caseId,
  });
}

export interface SaveAssessmentPayload {
  /** Incremental delta — only the field IDs whose values changed since last sync. */
  delta?: Record<string, unknown>;
  /** Full snapshot — used for the very first save or after reconciliation. */
  answersJson?: Record<string, unknown>;
  /** ISO timestamp from the latest assessment row the client was working from. */
  expectedUpdatedAt?: string | null;
}

export interface AssessmentConflict {
  code: 'ASSESSMENT_CONFLICT';
  serverUpdatedAt: string;
}

export function isAssessmentConflict(err: unknown): err is Error & { conflict: AssessmentConflict } {
  return (
    err instanceof Error &&
    'conflict' in err &&
    typeof (err as { conflict?: AssessmentConflict }).conflict?.serverUpdatedAt === 'string'
  );
}

export function useSaveAssessment(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveAssessmentPayload) =>
      api.put<AssessmentResponse>(`/api/cases/${caseId}/assessment`, payload),
    onSuccess: (data) => {
      // Replace the cached assessment with the server-authoritative result
      // so the reconciliation UI sees the new updatedAt + engine output
      // without needing a separate fetch.
      qc.setQueryData(['assessment', caseId], data);
      qc.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });
}

// -- Feature flags --

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  config: Record<string, unknown> | null;
}

export const FEATURE_FLAGS = Object.freeze({
  EvidenceUploads: 'evidence_uploads',
  Comments: 'comments',
  Reviews: 'reviews',
  Exports: 'exports',
  SectionLocking: 'section_locking',
} as const);

export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => api.get<{ flags: FeatureFlag[] }>('/api/feature-flags'),
    staleTime: 60_000,
  });
}

export function useFeatureFlag(key: string): boolean {
  const { data } = useFeatureFlags();
  return data?.flags.find((f) => f.key === key)?.enabled ?? false;
}

// -- Audit --

interface AuditEventWithUser extends AuditEvent {
  performedBy: { id: string; name: string; email: string };
}

export function useCaseHistory(caseId: string | undefined) {
  return useQuery({
    queryKey: ['case-history', caseId],
    queryFn: () => api.get<AuditEventWithUser[]>(`/api/cases/${caseId}/history`),
    enabled: !!caseId,
  });
}
