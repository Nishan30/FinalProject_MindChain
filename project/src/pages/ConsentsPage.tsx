import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import ConsentList from '../components/ConsentList';
import ConsentForm from '../components/ConsentForm';
import { getPatientConsents } from '../services/contractService';
import { ConsentRecord } from '../types';

const ConsentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWallet();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Redirect to home if not connected or not a patient
  useEffect(() => {
    if (!user) {
      navigate('/');
    } else if (user.role !== 'patient') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch consents
  const fetchConsents = async () => {
    if (!user?.address) return;
    
    try {
      setLoading(true);
      const data = await getPatientConsents(user.address);
      setConsents(data);
      setError('');
    } catch (err) {
      console.error('Error fetching consents:', err);
      setError('Failed to load consents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.address) {
      fetchConsents();
    }
  }, [user?.address]);

  const handleConsentSuccess = () => {
    setShowForm(false);
    fetchConsents();
  };

  if (!user || user.role !== 'patient') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Consent Management</h1>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          {showForm ? (
            'Cancel'
          ) : (
            <>
              <Plus size={18} className="mr-1" />
              New Consent
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {showForm && (
        <div className="mb-8">
          <ConsentForm onSuccess={handleConsentSuccess} />
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Your Active Consents</h2>
          <p className="text-sm text-gray-600">
            Manage who has access to your mental health data
          </p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-4">
              <p className="text-gray-600">Loading consents...</p>
            </div>
          ) : (
            <ConsentList consents={consents} onConsentRevoked={fetchConsents} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsentsPage;