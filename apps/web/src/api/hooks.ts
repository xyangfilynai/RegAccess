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

interface AssessmentResponse {
  id?: string;
  caseId: string;
  answersJson: Record<string, unknown>;
  derivedStateJson: Record<string, unknown> | null;
  engineOutputJson: Record<string, unknown> | null;
  completenessStatusJson: Record<string, unknown> | null;
}

export function useAssessment(caseId: string | undefined) {
  return useQuery({
    queryKey: ['assessment', caseId],
    queryFn: () => api.get<AssessmentResponse>(`/api/cases/${caseId}/assessment`),
    enabled: !!caseId,
  });
}

export function useSaveAssessment(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answersJson: Record<string, unknown>) =>
      api.put<AssessmentResponse>(`/api/cases/${caseId}/assessment`, { answersJson }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment', caseId] });
      qc.invalidateQueries({ queryKey: ['cases', caseId] });
    },
  });
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
