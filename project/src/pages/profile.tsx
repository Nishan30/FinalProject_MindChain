// src/pages/ProfilePage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Import Link for navigation
import { useWallet } from '../context/WalletContext'; // Adjust path
import { useEncryptionKey } from '../context/KeyContext'; // Adjust path (needed for patient key status)
import { User as UserIcon, Copy, Key, FileText, ShieldCheck, LogOut, CheckCircle, ShieldQuestion, Users, Eye } from 'lucide-react'; // Added relevant icons

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, disconnectWallet } = useWallet();
  // Get key status only if user is a patient
  const { encryptionKey: patientEncryptionKey } = useEncryptionKey();

  const [copied, setCopied] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Handle copying the address
  const handleCopyAddress = useCallback(() => {
    if (user?.address) {
      navigator.clipboard.writeText(user.address).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      }, (err) => {
          console.error("Failed to copy address:", err);
          alert("Failed to copy address.");
      });
    }
  }, [user?.address]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    console.log("Logging out...");
    await disconnectWallet(); // Call disconnect from WalletContext
    navigate('/'); // Redirect to home after logout
  }, [disconnectWallet, navigate]);

  // Render loading or null if user data isn't available yet (during initial load/redirect)
  if (!user) {
    return <div className="text-center p-10">Loading user data...</div>; // Or return null
  }

  const isPatient = user.role === 'patient';
  const isProvider = user.role === 'provider';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center">
        <UserIcon className="h-8 w-8 text-indigo-600 mr-3" />
        <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
      </div>

      {/* User Information Card */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Account Details</h2>
        </div>
        <div className="p-6 space-y-4">
             {/* Wallet Address */}
             <div>
                 <label className="block text-sm font-medium text-gray-500 mb-1">Wallet Address</label>
                 <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                     <code className="text-sm text-gray-700 break-all font-mono mr-4">
                         {user.address}
                     </code>
                     <button
                         onClick={handleCopyAddress}
                         className={`p-1.5 rounded-md transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                         title={copied ? "Copied!" : "Copy Address"}
                     >
                         {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                     </button>
                 </div>
             </div>

            {/* Role */}
            <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Account Role</label>
                <p className="text-md font-medium text-indigo-700 capitalize bg-indigo-50 px-3 py-1.5 rounded-md inline-block">
                    {user.role}
                </p>
            </div>
        </div>
      </div>


      {/* Actions Card */}
       <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Account Actions</h2>
            </div>
            <div className="p-6">
                <button
                    onClick={handleLogout}
                    className="w-full sm:w-auto flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-md shadow-sm transition-colors text-sm font-medium"
                >
                    <LogOut size={16} className="mr-2" />
                    Disconnect Wallet / Logout
                </button>
                 <p className="text-xs text-gray-500 mt-2">Disconnecting will clear your session key (if applicable) and require you to reconnect your wallet.</p>
            </div>
       </div>

    </div>
  );
};

// Add placeholder styles if needed (e.g., in index.css or a Tailwind plugin)
/*
.button-secondary-style {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    background-color: white;
    border: 1px solid #d1d5db; // gray-300
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151; // gray-700
    transition: background-color 0.2s;
}
.button-secondary-style:hover {
    background-color: #f9fafb; // gray-50
}
*/

export default ProfilePage;