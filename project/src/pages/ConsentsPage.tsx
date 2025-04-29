import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Copy, Check, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'; // Added X, Chevrons, AlertTriangle
import { useWallet } from '../context/WalletContext';
import ConsentList from '../components/ConsentList';
import ConsentForm from '../components/ConsentForm'; // Assuming ConsentForm calls grantConsent internally
import { getPatientConsents } from '../services/contractService';
import { ConsentRecord } from '../types';

const ConsentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWallet();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false); // Controls form visibility
  const [grantedConsentInfo, setGrantedConsentInfo] = useState<{ id: number; provider: string } | null>(null); // Store ID and provider
  const [showSuccessMessage, setShowSuccessMessage] = useState(false); // Control success message visibility
  const [copied, setCopied] = useState(false); // State for copy feedback

  // Redirect logic
  useEffect(() => {
    if (!user) {
      navigate('/');
    } else if (user?.role !== 'patient') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch consents function
  const fetchConsents = async () => {
    if (!user?.address) return;
    console.log("Fetching consents for:", user.address);
    try {
      setLoading(true);
      setError(''); // Clear previous errors before fetching
      const data = await getPatientConsents(user.address);
      setConsents(data);
    } catch (err) {
      console.error('Error fetching consents:', err);
      setError('Failed to load consents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch consents on mount or user change
  useEffect(() => {
    if (user?.address && user.role === 'patient') {
      fetchConsents();
    }
  }, [user?.address, user?.role]); // Dependencies

  // Handler for successful consent grant from ConsentForm
  const handleConsentSuccess = (consentData: { id: number | null; providerAddress: string }) => {
    setShowForm(false); // Close the form
    if (consentData.id !== null) {
        setGrantedConsentInfo({ id: consentData.id, provider: consentData.providerAddress });
        setShowSuccessMessage(true); // Show the success message
        fetchConsents(); // Refresh the list
    } else {
      // Error case handled within ConsentForm, but could show a generic error here too
      setError("Consent process completed, but failed to retrieve the Consent ID.");
      setShowSuccessMessage(false); // Ensure success message isn't shown
    }
  };

  // Handle copying the consent ID
  const handleCopyId = () => {
    if (grantedConsentInfo?.id) {
      navigator.clipboard.writeText(grantedConsentInfo.id.toString()).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      });
    }
  };

  // Toggle form visibility
  const toggleForm = () => {
    setShowForm(!showForm);
    // Optionally hide success message when opening form if desired
    // if (!showForm) {
    //   setShowSuccessMessage(false);
    // }
  };

  // Basic loading/redirect state
  if (!user || user.role !== 'patient') {
    return null; // Or a loading spinner
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"> {/* Added space-y-6 */}

      {/* 1. Header and Toggle Button */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Consent Management</h1>
        </div>
        <button
          onClick={toggleForm}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
        >
          {showForm ? (
            <>
              <ChevronUp size={18} className="-ml-1 mr-1" />
              Cancel Granting Consent
            </>
          ) : (
            <>
              <Plus size={18} className="-ml-1 mr-1" />
              Grant New Consent
            </>
          )}
        </button>
      </div>

      {/* 2. Success Message Area (Dismissible) */}
      {showSuccessMessage && grantedConsentInfo && (
        <div className="p-4 bg-green-100 text-green-800 rounded-md border border-green-200 flex justify-between items-center">
          <div className="flex-grow pr-4">
             <p className="font-medium">Consent Granted Successfully!</p>
             <p className="text-sm mt-1">
               Consent ID: <strong className="font-mono">{grantedConsentInfo.id}</strong> granted to provider <strong className="font-mono text-xs break-all">{grantedConsentInfo.provider}</strong>.
               <button
                 onClick={handleCopyId}
                 className={`ml-2 p-1 rounded ${copied ? 'bg-green-200' : 'hover:bg-green-200'}`}
                 title="Copy ID"
               >
                 {copied ? <Check size={14} className="text-green-700" /> : <Copy size={14} className="text-green-700" />}
               </button>
             </p>
             <p className="text-xs mt-1">Please share this ID with your provider.</p>
          </div>
          <button onClick={() => setShowSuccessMessage(false)} className="p-1 text-green-600 hover:text-green-800">
            <X size={18} />
          </button>
        </div>
      )}

      {/* 3. General Error Area */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md flex items-center">
           <AlertTriangle size={18} className="mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Consent Form Section (Expandable) */}
      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Grant New Consent Details</h2>
          {/* Pass the modified handler to ConsentForm */}
          <ConsentForm onSuccess={handleConsentSuccess} />
        </div>
      )}

      {/* 5. Consent List Section */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Your Granted Consents</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage permissions granted to providers. Active consents are highlighted.
          </p>
        </div>

        <div className="p-6">
          {loading ? (
             <div className="text-center py-10">
                <svg className="animate-spin mx-auto h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
               <p className="text-gray-600 mt-4">Loading consents...</p>
             </div>
          ) : consents.length === 0 && !error ? ( // Show message only if no error occurred
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <p className="text-gray-600">You haven't granted any consents yet.</p>
              <p className="text-sm text-gray-500 mt-2">Click "Grant New Consent" above to get started.</p>
            </div>
          ) : !error ? ( // Show list only if no error occurred
            // Pass user address if needed for revoke logic within ConsentList
            <ConsentList consents={consents} onConsentRevoked={fetchConsents} />
          ) : null /* Error message is already displayed above */
          }
        </div>
      </div>
    </div>
  );
};

export default ConsentsPage;

// --- You also need to update the ConsentForm component ---
// Make sure its `onSuccess` prop matches the expected signature:
// onSuccess: (consentData: { id: number | null; providerAddress: string }) => void;
// And that it calls this prop with the correct data on success.

// Example modification in ConsentForm's handleSubmit:
/*
const handleSubmit = async (e: React.FormEvent) => {
  // ... validation ...
  setLoading(true);
  let newConsentId: number | null = null;
  try {
    newConsentId = await grantConsent(providerAddress, dataType, purpose, expiryDate);
    if (newConsentId !== null) {
      // Reset form state...
      onSuccess({ id: newConsentId, providerAddress: providerAddress }); // Pass object
    } else {
      setError('Failed to retrieve Consent ID.');
      onSuccess({ id: null, providerAddress: providerAddress }); // Pass object even on partial failure
    }
  } catch (err: any) {
    // ... error handling ...
    onSuccess({ id: null, providerAddress: providerAddress }); // Pass object on error
  } finally {
    setLoading(false);
  }
};
*/