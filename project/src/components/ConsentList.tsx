import React from 'react';
import { ConsentRecord } from '../types';
import { revokeConsent } from '../services/contractService';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface ConsentListProps {
  consents: ConsentRecord[];
  onConsentRevoked: () => void;
}

const ConsentList: React.FC<ConsentListProps> = ({ consents, onConsentRevoked }) => {
  const handleRevoke = async (consentId: string) => {
    if (window.confirm('Are you sure you want to revoke this consent?')) {
      try {
        const success = await revokeConsent(consentId);
        if (success) {
          onConsentRevoked();
        }
      } catch (error) {
        console.error('Error revoking consent:', error);
        alert('Failed to revoke consent. Please try again.');
      }
    }
  };

  if (consents.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-600">No consents found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Provider
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Data Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Purpose
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expiry
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {consents.map((consent) => (
            <tr key={consent.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {`${consent.providerAddress.substring(0, 6)}...${consent.providerAddress.substring(
                  consent.providerAddress.length - 4
                )}`}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {consent.dataType}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {consent.purpose}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="flex items-center">
                  <Clock size={16} className="mr-1 text-gray-500" />
                  {consent.expiryDate}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {consent.isActive ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle size={16} className="mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center text-red-600">
                    <XCircle size={16} className="mr-1" />
                    Inactive
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {consent.isActive && (
                  <button
                    onClick={() => handleRevoke(consent.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ConsentList;