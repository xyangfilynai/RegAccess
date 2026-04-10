import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import { AuthenticatedLayout } from './auth/AuthenticatedLayout';
import { LoginPage } from './auth/LoginPage';

const PortfolioDashboard = lazy(() =>
  import('./enterprise/pages/PortfolioDashboard').then((m) => ({ default: m.PortfolioDashboard })),
);
const CreateCasePage = lazy(() =>
  import('./enterprise/pages/CreateCasePage').then((m) => ({ default: m.CreateCasePage })),
);
const CaseDetailPage = lazy(() =>
  import('./enterprise/pages/CaseDetailPage').then((m) => ({ default: m.CaseDetailPage })),
);

const RouteFallback = () => <div style={{ padding: '32px 24px', color: '#6b7280' }}>Loading…</div>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthenticatedLayout />}>
            <Route
              path="/"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <PortfolioDashboard />
                </Suspense>
              }
            />
            <Route
              path="/cases/new"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <CreateCasePage />
                </Suspense>
              }
            />
            <Route
              path="/cases/:id"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <CaseDetailPage />
                </Suspense>
              }
            />
            {/* TODO: Add routes for products management */}
            {/* TODO: Add routes for organization settings */}
            {/* TODO: Add routes for evidence uploads, reviews, approvals, exports */}
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
