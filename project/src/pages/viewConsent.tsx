// pages/ViewConsentPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
// Import getConsentDetailsById AND potentially a function to check consent validity client-side if needed
import { getConsentDetailsById } from '../services/contractService';
import { ConsentRecord } from '../types';
// Added FileSearch icon for the new button
import { Eye, AlertCircle, Search, Info, FileSearch } from 'lucide-react';

// Helper to format timestamp
const formatTimestamp = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString();
};

// Helper to check if consent is currently valid
const isConsentValidNow = (consent: ConsentRecord | null, currentProviderAddress: string | undefined): boolean => {
    if (!consent || !currentProviderAddress) return false;
    const nowTimestamp = Math.floor(Date.now() / 1000);
    return (
        consent.isActive &&
        consent.expiryDate >= nowTimestamp &&
        consent.providerAddress.toLowerCase() === currentProviderAddress.toLowerCase()
    );
};


const ViewConsentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWallet(); // User contains address and role
  const [consentIdInput, setConsentIdInput] = useState('');
  const [consentDetails, setConsentDetails] = useState<ConsentRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Determine if the loaded consent is valid for the current user RIGHT NOW
  const canViewRecords = isConsentValidNow(consentDetails, user?.address);

  // Redirect if not connected or not a provider
  useEffect(() => {
    if (!user) {
      navigate('/');
    } else if (user.role !== 'provider') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleFetchConsent = async (e?: React.FormEvent) => {
    // ... (keep existing fetch logic) ...
    e?.preventDefault();
    setError('');
    setInfoMessage('');
    setConsentDetails(null);

    const consentId = parseInt(consentIdInput, 10);
    if (isNaN(consentId) || consentId <= 0) {
      setError('Please enter a valid Consent ID (a positive number).');
      return;
    }

    setLoading(true);
    try {
      const details = await getConsentDetailsById(consentId);
      if (details) {
         setConsentDetails(details);
         // Check if the consent was granted to someone else
         if (details.providerAddress.toLowerCase() !== user?.address.toLowerCase()) {
            setInfoMessage('Note: This consent was granted to a different provider address. You cannot view records with this consent.');
         } else if (!isConsentValidNow(details, user?.address)) {
             setInfoMessage('Note: This consent is inactive or has expired. You cannot view records with this consent.');
         }
      } else {
        setError(`Consent with ID ${consentId} not found.`);
      }
    } catch (err: any) {
      console.error('Error fetching consent details:', err);
      setError(err.message || 'An error occurred while fetching consent details.');
    } finally {
      setLoading(false);
    }
  };

  // --- Function to navigate to patient records page ---
  const navigateToPatientRecords = () => {
      if (consentDetails?.patientAddress && canViewRecords) {
           // Pass patient address and optionally the consented data type
           // The receiving page will use these to fetch and filter records
           navigate(`/patient-records/${consentDetails.patientAddress}?dataType=${encodeURIComponent(consentDetails.dataType)}`);
      }
  };


  if (!user || user.role !== 'provider') {
     return null;
  }


  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Eye className="h-6 w-6 text-blue-600 mr-2" />
        <h1 className="text-2xl font-bold text-gray-900">Verify Patient Consent</h1>
      </div>

      {/* Search Form */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
         {/* ... (keep existing form) ... */}
         <form onSubmit={handleFetchConsent} className="flex items-end gap-4">
          <div className="flex-grow">
            <label htmlFor="consentId" className="block text-sm font-medium text-gray-700 mb-1">
              Enter Consent ID from Patient
            </label>
            <input
              type="number"
              id="consentId"
              value={consentIdInput}
              onChange={(e) => setConsentIdInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 123"
              min="1"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !consentIdInput}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-70"
          >
            <Search size={18} className="mr-1" />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Error/Info Messages */}
      {error && ( <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md flex items-center"> {/* ... */} </div> )}
      {infoMessage && ( <div className="mb-6 p-4 bg-blue-100 text-blue-700 rounded-md flex items-center"> {/* ... */} </div> )}


      {/* Consent Details Display */}
      {consentDetails && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-800">Consent Details (ID: {consentDetails.id})</h2>
             {/* --- ADDED BUTTON --- */}
             {canViewRecords && (
                 <button
                   onClick={navigateToPatientRecords}
                   className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                 >
                   <FileSearch size={14} className="-ml-0.5 mr-1.5" />
                   View Patient Records ({consentDetails.dataType})
                 </button>
             )}
             {/* --- END ADDED BUTTON --- */}
          </div>
          <div className="p-6 space-y-3">
            {/* ... (keep existing details display: Patient Address, Provider Address, etc.) ... */}
            <p><strong>Patient Address:</strong> <span className="font-mono text-sm break-all">{consentDetails.patientAddress}</span></p>
            <p><strong>Provider Address:</strong> <span className="font-mono text-sm break-all">{consentDetails.providerAddress}</span></p>
            <p><strong>Data Type Consented:</strong> {consentDetails.dataType}</p>
            <p><strong>Purpose:</strong> {consentDetails.purpose}</p>
            <p><strong>Expiry Date:</strong> {formatTimestamp(consentDetails.expiryDate)}</p>
            <p><strong>Current Status:</strong> {/* ... status badge ... */} </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewConsentPage;