import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { ethers } from 'ethers';
import { User } from '../types';

interface WalletContextType {
  currentAccount: string | null;
  user: User | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnected: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          
          if (accounts.length > 0) {
            const address = accounts[0].address;
            setCurrentAccount(address);
            
            // In a real app, you would fetch the user's role from your smart contract
            // For now, we'll simulate this with a mock role
            setUser({
              address,
              role: 'patient' // This would come from your contract in a real implementation
            });
          }
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };

    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
          // Update user role based on new account
          setUser({
            address: accounts[0],
            role: 'patient' // This would be fetched from your contract
          });
        } else {
          disconnectWallet();
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
          
          // In a real app, you would fetch the user's role from your smart contract
          setUser({
            address: accounts[0],
            role: 'patient' // This would come from your contract
          });
        }
      } else {
        alert("Please install MetaMask or another Ethereum wallet provider");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setCurrentAccount(null);
    setUser(null);
  };

  return (
    <WalletContext.Provider
      value={{
        currentAccount,
        user,
        isConnecting,
        connectWallet,
        disconnectWallet,
        isConnected: !!currentAccount
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};