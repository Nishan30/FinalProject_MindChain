import React, { createContext, useState, useContext, useRef, useEffect, ReactNode, MutableRefObject } from 'react';

// Define the shape of the context data
interface KeyContextType {
  encryptionKey: CryptoKey | null; // The derived AES key
  setEncryptionKey: React.Dispatch<React.SetStateAction<CryptoKey | null>>; // Function to update the key state
  keyCacheRef: MutableRefObject<{ key: CryptoKey | null }>; // Stable ref for passing to derivation function
  clearEncryptionKey: () => void; // Function to clear the key (e.g., on logout)
}

// Create the context with an initial undefined value
// We throw an error if used outside a provider, so undefined is okay here.
const KeyContext = createContext<KeyContextType | undefined>(undefined);

// Define the props for the provider component
interface KeyProviderProps {
  children: ReactNode; // Allow provider to wrap other components
}

// Create the Provider component
export const KeyProvider: React.FC<KeyProviderProps> = ({ children }) => {
  // State to hold the actual key
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  // Use a ref to hold the key value. This provides a stable object reference
  // that can be passed to the `getOrDeriveEncryptionKey` function for caching,
  // preventing potential issues with closures capturing stale state if the
  // derivation function is memoized or defined outside the component.
  const keyCacheRef = useRef<{ key: CryptoKey | null }>({ key: null });

  // Keep the ref synchronized with the state. This might seem redundant,
  // but ensures that if the state is ever updated externally (less likely here),
  // the ref reflects it. The primary purpose of the ref is the stable object identity.
  useEffect(() => {
    keyCacheRef.current.key = encryptionKey;
  }, [encryptionKey]);

  // Function to clear the key from state and ref (e.g., on logout)
  const clearEncryptionKey = () => {
    console.log("Clearing encryption key from context.");
    setEncryptionKey(null);
    keyCacheRef.current.key = null;
  };

  // Value object passed down through the context
  const contextValue: KeyContextType = {
    encryptionKey,
    setEncryptionKey,
    keyCacheRef, // Pass the ref itself
    clearEncryptionKey
  };

  return (
    <KeyContext.Provider value={contextValue}>
      {children}
    </KeyContext.Provider>
  );
};

// Custom hook for easy consumption of the context
export const useEncryptionKey = (): KeyContextType => {
  const context = useContext(KeyContext);
  if (context === undefined) {
    // Provides a helpful error message if the hook is used incorrectly
    throw new Error('useEncryptionKey must be used within a KeyProvider');
  }
  return context;
};