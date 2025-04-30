// pages/ViewConsentPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
// Import getConsentDetailsById
import { getConsentDetailsById } from '../services/contractService';
import { ConsentRecord } from '../types'; // Ensure this type matches the new structure (with recordId)
import { Eye, AlertCircle, Search, Info, FileSearch, Lock, Unlock, X, AlertTriangle } from 'lucide-react'; // Added Lock/Unlock/X

// Helper to format timestamp (seconds to locale date string)
const formatTimestamp = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return 'N/A';
  try {
    // Multiply by 1000 for milliseconds
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
        year: 'numeric', month: 'numeric', day: 'numeric',
        // Optionally add time: hour: 'numeric', minute: 'numeric'
    });
  } catch (e) {
      console.error("Error formatting timestamp:", e);
      return 'Invalid Date';
  }
};

// Helper to check if the fetched consent is currently valid FOR the logged-in provider
const isConsentValidNow = (consent: ConsentRecord | null, currentProviderAddress: string | undefined): boolean => {
    if (!consent || !currentProviderAddress) return false;
    const nowTimestamp = Math.floor(Date.now() / 1000); // Current time in seconds
    return (
        consent.isActive && // Is the specific consent active?
        consent.expiryDate >= nowTimestamp && // Has it expired?
        // Does the consent belong to the currently logged-in provider?
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
  // This flag determines if the "View Record" button is shown/enabled
  const canViewAssociatedRecord = isConsentValidNow(consentDetails, user?.address);

  // Redirect if not connected or not a provider
  useEffect(() => {
    if (!user) {
      navigate('/');
    } else if (user.role !== 'provider') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch consent details when user searches
  const handleFetchConsent = async (e?: React.FormEvent) => {
    e?.preventDefault(); // Prevent default form submission if triggered by event
    setError('');
    setInfoMessage('');
    setConsentDetails(null); // Clear previous details

    const consentId = parseInt(consentIdInput, 10);
    if (isNaN(consentId) || consentId <= 0) {
      setError('Please enter a valid Consent ID (a positive number).');
      return;
    }

    setLoading(true);
    try {
      const details = await getConsentDetailsById(consentId);
      if (details) {
         setConsentDetails(details); // Store the fetched details

         // Provide feedback based on the fetched consent's validity for the CURRENT user
         if (details.providerAddress.toLowerCase() !== user?.address?.toLowerCase()) {
            setInfoMessage('Note: This consent was granted to a different provider address. You cannot use it to view the associated record.');
            setError(''); // Clear error as it's informational
         } else if (!details.isActive) {
             setInfoMessage('Note: This consent has been revoked by the patient.');
             setError('');
         } else if (details.expiryDate < Math.floor(Date.now() / 1000)) {
             setInfoMessage('Note: This consent has expired.');
             setError('');
         } else {
             // Consent seems valid for this provider
             setInfoMessage('Consent details loaded successfully.');
             setError('');
         }

      } else {
        setError(`Consent with ID ${consentId} not found.`);
        setInfoMessage('');
      }
    } catch (err: any) {
      console.error('Error fetching consent details:', err);
      setError(err.message || 'An error occurred while fetching consent details.');
      setInfoMessage('');
      setConsentDetails(null);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to the page to view the specific record associated with THIS consent
  // Inside ViewConsentPage.tsx

const navigateToPatientRecordViewer = () => {
  if (consentDetails?.patientAddress && consentDetails.recordId && canViewAssociatedRecord) {
       console.log(`Navigating to records for patient ${consentDetails.patientAddress}, highlighting record ${consentDetails.recordId}`);
       navigate(
           `/patient-records/${consentDetails.patientAddress}`, // Navigate to the EXISTING list page route
           {
               state: { // Pass the recordId in the navigation state
                   highlightRecordId: consentDetails.recordId
               }
           }
       );
  } else {
      console.error("Cannot navigate: Missing consent details, record ID, or consent is invalid.");
      alert("Cannot navigate. Consent details may be incomplete or the consent is invalid.");
  }
};


  // --- Render Logic ---

  // Render null or a loading indicator during initial auth checks
  if (!user || user.role !== 'provider') {
     return <div className="text-center p-10">Authenticating...</div>; // Or null
  }


  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <Eye className="h-7 w-7 text-blue-600 mr-3" />
        <h1 className="text-3xl font-bold text-gray-900">Verify Patient Consent</h1>
      </div>
       <p className="text-sm text-gray-600 -mt-4">
            Enter the Consent ID provided by the patient to check its details and validity for accessing a specific record.
       </p>

      {/* Search Form */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
         <form onSubmit={handleFetchConsent} className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <div className="flex-grow">
            <label htmlFor="consentId" className="block text-sm font-medium text-gray-700 mb-1">
              Enter Consent ID
            </label>
            <input
              type="number"
              id="consentId"
              value={consentIdInput}
              onChange={(e) => {
                setConsentIdInput(e.target.value);
                // Optionally clear results when input changes
                // setConsentDetails(null);
                // setError('');
                // setInfoMessage('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 123"
              min="1"
              required // Add basic HTML5 validation
            />
          </div>
          <button
            type="submit"
            disabled={loading || !consentIdInput}
            className="w-full sm:w-auto flex justify-center items-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Search size={18} className="-ml-1 mr-2" />
            {loading ? 'Searching...' : 'Verify Consent'}
          </button>
        </form>
      </div>

      {/* Error/Info Messages Area */}
      {/* Using key prop to force re-render on message change for animations */}
      {error && (
        <div key={`err-${error}`} className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-start animate-fade-in">
            <AlertCircle size={20} className="mr-3 flex-shrink-0 text-red-500 mt-0.5" />
            <div className="flex-grow">
                <h3 className="font-semibold">Error</h3>
                <p className="text-sm">{error}</p>
            </div>
             <button onClick={() => setError('')} className="ml-auto p-1 text-red-600 hover:text-red-800 -mt-1 -mr-1"><X size={18}/></button>
        </div>
      )}
      {infoMessage && (
        <div key={`info-${infoMessage}`} className="p-4 bg-blue-50 text-blue-700 rounded-md border border-blue-200 flex items-start animate-fade-in">
            <Info size={20} className="mr-3 flex-shrink-0 text-blue-500 mt-0.5" />
             <div className="flex-grow">
                <h3 className="font-semibold">Information</h3>
                <p className="text-sm">{infoMessage}</p>
            </div>
             <button onClick={() => setInfoMessage('')} className="ml-auto p-1 text-blue-600 hover:text-blue-800 -mt-1 -mr-1"><X size={18}/></button>
        </div>
      )}


      {/* Consent Details Display Area */}
      {/* Only show this section if details are loaded AND there's no overriding error */}
      {consentDetails && !error && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 animate-fade-in">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
             <div>
                 <h2 className="text-xl font-semibold text-gray-800">
                     Consent Details
                 </h2>
                  <p className="text-sm text-gray-600">
                     ID: <span className="font-mono bg-gray-200 px-1 rounded">{consentDetails.id}</span>
                 </p>
             </div>
             {/* Conditionally render the button based on canViewAssociatedRecord */}
             {canViewAssociatedRecord ? (
                 <button
                   onClick={navigateToPatientRecordViewer}
                   title={`View Record ID ${consentDetails.recordId}`}
                   className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                 >
                   <FileSearch size={16} className="-ml-1 mr-2" />
                   View Associated Record ({consentDetails.recordId})
                 </button>
             ) : (
                  <span
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed"
                      title="Cannot view record: Consent invalid, expired, revoked, or for another provider."
                    >
                       <Lock size={16} className="-ml-1 mr-2" />
                       Cannot View Record
                  </span>
             )}
          </div>

          {/* Card Body */}
          <div className="p-6 space-y-4">
            {/* Use grid for better alignment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
                <div className="sm:col-span-1 font-medium text-gray-600">Patient Address:</div>
                <div className="sm:col-span-2 font-mono text-gray-800 break-all">{consentDetails.patientAddress}</div>

                <div className="sm:col-span-1 font-medium text-gray-600">Provider Address:</div>
                <div className="sm:col-span-2 font-mono text-gray-800 break-all">{consentDetails.providerAddress}</div>

                {/* Display Record ID instead of Data Type */}
                <div className="sm:col-span-1 font-medium text-gray-600">Record Consented To:</div>
                <div className="sm:col-span-2 font-semibold text-gray-800">ID {consentDetails.recordId}</div>

                <div className="sm:col-span-1 font-medium text-gray-600">Purpose:</div>
                <div className="sm:col-span-2 text-gray-800">{consentDetails.purpose}</div>

                <div className="sm:col-span-1 font-medium text-gray-600">Expiry Date:</div>
                <div className="sm:col-span-2 text-gray-800">{formatTimestamp(consentDetails.expiryDate)}</div>

                <div className="sm:col-span-1 font-medium text-gray-600">Current Status:</div>
                <div className="sm:col-span-2">
                    {/* Status Badge Logic */}
                    {consentDetails.providerAddress.toLowerCase() !== user?.address?.toLowerCase() ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                           <AlertTriangle size={12} className="mr-1" /> Belongs to other provider
                        </span>
                    ) : !consentDetails.isActive ? (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                           <X size={12} className="mr-1" /> Revoked
                         </span>
                    ): consentDetails.expiryDate < Math.floor(Date.now() / 1000) ? (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
                            <AlertTriangle size={12} className="mr-1" /> Expired
                         </span>
                    ) : (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                            <Unlock size={12} className="mr-1" /> Active & Valid
                         </span>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewConsentPage;

// Add CSS for fade-in animation if needed (e.g., in index.css)
/*
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
.animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
*/