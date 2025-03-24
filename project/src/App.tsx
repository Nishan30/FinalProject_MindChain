import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import ConsentsPage from './pages/ConsentsPage';
import RecordsPage from './pages/RecordsPage';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/consents" element={<ConsentsPage />} />
              <Route path="/records" element={<RecordsPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;