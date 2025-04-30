// src/components/ConsentList.tsx
import React from 'react';
import { ConsentRecord } from '../types'; // Ensure this path is correct and type has recordId
import { revokeConsent } from '../services/contractService'; // Adjust path
import { Calendar, ShieldAlert, ShieldCheck, Trash2, AlertTriangle } from 'lucide-react'; // Use more specific icons

interface ConsentListProps {
  consents: ConsentRecord[];
  onConsentRevoked: () => void; // Callback to refresh list in parent
}

// Helper function to format the Unix timestamp (seconds)
const formatTimestamp = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return 'N/A';
  try {
    // Format as Locale Date String (adjust options if needed)
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
        year: 'numeric', month: 'numeric', day: 'numeric'
    });
  } catch (e) {
      console.error("Error formatting timestamp:", e);
      return 'Invalid Date';
  }
};

// Helper to determine current status text, icon, and color
const getConsentStatus = (consent: ConsentRecord): { text: string; Icon: React.ElementType; colorClass: string } => {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    if (!consent.isActive) {
        // If the consent was explicitly marked inactive (revoked)
        return { text: 'Revoked', Icon: ShieldAlert, colorClass: 'text-red-600 bg-red-100 border-red-300' };
    }
    if (consent.expiryDate < now) {
        // If it's still marked active but the expiry date has passed
        return { text: 'Expired', Icon: AlertTriangle, colorClass: 'text-orange-600 bg-orange-100 border-orange-300' };
    }
    // Otherwise, it's currently active and valid
    return { text: 'Active', Icon: ShieldCheck, colorClass: 'text-green-600 bg-green-100 border-green-300' };
};


const ConsentList: React.FC<ConsentListProps> = ({ consents, onConsentRevoked }) => {

  const handleRevoke = async (consentId: number) => { // Changed type to number
    // Add a confirmation dialog
    if (!window.confirm(`Are you sure you want to revoke Consent ID ${consentId}? This action cannot be undone and the provider will lose access immediately.`)) {
        return;
    }
    console.log(`Attempting to revoke consent ID: ${consentId}`);
    try {
        // Assume revokeConsent takes a number and returns boolean
        const success = await revokeConsent(consentId);
        if (success) {
            console.log(`Consent ${consentId} revoked successfully via contract.`);
            alert(`Consent ID ${consentId} has been revoked.`);
            onConsentRevoked(); // Trigger list refresh in the parent component
        } else {
            // revokeConsent service function might return false if tx fails but doesn't throw
            console.error(`Revoke transaction failed for consent ID ${consentId}.`);
            alert(`Failed to revoke consent ID ${consentId}. The transaction may have failed.`);
        }
    } catch (error: any) {
        console.error(`Error revoking consent ${consentId}:`, error);
        alert(`Error revoking consent: ${error.message || 'Unknown error. Check console.'}`);
    }
  };

  // Handle empty list state
  if (!consents || consents.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
        <p className="text-gray-600">No consents have been granted yet.</p>
        {/* Optional: Add guidance */}
        {/* <p className="text-sm text-gray-500 mt-2">Use the "Grant New Consent" button to share records.</p> */}
      </div>
    );
  }

  // Render the table
  return (
    <div className="overflow-x-auto shadow border border-gray-200 rounded-lg"> {/* Added container styles */}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Updated Columns */}
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Record ID
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Consent ID
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Provider Address
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Purpose
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expiry Date
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {consents.map((consent) => {
            const statusInfo = getConsentStatus(consent);
            // Determine if revoke should be possible (only if currently Active)
            const canRevoke = statusInfo.text === 'Active';

            return (
              <tr key={consent.id} className={`${!canRevoke ? 'opacity-70 bg-gray-50' : 'hover:bg-gray-50'} transition-opacity`}>
                {/* Display Record ID */}
                <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                  {consent.recordId}
                </td>
                 {/* Display Consent ID */}
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {consent.id}
                </td>
                 {/* Display Provider Address (truncated) */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  <code className="text-xs break-all bg-gray-100 px-1 py-0.5 rounded" title={consent.providerAddress}>
                    {consent.providerAddress.substring(0, 6)}...{consent.providerAddress.substring(consent.providerAddress.length - 4)}
                  </code>
                </td>
                 {/* Display Purpose */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {consent.purpose}
                </td>
                 {/* Display Expiry Date */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                   <span className="flex items-center">
                       <Calendar size={14} className="mr-1.5 text-gray-400"/>
                       {formatTimestamp(consent.expiryDate)}
                   </span>
                </td>
                 {/* Display Status Badge */}
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                   <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.colorClass}`}>
                       <statusInfo.Icon size={12} className="mr-1"/>
                       {statusInfo.text}
                   </span>
                </td>
                 {/* Display Revoke Action */}
                <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => handleRevoke(consent.id)}
                    disabled={!canRevoke} // Disable if not Active
                    className={`p-1 rounded ${canRevoke ? 'text-red-600 hover:text-red-800 hover:bg-red-100' : 'text-gray-400 cursor-not-allowed'}`}
                    title={canRevoke ? `Revoke Consent ID ${consent.id}` : "Cannot revoke inactive/expired consent"}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ConsentList;