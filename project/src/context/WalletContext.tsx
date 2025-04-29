// context/WalletContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
  useMemo
} from 'react';
import { ethers } from 'ethers';
import { User } from '../types'; // Ensure this path is correct and User includes role

// Define the shape of the context data
interface WalletContextType {
  user: User | null; // Contains address and role when connected
  isConnecting: boolean; // True while connection attempt is in progress
  connectWallet: (desiredRole?: 'patient' | 'provider') => Promise<void>; // Function to initiate connection
  disconnectWallet: () => void; // Function to clear connection state
  isConnected: boolean; // Convenience flag: true if user object exists
}

// Create the context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Key for storing connection status locally (optional but helps UX for other potential features)
// We won't use it for auto-connect anymore, but might be useful later.
const LOCAL_STORAGE_KEY = 'walletConnectedMindChain';

// Provider component that wraps the application
export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State variables
  const [user, setUser] = useState<User | null>(null); // Holds connected user info (address, role)
  const [isConnecting, setIsConnecting] = useState(false); // Tracks connection process
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null); // Stores the ethers provider instance

  // Effect to initialize the ethers provider once on component mount
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      console.log("Ethereum provider (window.ethereum) found.");
      const ethProvider = new ethers.BrowserProvider(window.ethereum, 'any');
      setProvider(ethProvider);
    } else {
      console.warn("MetaMask or similar Ethereum provider not found.");
    }
  }, []); // Empty dependency array ensures this runs only once

  // --- Role Determination Logic ---
  // Placeholder: Replace this with your actual logic.
  const determineRole = async (address: string, desiredRole?: 'patient' | 'provider'): Promise<'patient' | 'provider' | null> => {
    console.log(`Attempting to determine role for address: ${address}, with desired role hint: ${desiredRole}`);
    // ** Implement your actual role detection (contract call, API check, etc.) **
    if (desiredRole) {
      console.log(`Using desired role hint: ${desiredRole} for ${address}`);
      return desiredRole;
    }
    console.warn(`Role could not be determined for ${address}. Defaulting to 'patient'.`);
    return 'patient'; // Default fallback
  };
  // --- End Role Determination Logic ---

  // --- REMOVED: Effect to Check for Existing Connection on Load ---
  // We completely remove the useEffect that called checkExistingConnection
  // to prevent any checks or prompts on initial page load.

  // --- Explicit Connection Function (Called by UI Buttons) ---
  const connectWallet = useCallback(async (desiredRole?: 'patient' | 'provider') => {
    if (!provider) {
      alert("Ethereum wallet provider (e.g., MetaMask) not found. Please install it.");
      return;
    }
    if (user) { console.log("ConnectWallet called but already connected."); return; }
    if (isConnecting) { console.log("ConnectWallet called but connection already in progress."); return; }

    setIsConnecting(true);
    let determinedRole: 'patient' | 'provider' | null = null;
    let connectedAddress: string | null = null;

    try {
      console.log("Requesting accounts (eth_requestAccounts)...");
      const accounts: string[] = await provider.send("eth_requestAccounts", []); // Triggers prompt

      if (accounts && accounts.length > 0) {
        connectedAddress = ethers.getAddress(accounts[0]);
        console.log(`Wallet connected: ${connectedAddress}, attempting role: ${desiredRole}`);
        determinedRole = await determineRole(connectedAddress, desiredRole); // Determine role *after* prompt

        if (determinedRole) {
          setUser({ address: connectedAddress, role: determinedRole });
          localStorage.setItem(LOCAL_STORAGE_KEY, 'true'); // Still useful maybe?
          console.log(`User set: ${connectedAddress} with role ${determinedRole}`);
        } else {
          throw new Error(`Your role could not be determined for address ${connectedAddress}.`);
        }
      } else {
        throw new Error("No accounts were selected or available in the wallet.");
      }
    } catch (error: any) {
      console.error("Error during connectWallet:", error);
      if (error.code === 4001) { alert("Connection request rejected."); }
      else { alert(`Failed to connect wallet: ${error.message || "Unknown error."}`); }
      setUser(null); // Reset on error
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } finally {
      setIsConnecting(false);
    }
  }, [provider, user, isConnecting]); // Dependencies

  // --- Disconnect Function ---
  const disconnectWallet = useCallback(() => {
    console.log("Disconnecting wallet and clearing state.");
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear flag
  }, []);

  // --- Event Listener Callbacks ---
  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    console.log("Wallet event: accountsChanged", accounts);
    if (accounts.length > 0) {
      const newAddress = ethers.getAddress(accounts[0]);
      if (newAddress.toLowerCase() !== user?.address.toLowerCase()) {
        // Account truly changed in the wallet provider itself
        console.log(`Account switched to: ${newAddress}. Forcing disconnect from app state.`);
        // Simplest/Safest: Force disconnect, user must re-connect via buttons
        alert("Your wallet account has changed. Please reconnect using the buttons on the home page.");
        disconnectWallet();
      }
    } else {
      // User disconnected all accounts from the site via wallet provider settings
      console.log("All accounts disconnected via wallet provider.");
      disconnectWallet();
    }
  }, [disconnectWallet, user?.address]); // Dependency on user address to compare

  const handleChainChanged = useCallback((chainId: string) => {
    console.log("Wallet event: chainChanged", chainId);
    alert(`Network changed (Chain ID: ${chainId}). Reloading the application.`);
    window.location.reload();
  }, []);

  // --- Effect to Set Up and Clean Up Event Listeners ---
  useEffect(() => {
    const eth = window.ethereum;
    if (provider && eth) { // Check provider is initialized
      console.log("Setting up wallet event listeners.");
      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', handleChainChanged);
      return () => {
        if (eth.removeListener) {
          console.log("Cleaning up wallet event listeners.");
          eth.removeListener('accountsChanged', handleAccountsChanged);
          eth.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [provider, handleAccountsChanged, handleChainChanged]); // Dependencies


  // --- Memoized Context Value ---
  const isConnected = useMemo(() => !!user, [user]);
  const contextValue = useMemo(() => ({
    user,
    isConnecting,
    connectWallet,
    disconnectWallet,
    isConnected,
  }), [user, isConnecting, connectWallet, disconnectWallet, isConnected]);

  // Provide the context value to children components
  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// --- Custom Hook for Consuming the Context ---
export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};