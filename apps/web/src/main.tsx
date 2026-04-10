import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import { PortfolioDashboard } from './enterprise/pages/PortfolioDashboard';
import { CreateCasePage } from './enterprise/pages/CreateCasePage';
import { CaseDetailPage } from './enterprise/pages/CaseDetailPage';

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
          <Route path="/" element={<PortfolioDashboard />} />
          <Route path="/cases/new" element={<CreateCasePage />} />
          <Route path="/cases/:id" element={<CaseDetailPage />} />
          {/* TODO: Add routes for products management */}
          {/* TODO: Add routes for organization settings */}
          {/* TODO: Add routes for evidence uploads, reviews, approvals, exports */}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
