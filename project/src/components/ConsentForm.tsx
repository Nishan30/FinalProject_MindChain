// components/ConsentForm.tsx
import React, { useState } from 'react';
import { grantConsent } from '../services/contractService'; // Ensure this service is updated for record-specific consent
import { HealthRecord } from '../types'; // Import HealthRecord type
import { AlertCircle } from 'lucide-react';

interface ConsentFormProps {
  /** Array of the patient's health records to populate the dropdown. */
  records: HealthRecord[];
  /** Callback function triggered on successful consent grant and ID retrieval. */
  onSuccess: (consentData: {
    id: number | null; // Consent ID (null if retrieval failed but tx might be ok)
    providerAddress: string;
    recordId: number; // The ID of the record consented to
  }) => void;
  /** Optional callback function triggered specifically on errors during the process. */
  onError?: (message: string) => void;
}

const ConsentForm: React.FC<ConsentFormProps> = ({ records, onSuccess, onError }) => {
  // --- State Variables ---
  const [providerAddress, setProviderAddress] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string>(''); // Store as string from select value
  const [purpose, setPurpose] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Predefined Options ---
  const purposes = [
    'Treatment',
    'Consultation',
    'Second Opinion',
    'Research (Anonymized)',
    'Payment/Billing',
    'Healthcare Operations',
    'Legal Requirements',
    'Personal Access',
    'Other'
  ];

  // --- Helper Functions ---

  // Calculate minimum date for expiry (today)
  const today = new Date().toISOString().split('T')[0];

  // Resets form fields and error state
  const resetForm = () => {
    setProviderAddress('');
    setSelectedRecordId('');
    setPurpose('');
    setExpiryDate('');
    setError('');
  };

  // --- Form Submission Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    // --- Input Validation ---
    if (!providerAddress || !selectedRecordId || !purpose || !expiryDate) {
      setError('All fields are required, including selecting a record.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(providerAddress)) {
      setError('Invalid provider Ethereum address format (must start with 0x and be 42 chars long).');
      return;
    }
    const todayTimestamp = new Date().setHours(0, 0, 0, 0);
    const selectedTimestamp = new Date(expiryDate).getTime();
    if (isNaN(selectedTimestamp) || selectedTimestamp < todayTimestamp) { // Check for invalid date as well
       setError('Expiry date must be today or a future date.');
       return;
    }

    // Convert selectedRecordId string to number for contract call
    const numericRecordId = parseInt(selectedRecordId, 10);
    if (isNaN(numericRecordId) || numericRecordId <= 0) {
        // This should theoretically not happen with a controlled dropdown, but defensive check
        setError('Invalid record selected. Please refresh and try again.');
        return;
    }
    // --- End Validation ---

    setLoading(true); // Indicate processing starts
    try {
      // Call the updated grantConsent service function (expects recordId)
      console.log(`Submitting consent: Provider=${providerAddress}, RecordID=${numericRecordId}, Purpose=${purpose}, Expiry=${expiryDate}`);
      const newConsentId = await grantConsent(
        providerAddress,
        numericRecordId, // Pass the numeric record ID
        purpose,
        expiryDate       // Pass date string directly
      );

      // Check if a valid ID was returned (implies transaction success + event parsing success)
      if (newConsentId !== null && newConsentId > 0) { // Assuming IDs start from 1
        console.log(`Consent granted successfully, Consent ID: ${newConsentId}`);
        // Call the success callback with all relevant data
        onSuccess({ id: newConsentId, providerAddress: providerAddress, recordId: numericRecordId });
        resetForm(); // Clear the form on full success

      } else {
        // Handle case where transaction might be mined but event wasn't parsed correctly
        const msg = 'Consent transaction may have been sent, but failed to retrieve the Consent ID from events. Please verify on a block explorer or check your consents list later.';
        setError(msg);
        // Optionally call onError or onSuccess with null ID based on parent component needs
        if (onError) onError(msg);
        // onSuccess({ id: null, providerAddress: providerAddress, recordId: numericRecordId });
      }

    } catch (err: any) {
      console.error('Error during grantConsent transaction:', err);
      // Try to extract a meaningful error message
      const message = err.reason // Ethers V6 specific revert reason
                      || err.data?.message // Alternative location for revert reason
                      || err.message // General error message
                      || 'An unknown error occurred while processing the transaction.';
      // Prevent overly long technical messages
      const displayMessage = message.length > 200 ? 'An unexpected error occurred. Check console.' : message;
      setError(`Failed to grant consent: ${displayMessage}`);
      // Call the specific error callback if provided
      if (onError) onError(displayMessage);

    } finally {
      setLoading(false); // Indicate processing finished
    }
  };

  // --- Render ---
  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-gray-200 rounded-md bg-white shadow-sm">
       <h3 className="text-lg font-medium text-gray-800 border-b pb-2 mb-4">Grant Record Consent</h3>
       {/* Error Display Area */}
       {error && (
         <div className="p-3 bg-red-100 text-red-700 rounded-md flex items-center text-sm border border-red-200">
            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
           <span>{error}</span>
         </div>
       )}

      {/* Provider Address Input */}
      <div>
        <label htmlFor="consent-providerAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Provider Wallet Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="consent-providerAddress" // Use unique ID prefix if form is reusable
          value={providerAddress}
          onChange={(e) => setProviderAddress(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="0x..."
          required
          disabled={loading}
        />
      </div>

      {/* Select Record Dropdown */}
      <div>
        <label htmlFor="consent-recordId" className="block text-sm font-medium text-gray-700 mb-1">
          Select Record to Share <span className="text-red-500">*</span>
        </label>
        <select
          id="consent-recordId"
          value={selectedRecordId}
          onChange={(e) => setSelectedRecordId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
          required
          disabled={loading || records.length === 0} // Disable if no records or loading
        >
          <option value="" disabled>
            {records.length === 0 ? 'No records available to share' : '--- Select a record ---'}
          </option>
          {/* Only map if records exist */}
          {records.length > 0 && records.map((record) => (
            <option key={record.id} value={record.id.toString()}> {/* Value MUST be string for select */}
              {/* Truncate long titles if necessary */}
              {`ID: ${record.id} - ${record.title?.substring(0, 50) || 'Untitled Record'}${record.title && record.title.length > 50 ? '...' : ''}`}
            </option>
          ))}
        </select>
         {records.length === 0 && !loading && ( // Show helper text only if records are confirmed empty
             <p className="mt-1 text-xs text-gray-500">You must upload records before granting consent.</p>
         )}
      </div>

      {/* Purpose Select */}
      <div>
        <label htmlFor="consent-purpose" className="block text-sm font-medium text-gray-700 mb-1">
          Purpose of Sharing <span className="text-red-500">*</span>
        </label>
        <select
          id="consent-purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
          required
          disabled={loading}
        >
          <option value="" disabled>--- Select purpose ---</option>
          {purposes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Expiry Date Input */}
      <div>
        <label htmlFor="consent-expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
          Consent Expiry Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="consent-expiryDate"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          min={today} // Prevent selecting past dates using HTML5 validation
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          required
          disabled={loading}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !selectedRecordId || !providerAddress || !purpose || !expiryDate} // More robust disable check
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center"
      >
        {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Transaction...
            </>
          ) : (
            'Grant Consent for Selected Record'
          )}
      </button>
    </form>
  );
};

export default ConsentForm;