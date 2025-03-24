import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, FileText, User, Clock } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWallet();

  // Redirect to home if not connected
  React.useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome, {user.role === 'patient' ? 'Patient' : 'Provider'}</h2>
        <p className="text-gray-600 mb-2">
          Wallet Address: {user.address.substring(0, 6)}...{user.address.substring(user.address.length - 4)}
        </p>
        <p className="text-gray-600">
          Role: <span className="capitalize">{user.role}</span>
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {user.role === 'patient' && (
          <>
            <div 
              onClick={() => navigate('/consents')}
              className="bg-white shadow-md rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-800">Manage Consents</h3>
              </div>
              <p className="text-gray-600">
                Control who has access to your mental health data and for what purpose.
              </p>
            </div>
            
            <div 
              onClick={() => navigate('/records')}
              className="bg-white shadow-md rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-800">My Records</h3>
              </div>
              <p className="text-gray-600">
                View and manage your mental health records securely stored on the blockchain.
              </p>
            </div>
          </>
        )}
        
        {user.role === 'provider' && (
          <>
            <div 
              onClick={() => navigate('/patients')}
              className="bg-white shadow-md rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-800">My Patients</h3>
              </div>
              <p className="text-gray-600">
                Access patient records for which you have been granted consent.
              </p>
            </div>
          </>
        )}
        
        <div 
          onClick={() => navigate('/profile')}
          className="bg-white shadow-md rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center mb-4">
            <div className="bg-gray-100 p-3 rounded-full">
              <User className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-800">Profile Settings</h3>
          </div>
          <p className="text-gray-600">
            Manage your account settings and preferences.
          </p>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Clock className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-800">Recent Activity</h3>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <p className="text-gray-600 text-center py-4">
            No recent activity to display.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;