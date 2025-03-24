import React, { useState } from 'react';
import { grantConsent } from '../services/contractService';

interface ConsentFormProps {
  onSuccess: () => void;
}

const ConsentForm: React.FC<ConsentFormProps> = ({ onSuccess }) => {
  const [providerAddress, setProviderAddress] = useState('');
  const [dataType, setDataType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const dataTypes = [
    'Mental Health Assessment',
    'Therapy Session Notes',
    'Medication History',
    'Treatment Plan',
    'Progress Notes',
    'Diagnostic Results'
  ];

  const purposes = [
    'Treatment',
    'Research',
    'Payment',
    'Healthcare Operations',
    'Legal Requirements'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!providerAddress || !dataType || !purpose || !expiryDate) {
      setError('All fields are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await grantConsent(providerAddress, dataType, purpose, expiryDate);
      
      if (success) {
        setProviderAddress('');
        setDataType('');
        setPurpose('');
        setExpiryDate('');
        onSuccess();
      } else {
        setError('Failed to grant consent. Please try again.');
      }
    } catch (err) {
      console.error('Error granting consent:', err);
      setError('An error occurred while processing your request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Grant New Consent</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="providerAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Provider Wallet Address
          </label>
          <input
            type="text"
            id="providerAddress"
            value={providerAddress}
            onChange={(e) => setProviderAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0x..."
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="dataType" className="block text-sm font-medium text-gray-700 mb-1">
            Data Type
          </label>
          <select
            id="dataType"
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select data type</option>
            {dataTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
            Purpose
          </label>
          <select
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select purpose</option>
            {purposes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-6">
          <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
            Expiry Date
          </label>
          <input
            type="date"
            id="expiryDate"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            min={today}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-70"
        >
          {isSubmitting ? 'Processing...' : 'Grant Consent'}
        </button>
      </form>
    </div>
  );
};

export default ConsentForm;