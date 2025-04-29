import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import ConsentsPage from './pages/ConsentsPage';
import RecordsPage from './pages/RecordsPage';
import ViewConsentPage from './pages/viewConsent';
import PatientRecordsViewerPage from './pages/patientRecorderViewPage';
import { KeyProvider } from './context/KeyContext';

function App() {
  return (
    <WalletProvider>
      <KeyProvider>
        {/* The KeyProvider is used to manage the encryption key context */}
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/consents" element={<ConsentsPage />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/view-consent" element={<ViewConsentPage />} />
              <Route
             path="/patient-records/:patientAddress"
             element={<PatientRecordsViewerPage />}
           />
            </Routes>
          </main>
        </div>
      </Router>
      </KeyProvider>
    </WalletProvider>
  );
}

export default App;