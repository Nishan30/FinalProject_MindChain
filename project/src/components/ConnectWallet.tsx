import React from 'react';
import { useWallet } from '../context/WalletContext';
import { Wallet, LogOut } from 'lucide-react';

const ConnectWallet: React.FC = () => {
  const { connectWallet, disconnectWallet, isConnected, user, isConnecting } = useWallet();

  return (
    <div className="flex items-center">
      {isConnected ? (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 hidden md:inline">
            {user?.address?.substring(0, 6)}...{user?.address?.substring(user?.address.length - 4)}
          </span>
          <button
            onClick={disconnectWallet}
            className="flex items-center space-x-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Disconnect</span>
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => connectWallet()}
          disabled={isConnecting}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-70"
        >
          <Wallet size={18} />
          <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>
      )}
    </div>
  );
};

export default ConnectWallet;