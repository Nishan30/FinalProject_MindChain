import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, User, FileText, Settings, Shield } from 'lucide-react';
import ConnectWallet from './ConnectWallet';
import { useWallet } from '../context/WalletContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { isConnected, user } = useWallet();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl text-gray-800">MindChain</span>
            </Link>
          </div>
          
          {isConnected && (
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/dashboard')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </Link>
              
              {user?.role === 'patient' && (
                <>
                  <Link
                    to="/consents"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/consents')
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <Shield size={16} />
                      <span>Consents</span>
                    </div>
                  </Link>
                  <Link
                    to="/records"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/records')
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <FileText size={16} />
                      <span>My Records</span>
                    </div>
                  </Link>
                </>
              )}
              
              {user?.role === 'provider' && (
                <>
                  <Link
                    to="/patients"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/patients')
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <User size={16} />
                      <span>Patients</span>
                    </div>
                  </Link>
                </>
              )}
              
              <Link
                to="/profile"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/profile')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <Settings size={16} />
                  <span>Profile</span>
                </div>
              </Link>
            </div>
          )}
          
          <div className="flex items-center">
            <ConnectWallet />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;