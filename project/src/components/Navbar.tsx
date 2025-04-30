import React from 'react';
import { Link, useLocation } from 'react-router-dom';
// Added Briefcase, Eye, LogOut icons
import { Brain, User, FileText, Settings, Shield, Briefcase, Eye, LogOut } from 'lucide-react';
import { useWallet } from '../context/WalletContext'; // Use updated context

// Simple Connect/Disconnect Button Component (or keep your existing ConnectWallet)
const WalletButton: React.FC = () => {
  const { isConnected, disconnectWallet, user } = useWallet(); // Removed unused isConnecting, connectWallet

  // Render user info and disconnect button ONLY if connected
  if (isConnected && user) {
      return (
          <div className="flex items-center space-x-2">
              {/* Display User Info */}
              <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hidden sm:inline">
                  {user.address.substring(0, 6)}...{user.address.substring(user.address.length - 4)}
                  (<span className="capitalize">{user.role}</span>)
              </span>
              {/* Disconnect Button */}
              <button
                  onClick={disconnectWallet}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  title="Disconnect Wallet"
              >
                  <LogOut size={18} />
              </button>
          </div>
      );
  }

  // Render nothing if not connected
  return null;
};


const Navbar: React.FC = () => {
  const location = useLocation();
  // Get user object which contains the role
  const { isConnected, user } = useWallet();

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  // Helper for Nav Links
  const NavLink: React.FC<{ to: string; label: string; icon?: React.ReactNode }> = ({ to, label, icon }) => (
     <Link
       to={to}
       className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium ${
         isActive(to)
           ? 'bg-blue-100 text-blue-700'
           : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
       }`}
     >
       {icon}
       <span>{label}</span>
     </Link>
  );

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40"> {/* Made sticky */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl text-gray-800">MindChain</span>
            </Link>
          </div>

          {/* Center Links - Show only when connected */}
          {isConnected && user && ( // Check for user object too
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2"> {/* Reduced spacing */}
              <NavLink to="/dashboard" label="Dashboard" />

              {/* Patient Links */}
              {user.role === 'patient' && (
                <>
                  <NavLink to="/consents" label="Consents" icon={<Shield size={16} />} />
                  <NavLink to="/records" label="My Records" icon={<FileText size={16} />} />
                </>
              )}

              {/* Provider Links */}
              {user.role === 'provider' && (
                <>
                  <NavLink to="/view-patient-consents" label="Patient Data" icon={<User size={16} />} />
                  <NavLink to="/view-consent" label="Verify Consent" icon={<Eye size={16} />} />
                </>
              )}

              {/* Common Links */}
              <NavLink to="/profile" label="Profile" icon={<Settings size={16} />} />
            </div>
          )}

          {/* Right Side - Wallet Button */}
          <div className="flex items-center">
            <WalletButton /> {/* Use the new/existing wallet button */}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;