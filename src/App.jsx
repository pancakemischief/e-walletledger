import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PayerPortal from './PayerPortal';
import TreasurerDashboard from './TreasurerDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TreasurerDashboard />} />
        <Route path="/payer" element={<PayerPortal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;