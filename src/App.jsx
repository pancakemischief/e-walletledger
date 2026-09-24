import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PayerPortal from './PayerPortal';
import AdminDashboard from './TreasurerDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The default page (what the payer sees) */}
        <Route path="/" element={<PayerPortal />} />
        
        {/* The admin page (what Bea sees) */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;