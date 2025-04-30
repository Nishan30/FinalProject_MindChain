// pages/ConsentsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Copy, Check, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useEncryptionKey } from '../context/KeyContext'; // Import key context hook
import ConsentList from '../components/ConsentList';
import ConsentForm from '../components/ConsentForm';
import { getPatientConsents, getPatientRecords } from '../services/contractService';
// Import the necessary crypto functions
import { shareKeyForRecord, getOrDeriveEncryptionKey } from '../services/cryptoService';
import { ConsentRecord, HealthRecord } from '../types';

const ConsentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWallet();
  // Use encryption key context for patient's key
  const { encryptionKey, setEncryptionKey, keyCacheRef } = useEncryptionKey();

  // State for data
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);

  // State for UI control
  const [loadingData, setLoadingData] = useState(true); // Combined loading state
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSharingKey, setIsSharingKey] = useState(false); // Tracks key sharing process

  // State for post-consent feedback
  const [grantedConsentInfo, setGrantedConsentInfo] = useState<{ id: number; provider: string; recordId: number } | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- Data Fetching Logic ---
  const fetchData = useCallback(async (showLoadingIndicator = true) => {
    if (!(user?.role === 'patient' && user?.address)) {
        setLoadingData(false); return;
    }
    if (showLoadingIndicator) setLoadingData(true);
    setError('');
    // Don't hide success message on automatic refresh, only when toggling form
    // setShowSuccessMessage(false);

    try {
      const [fetchedConsents, fetchedRecords] = await Promise.all([
        getPatientConsents(user.address),
        getPatientRecords(user.address)
      ]);
      setConsents(fetchedConsents);
      setRecords(fetchedRecords);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data.');
      setConsents([]); setRecords([]);
    } finally {
      if (showLoadingIndicator) setLoadingData(false);
    }
  }, [user?.role, user?.address]); // Dependencies ensure stability

  // --- Effects ---
  // Initial data fetch and redirection logic
  useEffect(() => {
    if (!user) navigate('/');
    else if (user.role !== 'patient') navigate('/dashboard');
    else if (user.address) fetchData();
    else { setLoadingData(false); setError("Wallet address not found."); }
  }, [user, navigate, fetchData]); // fetchData is stable due to useCallback

  // --- Event Handlers ---

  // Handler for successful consent grant from ConsentForm
  const handleConsentSuccess = async (consentData: { id: number | null; providerAddress: string; recordId: number }) => {
    setShowForm(false); // Close the form

    if (consentData.id !== null && consentData.id > 0) {
      setGrantedConsentInfo({ id: consentData.id, provider: consentData.providerAddress, recordId: consentData.recordId });
      setShowSuccessMessage(true); // Show consent grant success *first*

      // *** AUTOMATIC KEY SHARING ***
      setIsSharingKey(true); // Show key sharing indicator
      console.log(`Consent granted (ID: ${consentData.id}). Initiating key sharing...`);
      setError(''); // Clear previous errors before attempting key share

      let keyShareSuccess = false; // Track outcome
      try {
          // 1. Ensure patient's AES key is available (derive if needed)
          let patientKey = encryptionKey;
          if (!patientKey) {
              console.log("Patient key not in context, deriving...");
              patientKey = await getOrDeriveEncryptionKey(user!.address!, keyCacheRef.current); // User address MUST exist here
              if (patientKey) {
                  setEncryptionKey(patientKey); // Update context
                  console.log("Patient key derived and cached.");
              } else {
                  // Key derivation failed (user likely rejected signature)
                  throw new Error("Could not prepare your encryption key. Please try granting consent again and approve the signature request.");
              }
          }

          // 2. Perform the key sharing steps (wrap, upload, store hash)
          keyShareSuccess = await shareKeyForRecord(
              patientKey, // Pass the obtained CryptoKey
              consentData.recordId,
              consentData.providerAddress
          );

          if (!keyShareSuccess) {
               // Error was likely alerted in shareKeyForRecord, set general error too
               throw new Error("The automatic key sharing process failed. The provider will not be able to view the record.");
          } else {
              console.log("Key sharing process completed successfully.");
              // Optionally update UI further to confirm key sharing success
          }

      } catch (keyShareError: any) {
          console.error("Key Sharing Failed:", keyShareError);
          // Display error to the user, hide initial success message as the process failed
          setError(`Consent granted (ID: ${consentData.id}), BUT key sharing failed: ${keyShareError.message}.`);
          setShowSuccessMessage(false);
      } finally {
         setIsSharingKey(false); // Hide key sharing indicator
      }
      // --- End Key Sharing ---

      // Refresh the consents list regardless of key share outcome (consent *was* granted)
      fetchData(false); // Refresh without main loading indicator

    } else {
      // Consent ID retrieval failed from grantConsent call itself
      setError("Consent process finished, but failed to retrieve the Consent ID. Check form errors or blockchain explorer.");
      setShowSuccessMessage(false);
    }
  };

  // Handle errors reported directly by the ConsentForm
  const handleConsentError = (message: string) => {
      console.error("Consent Form Error:", message);
      setError(`Consent Grant Failed: ${message}`); // Show error
      setShowSuccessMessage(false);
  };

  // Handle copying the consent ID
  const handleCopyId = () => {
    if (grantedConsentInfo?.id) {
        navigator.clipboard.writeText(grantedConsentInfo.id.toString()).then(
            () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
            (err) => { console.error("Failed to copy Consent ID:", err); /* Maybe show tooltip error */ }
        );
      }
  };

  // Toggle form visibility
  const toggleForm = () => {
      setShowForm(!showForm);
      // Hide success message when toggling form
      setShowSuccessMessage(false);
      if (!showForm) {
          setError(''); // Clear error when opening form
      }
  };

  // --- Render Logic ---

  // Loading state for initial load
  if (loadingData && consents.length === 0 && records.length === 0) {
     return (
        <div className="flex justify-center items-center min-h-[400px]">
            <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="ml-4 text-lg text-gray-600">Loading Your Data...</p>
        </div>
     );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header and Toggle Button */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center">
          <Shield className="h-7 w-7 text-blue-600 mr-2" />
          <h1 className="text-3xl font-bold text-gray-900">Consent Management</h1>
        </div>
        <button
          onClick={toggleForm}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isSharingKey} // Disable while key sharing
        >
          {showForm ? (
            <><ChevronUp size={18} className="-ml-1 mr-1" /> Cancel Granting</>
          ) : (
            <><Plus size={18} className="-ml-1 mr-1" /> Grant New Consent</>
          )}
        </button>
      </div>

       {/* 2. Key Sharing Loading Indicator */}
       {isSharingKey && (
           <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 flex items-center animate-pulse">
               <svg className="animate-spin h-5 w-5 mr-3 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               <span>Sharing decryption key with provider... Please wait. This may involve wallet interactions.</span>
           </div>
       )}


      {/* 3. Success Message Area (Dismissible) */}
      {showSuccessMessage && grantedConsentInfo && !isSharingKey && (
        <div className="p-4 bg-green-100 text-green-800 rounded-md border border-green-200 flex justify-between items-start animate-fade-in">
          <div className="flex-grow pr-4">
             <p className="font-semibold text-base">Consent Granted & Key Shared Successfully!</p>
             <p className="text-sm mt-1">
               Consent ID <strong className="font-mono bg-green-200 px-1 rounded">{grantedConsentInfo.id}</strong> for Record ID <strong className="font-mono bg-green-200 px-1 rounded">{grantedConsentInfo.recordId}</strong> was granted to Provider <strong className="font-mono text-xs break-all">{grantedConsentInfo.provider}</strong>.
             </p>
             <div className="mt-1.5 flex items-center">
                 <p className="text-xs text-green-700">Share Consent ID:</p>
                 <button
                   onClick={handleCopyId}
                   className={`ml-2 p-1 rounded transition-colors duration-150 ${copied ? 'bg-green-300' : 'bg-green-200 hover:bg-green-300'}`}
                   title="Copy Consent ID"
                 >
                     {copied ? <Check size={14} className="text-green-800" /> : <Copy size={14} className="text-green-700" />}
                 </button>
             </div>
             <p className="text-xs mt-1 text-green-700 italic">The provider should now be able to access the record.</p>
          </div>
          <button onClick={() => setShowSuccessMessage(false)} className="p-1 text-green-600 hover:text-green-800 flex-shrink-0 -mt-1 -mr-1"><X size={20} /></button>
        </div>
      )}

      {/* 4. General Error Area (Show if not loading key share) */}
       {error && !isSharingKey && (
        <div key={`err-${error}`} className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-start animate-fade-in">
            <AlertTriangle size={20} className="mr-3 flex-shrink-0 text-red-500 mt-0.5" />
            <div className="flex-grow">
                <h3 className="font-semibold">Error</h3>
                <p className="text-sm">{error}</p>
            </div>
             <button onClick={() => setError('')} className="ml-auto p-1 text-red-600 hover:text-red-800 -mt-1 -mr-1"><X size={18}/></button>
        </div>
      )}


      {/* 5. Consent Form Section (Expandable/Collapsible) */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showForm ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {showForm && ( // Render contents only when expanded
              <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200 mt-4 mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-5">Grant New Consent Details</h2>
                  {loadingData ? (
                       <p className="text-gray-600">Loading records for form...</p>
                  ) : records.length === 0 ? (
                       <p className="text-orange-700 bg-orange-50 p-3 rounded border border-orange-200 text-sm">
                            <AlertTriangle size={16} className="inline mr-1" /> You must upload health records before granting consent.
                       </p>
                  ): (
                       <ConsentForm
                           records={records} // Pass fetched records
                           onSuccess={handleConsentSuccess}
                           onError={handleConsentError} // Pass error handler
                       />
                  )}
              </div>
          )}
       </div>


      {/* 6. Consent List Section */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Your Granted Consents</h2>
          <p className="text-sm text-gray-600 mt-1">
            List of specific record access permissions granted to providers.
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {/* Show loading within list area only if not initial load */}
           {loadingData && consents.length > 0 && (
                <div className="text-center py-5 text-gray-500 text-sm">Refreshing list...</div>
           )}
           {/* Handle empty state */}
           {!loadingData && consents.length === 0 && !error ? (
            <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
              <p className="text-gray-600">You haven't granted any consents yet.</p>
              <p className="text-sm text-gray-500 mt-2">Click "Grant New Consent" above to share a specific record.</p>
            </div>
          ) : !error && consents.length > 0 ? ( // Show list if not loading and no error and consents exist
            <ConsentList consents={consents} onConsentRevoked={() => fetchData(false)} /> // Refresh without main loading
          ) : null /* Error is handled above, loading handled above */
          }
        </div>
      </div>
    </div>
  );
};

export default ConsentsPage;