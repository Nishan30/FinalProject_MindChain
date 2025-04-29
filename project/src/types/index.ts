// types.ts (or wherever your interfaces are defined)

export interface User {
  address: string;
  // Role is a frontend concept, not directly from these contract structs
  role: 'patient' | 'provider' | 'admin' | null;
}

// Matches the Solidity ConsentRecord struct
export interface ConsentRecord {
  id: number;               // uint256 id;
  patientAddress: string;   // address patientAddress;
  providerAddress: string;  // address providerAddress;
  dataType: string;         // string dataType;
  purpose: string;          // string purpose;
  expiryDate: number;       // uint256 expiryDate; (Store as Unix timestamp number)
  isActive: boolean;        // bool isActive;
}

// Matches the Solidity HealthRecord struct
export interface HealthRecord {
  id: number;               // uint256 id;
  patientAddress: string;   // address patientAddress;
  title: string;            // string title;
  description: string;      // string description;
  dataHash: string;         // string dataHash; (IPFS hash)
  dateCreated: number;      // uint256 dateCreated; (Store as Unix timestamp number)
  // Removed fields not present in the contract struct:
  // lastAccessed?: string; // Not in contract
  // accessibleTo: string[]; // Not in contract (access derived via consents)
}