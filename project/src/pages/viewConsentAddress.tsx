// pages/ViewPatientConsentsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
// Import function to get consents FOR provider BY patient
import { getConsentsForProviderByPatient } from '../services/contractService';
import { ConsentRecord } from '../types'; // Ensure type matches record-specific structure
import { Users, AlertCircle, Search, Info, FileSearch, Lock, Unlock, X, AlertTriangle, Calendar } from 'lucide-react'; // Added Users icon

// Helper to format timestamp (reuse from other pages)
const formatTimestamp = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return 'N/A';
  try {
    return new Date(timestamp * 1000).toLocaleString(undefined, {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hour12: true
    });
  } catch (e) { return 'Invalid Date'; }
};

// Helper to check if a specific consent is currently valid
const isConsentActiveNow = (consent: ConsentRecord): boolean => {
    const nowTimestamp = Math.floor(Date.now() / 1000);
    return consent.isActive && consent.expiryDate >= nowTimestamp;
};

const ViewPatientConsentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWallet(); // Current logged-in provider info
  const [patientAddressInput, setPatientAddressInput] = useState('');
  const [searchedPatientAddress, setSearchedPatientAddress] = useState<string | null>(null); // Track which address was searched
  const [consentsForProvider, setConsentsForProvider] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Redirect if not connected or not a provider
  useEffect(() => {
    if (!user) navigate('/');
    else if (user.role !== 'provider') navigate('/dashboard');
  }, [user, navigate]);

  // Fetch consents granted by the searched patient TO the current provider
  const handleFetchPatientConsents = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setInfoMessage('');
    setConsentsForProvider([]); // Clear previous results
    setSearchedPatientAddress(null); // Reset searched address

    // Validate input address
    if (!patientAddressInput || !/^0x[a-fA-F0-9]{40}$/.test(patientAddressInput)) {
      setError('Please enter a valid Patient Ethereum address (0x...).');
      return;
    }
    if (!user?.address) {
        setError('Your provider address is not available. Please reconnect wallet.');
        return;
    }

    setLoading(true);
    setSearchedPatientAddress(patientAddressInput); // Store the address we are searching for

    try {
      console.log(`Fetching consents granted by ${patientAddressInput} to provider ${user.address}`);
      const details = await getConsentsForProviderByPatient(patientAddressInput, user.address);

      if (details && details.length > 0) {
         setConsentsForProvider(details);
         setInfoMessage(`Found ${details.length} consent(s) granted by this patient to you.`);
         setError('');
      } else {
        // No error, but no consents found for this provider
        setInfoMessage(`No specific record consents found granted by patient ${patientAddressInput.substring(0,6)}... to your address.`);
        setError('');
        setConsentsForProvider([]); // Ensure it's empty
      }
    } catch (err: any) {
      console.error('Error fetching consents for provider by patient:', err);
      setError(err.message || 'An error occurred while fetching consent details.');
      setInfoMessage('');
      setConsentsForProvider([]);
      setSearchedPatientAddress(null); // Clear searched address on error
    } finally {
      setLoading(false);
    }
  };

  // Navigate to view the specific record list page for the patient, highlighting the selected record
  const navigateToPatientRecordViewer = (patientAddress: string, recordId: number) => {
      console.log(`Navigating to records for patient ${patientAddress}, highlighting record ${recordId}`);
      navigate(
          `/patient-records/${patientAddress}`, // Navigate to the standard patient records list page
          {
              state: { // Pass the recordId to potentially highlight/auto-view
                  highlightRecordId: recordId
              }
          }
      );
  };

  // --- Render Logic ---

  if (!user || user.role !== 'provider') {
     return <div className="text-center p-10">Authenticating...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <Users className="h-7 w-7 text-purple-600 mr-3" />
        <h1 className="text-3xl font-bold text-gray-900">View Patient Consents</h1>
      </div>
       <p className="text-sm text-gray-600 -mt-4">
            Enter a patient's wallet address to see the specific record consents they have granted directly to you.
       </p>

      {/* Search Form */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
         <form onSubmit={handleFetchPatientConsents} className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <div className="flex-grow">
            <label htmlFor="patientAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Enter Patient Wallet Address
            </label>
            <input
              type="text" // Changed from number
              id="patientAddress"
              value={patientAddressInput}
              onChange={(e) => setPatientAddressInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
              placeholder="0x..."
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !patientAddressInput}
            className="w-full sm:w-auto flex justify-center items-center bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-md shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Search size={18} className="-ml-1 mr-2" />
            {loading ? 'Searching...' : 'Find Consents'}
          </button>
        </form>
      </div>

      {/* Error/Info Messages Area */}
      {error && (
        <div key={`err-${error}`} className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-start animate-fade-in">
            <AlertCircle size={20} className="mr-3 flex-shrink-0 text-red-500 mt-0.5" />
            <div className="flex-grow"><p className="text-sm">{error}</p></div>
             <button onClick={() => setError('')} className="ml-auto p-1 text-red-600 hover:text-red-800 -mt-1 -mr-1"><X size={18}/></button>
        </div>
      )}
      {/* Show info message only when a search has been performed */}
      {infoMessage && searchedPatientAddress && !error && (
        <div key={`info-${infoMessage}`} className="p-4 bg-blue-50 text-blue-700 rounded-md border border-blue-200 flex items-start animate-fade-in">
            <Info size={20} className="mr-3 flex-shrink-0 text-blue-500 mt-0.5" />
            <div className="flex-grow"><p className="text-sm">{infoMessage}</p></div>
             <button onClick={() => setInfoMessage('')} className="ml-auto p-1 text-blue-600 hover:text-blue-800 -mt-1 -mr-1"><X size={18}/></button>
        </div>
      )}

      {/* Consent List Display Area */}
      {/* Show only if a search was performed and there was no error */}
      {searchedPatientAddress && !error && !loading && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 animate-fade-in">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">
                  Consents Granted by Patient
              </h2>
              <p className="text-sm text-gray-600">
                  Address: <code className="text-xs bg-gray-200 px-1 rounded">{searchedPatientAddress}</code>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                  Showing consents granted specifically to your provider address ({user?.address ? `${user.address.substring(0, 6)}...` : 'N/A'}).
              </p>
          </div>

          {/* Card Body - Consent List */}
          <div className="p-0"> {/* Remove padding if list items have their own */}
             {consentsForProvider.length === 0 ? (
                // Message already shown in infoMessage, maybe add specific text here?
                 <p className="text-center text-gray-500 p-10">No consents found from this patient for you.</p>
             ) : (
                 <ul role="list" className="divide-y divide-gray-200">
                      {consentsForProvider.map((consent) => {
                          const isActive = isConsentActiveNow(consent);
                          return (
                              <li key={consent.id} className={`px-4 py-4 sm:px-6 ${!isActive ? 'bg-gray-50 opacity-70' : 'hover:bg-gray-50'}`}>
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                       {/* Consent Info */}
                                      <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-700">
                                              Consent ID: <span className="font-mono text-blue-700 bg-blue-50 px-1 rounded">{consent.id}</span>
                                          </p>
                                          <p className="text-sm text-gray-600 mt-1">
                                              For Record ID: <strong className="text-gray-800">{consent.recordId}</strong>
                                          </p>
                                          <p className="text-sm text-gray-500 mt-1">
                                              Purpose: <span className="italic">{consent.purpose}</span>
                                          </p>
                                      </div>
                                       {/* Status & Action */}
                                      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center gap-3 mt-2 sm:mt-0">
                                          {/* Status Badge */}
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                              isActive
                                                  ? 'bg-green-100 text-green-800 border-green-300'
                                                  : 'bg-red-100 text-red-800 border-red-300'
                                          }`}>
                                               {isActive ? <Unlock size={12} className="mr-1"/> : <Lock size={12} className="mr-1"/>}
                                              {isActive ? 'Active' : (consent.isActive ? 'Expired' : 'Revoked')}
                                          </span>
                                           {/* Expiry Date */}
                                          <p className="text-xs text-gray-500 flex items-center">
                                              <Calendar size={14} className="mr-1" />
                                              Expires: {formatTimestamp(consent.expiryDate)}
                                          </p>
                                          {/* View Record Button (only if active) */}
                                          {isActive && (
                                              <button
                                                 onClick={() => navigateToPatientRecordViewer(consent.patientAddress, consent.recordId)}
                                                 title={`View Record ID ${consent.recordId}`}
                                                 className="inline-flex items-center justify-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                               >
                                                 <FileSearch size={14} className="-ml-0.5 mr-1" />
                                                 View Record
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              </li>
                          );
                      })}
                 </ul>
             )}
          </div>
        </div>
      )}
      {/* Display initial prompt if no search has been made */}
      {!searchedPatientAddress && !loading && !error && (
           <div className="text-center p-8 text-gray-500">
               Enter a patient's address above to view consents they have granted to you.
           </div>
       )}
    </div>
  );
};

export default ViewPatientConsentsPage;