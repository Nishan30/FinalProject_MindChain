// contractService.ts

import { ethers, LogDescription } from "ethers"; // Import LogDescription
import { ConsentRecord, HealthRecord } from "../types";
import { toNumber } from "ethers"; // Keep only toNumber if BigInt isn't used elsewhere directly
import contract from "./healthContract.json";
const abi = contract.abi;

// Replace with your actual contract address
const CONTRACT_ADDRESS = "0xaF3ca4F23E6d0B81B739612D1F9f245F9111cfb9"; // Contract address
const contractInterface = new ethers.Interface(abi); // Create Interface instance

// Get the contract with signer for write operations
export const getContract = async () => {
  if (!window.ethereum) throw new Error("No Ethereum wallet found");

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
  } catch (error) {
    console.error("Error getting contract:", error);
    throw error;
  }
};

// Get the contract for read operations (no signer needed)
export const getReadOnlyContract = () => {
  if (!window.ethereum) throw new Error("No Ethereum wallet found");
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    return new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
  } catch (error) {
    console.error("Error getting read-only contract:", error);
    throw error;
  }
}

// Get consents for a patient
export const getPatientConsents = async (patientAddress: string): Promise<ConsentRecord[]> => { // Add return type
  try {
    const contract = await getContract();
    console.log("Fetching consents for patient:", contract);
    const consentsRaw = await contract.getPatientConsents(patientAddress);
    console.log("Raw consents data:", consentsRaw);

    // Map and parse the results
    const parsedConsents: ConsentRecord[] = consentsRaw.map((consent: any): ConsentRecord => ({
      id: toNumber(consent.id),
      patientAddress: consent.patientAddress, // Include patientAddress
      providerAddress: consent.providerAddress,
      dataType: consent.dataType,
      purpose: consent.purpose,
      expiryDate: toNumber(consent.expiryDate), // Keep as timestamp number
      isActive: consent.isActive // Include isActive status
    }));

    console.log("Fetched consents:", parsedConsents);
    return parsedConsents;
  } catch (error) {
    console.error("Error fetching consents:", error);
    // Return empty array or re-throw depending on desired error handling
    return [];
    // throw error;
  }
};

// Grant consent to a provider - NOW RETURNS consentId
export const grantConsent = async (
  providerAddress: string,
  dataType: string,
  purpose: string,
  expiryDate: string // Date as string "YYYY-MM-DD"
): Promise<number | null> => { // Return type is number | null
  try {
    const contract = await getContract(); // Needs signer for write
    const expiryDateTimestamp = Math.floor(new Date(expiryDate).getTime() / 1000);
    const tx = await contract.grantConsent(
      providerAddress,
      dataType,
      purpose,
      expiryDateTimestamp
    );

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait(); // Wait for transaction to be mined
    console.log("Transaction mined:", receipt);

    if (!receipt || !receipt.logs) {
       console.error("Receipt or logs not found");
       return null;
    }

    // Find the ConsentGranted event in the logs
    let grantedConsentId: number | null = null;
    for (const log of receipt.logs) {
        try {
            const parsedLog = contractInterface.parseLog(log as any); // Use the Interface
            if (parsedLog && parsedLog.name === "ConsentGranted") {
                grantedConsentId = toNumber(parsedLog.args.consentId);
                console.log("ConsentGranted event found, ID:", grantedConsentId);
                break; // Exit loop once found
            }
        } catch (e) {
            // Ignore logs that don't match the ABI
            // console.warn("Could not parse log:", e);
        }
    }

    if (grantedConsentId === null) {
        console.error("ConsentGranted event not found in transaction logs.");
        return null;
    }

    console.log("Consent granted successfully! Consent ID:", grantedConsentId);
    return grantedConsentId; // Return the ID

  } catch (error) {
    console.error("Error granting consent:", error);
    throw error; // Re-throw error for handling in UI
  }
};

// Revoke a consent by ID
export const revokeConsent = async (consentId: number): Promise<boolean> => { // Return boolean for success
  try {
    const contract = await getContract(); // Needs signer
    const tx = await contract.revokeConsent(consentId);
    await tx.wait();
    console.log(`Consent ID ${consentId} revoked successfully.`);
    return true;
  } catch (error) {
    console.error("Error revoking consent:", error);
    return false;
  }
};

// Upload a health record (IPFS hash)
export const uploadRecord = async (
  title: string,
  description: string,
  dataHash: string
): Promise<boolean> => { // Return boolean for success
  try {
    const contract = await getContract(); // Needs signer
    const tx = await contract.uploadRecord(title, description, dataHash);
    const receipt = await tx.wait();

    // Optionally check receipt status
     if (receipt?.status === 1) {
        console.log("Record uploaded successfully!");
        return true;
     } else {
        console.error("Record upload transaction failed.");
        return false;
     }
  } catch (error) {
    console.error("Error uploading record:", error);
    return false;
  }
};

// Get records for a patient
export const getPatientRecords = async (
  patientAddress: string
): Promise<HealthRecord[]> => {
  try {
    const contract = getReadOnlyContract(); // Use read-only
    const recordsRaw = await contract.getPatientRecords(patientAddress);

    return recordsRaw.map((record: any): HealthRecord => ({
      id: toNumber(record.id),
      patientAddress: record.patientAddress,
      title: record.title,
      description: record.description,
      dataHash: record.dataHash,
      dateCreated: toNumber(record.dateCreated),
    }));
  } catch (error) {
    console.error("Error fetching records:", error);
    return [];
    // throw error;
  }
};

// NEW FUNCTION: Get specific consent details by ID
export const getConsentDetailsById = async (consentId: number): Promise<ConsentRecord | null> => {
  try {
    const contract = getReadOnlyContract(); // Use read-only
    const consent = await contract.getConsentById(consentId);

    // Basic check if consent exists (contract might return default values if ID is invalid)
    if (!consent || toNumber(consent.id) === 0) {
        console.log(`Consent with ID ${consentId} not found.`);
        return null;
    }

    const parsedConsent: ConsentRecord = {
      id: toNumber(consent.id),
      patientAddress: consent.patientAddress,
      providerAddress: consent.providerAddress,
      dataType: consent.dataType,
      purpose: consent.purpose,
      expiryDate: toNumber(consent.expiryDate), // Keep as timestamp number
      isActive: consent.isActive
    };

    console.log(`Fetched details for consent ID ${consentId}:`, parsedConsent);
    return parsedConsent;

  } catch (error) {
    // Handle specific errors like invalid ID format if necessary
    console.error(`Error fetching consent details for ID ${consentId}:`, error);
    return null; // Return null on error
  }
};