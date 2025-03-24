export interface User {
  address: string;
  role: 'patient' | 'provider' | 'admin' | null;
}

export interface ConsentRecord {
  id: string;
  patientAddress: string;
  providerAddress: string;
  dataType: string;
  purpose: string;
  expiryDate: string;
  isActive: boolean;
}

export interface HealthRecord {
  id: string;
  patientAddress: string;
  title: string;
  description: string;
  dataHash: string;
  dateCreated: string;
  lastAccessed?: string;
  accessibleTo: string[];
}