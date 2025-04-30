// types.ts (or wherever your interfaces are defined)

export interface User {
  address: string;
  // Role is a frontend concept, not directly from these contract structs
  role: 'patient' | 'provider' | 'admin' | null;
}

export interface ConsentRecord {
  id: number;
  patientAddress: string;
  providerAddress: string;
  recordId: number; // Added: ID of the specific record consented to
  // dataType?: string; // Removed or optional if kept for informational purposes
  purpose: string;
  expiryDate: number; // Unix timestamp (seconds)
  isActive: boolean;
}

export interface HealthRecord {
  id: number;
  patientAddress: string;
  title: string;
  description: string;
  dataHash: string;
  dateCreated: number; // Unix timestamp (seconds)
}