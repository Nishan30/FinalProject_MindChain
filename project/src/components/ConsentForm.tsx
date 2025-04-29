// components/ConsentForm.tsx
import React, { useState } from 'react';
import { grantConsent } from '../services/contractService'; // Assuming this service is updated
import { AlertCircle } from 'lucide-react';

interface ConsentFormProps {
  onSuccess: (consentData: { id: number | null; providerAddress: string }) => void;
}

const ConsentForm: React.FC<ConsentFormProps> = ({ onSuccess }) => {
  const [providerAddress, setProviderAddress] = useState('');
  const [dataType, setDataType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false); // Renamed for consistency
  const [error, setError] = useState('');

  // Predefined options for dropdowns
  const dataTypes = [
    'Mental Health Assessment',
    'Therapy Session Notes',
    'Medication History',
    'Treatment Plan',
    'Progress Notes',
    'Diagnostic Results',
    'Other' // Added an 'Other' option
  ];

  const purposes = [
    'Treatment',
    'Research',
    'Payment',
    'Healthcare Operations',
    'Legal Requirements',
    'Personal Access', // Added option
    'Other' // Added option
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- Input Validation ---
    if (!providerAddress || !dataType || !purpose || !expiryDate) {
      setError('All fields are required.');
      return;
    }
    // Basic Ethereum address format check
    if (!/^0x[a-fA-F0-9]{40}$/.test(providerAddress)) {
      setError('Invalid provider Ethereum address format.');
      return;
    }
    // Check if date is in the past
    const todayTimestamp = new Date().setHours(0, 0, 0, 0);
    const selectedTimestamp = new Date(expiryDate).getTime();
    if (selectedTimestamp < todayTimestamp) {
       setError('Expiry date cannot be in the past.');
       return;
    }
    // --- End Validation ---


    setLoading(true);
    try {
      // Call the updated grantConsent which returns the ID or null
      const newConsentId = await grantConsent(
        providerAddress,
        dataType,
        purpose,
        expiryDate
      );

      if (newConsentId !== null) {
        // Reset form only on successful ID retrieval
        setProviderAddress('');
        setDataType('');
        setPurpose('');
        setExpiryDate('');
        onSuccess({ id: newConsentId, providerAddress: providerAddress });
      } else {
        // Handle case where consent might be granted but ID wasn't retrieved (e.g., event parsing failed)
        setError('Consent may have been granted, but failed to retrieve Consent ID. Please check the consent list or blockchain explorer.');
        onSuccess({ id: null, providerAddress: providerAddress });
      }
    } catch (err: any) {
      console.error('Error granting consent:', err);
      // Try to get a more specific error message
      const message = err.reason || err.message || 'An error occurred while processing your request. Check console for details.';
      setError(message.length > 150 ? 'An unexpected error occurred.' : message);
      onSuccess({ id: null, providerAddress: providerAddress });
    } finally {
      setLoading(false);
    }
  };

  // Calculate minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    // Removed the extra wrapping div, assuming parent provides background/padding
    <form onSubmit={handleSubmit} className="space-y-4">
       {/* Error Display */}
       {error && (
         <div className="p-3 bg-red-100 text-red-700 rounded-md flex items-center text-sm">
            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
           <span>{error}</span>
         </div>
       )}

      {/* Provider Address Input */}
      <div>
        <label htmlFor="providerAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Provider Wallet Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="providerAddress"
          value={providerAddress}
          onChange={(e) => setProviderAddress(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0x..."
          required // HTML5 validation
        />
      </div>

      {/* Data Type Select */}
      <div>
        <label htmlFor="dataType" className="block text-sm font-medium text-gray-700 mb-1">
          Data Type <span className="text-red-500">*</span>
        </label>
        <select
          id="dataType"
          value={dataType}
          onChange={(e) => setDataType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" // Added bg-white for consistency
          required
        >
          <option value="" disabled>Select data type...</option>
          {dataTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Purpose Select */}
      <div>
        <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
          Purpose <span className="text-red-500">*</span>
        </label>
        <select
          id="purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" // Added bg-white
          required
        >
          <option value="" disabled>Select purpose...</option>
          {purposes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Expiry Date Input */}
      <div>
        <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
          Expiry Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="expiryDate"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          min={today} // Prevent selecting past dates
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-70 flex justify-center items-center" // Added flex for spinner alignment
      >
        {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Grant Consent'
          )}
      </button>
    </form>
  );
};

export default ConsentForm;