import React from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import PayerPortal from './PayerPortal';
import TreasurerDashboard from './TreasurerDashboard';

function RootView() {
  const [searchParams] = useSearchParams();
  if (searchParams.has('title') || searchParams.has('category') || searchParams.has('amount')) {
    return <PayerPortal />;
  }
  return <TreasurerDashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootView />} />
        <Route path="/payer" element={<PayerPortal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;