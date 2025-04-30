// src/services/contractService.ts

import { ethers, LogDescription, Contract, BrowserProvider } from "ethers"; // Import necessary types
import { ConsentRecord, HealthRecord } from "../types"; // Import updated types
import { toNumber } from "ethers";
import contractInfo from "./HealthDataContract.json"; // Use a different name to avoid conflict with 'contract' variable

const abi = contractInfo.abi;

// Replace with your actual contract address
const CONTRACT_ADDRESS = "0x5032808020CC10028d7875abcB5ab70fD1F7Ca8e"; // Use your latest deployed address
const contractInterface = new ethers.Interface(abi); // Create Interface instance

// Cache contract instances to avoid re-creation
let writeContractInstance: Contract | null = null;
let readContractInstance: Contract | null = null;

// Get the contract with signer for write operations
export const getContract = async (): Promise<Contract> => {
  // ... (keep existing implementation - unchanged)
  if (writeContractInstance) return writeContractInstance;
  if (!window.ethereum) {
    console.error("No Ethereum wallet found");
    throw new Error("No Ethereum wallet found");
  }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    writeContractInstance = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
    console.log("Write contract instance initialized.");
    return writeContractInstance;
  } catch (error) {
    console.error("Error getting write contract:", error);
    throw error;
  }
};

// Get the contract for read operations (no signer needed)
export const getReadOnlyContract = (): Contract => {
  // ... (keep existing implementation - unchanged)
  if (readContractInstance) return readContractInstance;
  if (!window.ethereum) {
    console.error("No Ethereum wallet found");
    throw new Error("No Ethereum wallet found");
  }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    readContractInstance = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    console.log("Read-only contract instance initialized.");
    return readContractInstance;
  } catch (error) {
    console.error("Error getting read-only contract:", error);
    throw error;
  }
}

// --- Consent Functions (Updated for Record-Specific Consents) ---

/**
 * @description Grants consent for a specific record to a provider.
 * @param providerAddress The provider receiving consent.
 * @param recordId The ID of the specific health record being consented to.
 * @param purpose Description of the consent's purpose.
 * @param expiryDate Date as string "YYYY-MM-DD" or a Date object.
 * @returns The ID of the newly created consent, or null on failure.
 */
export const grantConsent = async (
  providerAddress: string,
  recordId: number, // Changed from dataType
  purpose: string,
  expiryDate: string | Date // Allow Date object too
): Promise<number | null> => {
  try {
    const contract = await getContract(); // Needs signer
    const expiryDateTimestamp = Math.floor(new Date(expiryDate).getTime() / 1000);

    console.log(`Calling contract.grantConsent(${providerAddress}, ${recordId}, "${purpose}", ${expiryDateTimestamp})`);
    const tx = await contract.grantConsent(
      providerAddress,
      recordId, // Pass recordId now
      purpose,
      expiryDateTimestamp
    );

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction mined:", receipt);

    if (!receipt || !receipt.logs) {
       console.error("Receipt or logs not found");
       return null;
    }

    // Event parsing remains the same for getting consentId
    let grantedConsentId: number | null = null;
    for (const log of receipt.logs) {
        try {
            const parsedLog = contractInterface.parseLog(log as any);
            // Check for the correct event name (should match contract)
            if (parsedLog && parsedLog.name === "ConsentGranted") {
                grantedConsentId = toNumber(parsedLog.args.consentId);
                console.log("ConsentGranted event found, ID:", grantedConsentId);
                // You can also log other args if needed:
                // console.log("  Patient:", parsedLog.args.patientAddress);
                // console.log("  Provider:", parsedLog.args.providerAddress);
                // console.log("  RecordID:", toNumber(parsedLog.args.recordId)); // Access recordId if needed here
                // console.log("  Expiry:", toNumber(parsedLog.args.expiryDate));
                break;
            }
        } catch (e) { /* Ignore logs that don't match */ }
    }

    if (grantedConsentId === null) {
        console.error("ConsentGranted event not found in transaction logs.");
        return null;
    }
    console.log("Consent granted successfully! Consent ID:", grantedConsentId);
    return grantedConsentId;

  } catch (error) {
    console.error("Error granting consent:", error);
    // Consider checking error reason if available (e.g., revert messages from contract)
    throw error; // Re-throw for handling in UI
  }
};

/**
 * @description Gets all consents granted BY a specific patient.
 * @param patientAddress The address of the patient.
 * @returns An array of ConsentRecord objects.
 */
export const getPatientConsents = async (patientAddress: string): Promise<ConsentRecord[]> => {
  try {
    const contract = getReadOnlyContract();
    console.log("Fetching all consents granted by patient:", patientAddress);
    const consentsRaw = await contract.getPatientConsents(patientAddress); // Uses the same contract function name
    console.log("Raw consents data:", consentsRaw);

    // Map and parse the results according to the new ConsentRecord structure
    const parsedConsents: ConsentRecord[] = consentsRaw.map((consent: any): ConsentRecord => ({
      id: toNumber(consent.id),
      patientAddress: consent.patientAddress,
      providerAddress: consent.providerAddress,
      recordId: toNumber(consent.recordId), // Parse recordId
      // dataType: consent.dataType, // Remove if dataType was removed from struct
      purpose: consent.purpose,
      expiryDate: toNumber(consent.expiryDate),
      isActive: consent.isActive
    }));

    console.log("Fetched and parsed consents:", parsedConsents);
    return parsedConsents;
  } catch (error) {
    console.error("Error fetching patient consents:", error);
    return [];
  }
};

/**
 * @description Gets all consents granted TO a specific provider FOR a specific patient.
 * @param patientAddress The address of the patient.
 * @param providerAddress The address of the provider.
 * @returns An array of ConsentRecord objects specific to this provider/patient pair.
 */
export const getConsentsForProviderByPatient = async (patientAddress: string, providerAddress: string): Promise<ConsentRecord[]> => {
    try {
      const contract = getReadOnlyContract();
      console.log(`Fetching consents for provider ${providerAddress} by patient ${patientAddress}`);
      // Assuming your contract has this function (it was in the example contract)
      const consentsRaw = await contract.getConsentsForProviderByPatient(patientAddress, providerAddress);
      console.log("Raw consents data for provider/patient:", consentsRaw);

      // Map and parse the results according to the new ConsentRecord structure
      const parsedConsents: ConsentRecord[] = consentsRaw.map((consent: any): ConsentRecord => ({
        id: toNumber(consent.id),
        patientAddress: consent.patientAddress,
        providerAddress: consent.providerAddress,
        recordId: toNumber(consent.recordId), // Parse recordId
        purpose: consent.purpose,
        expiryDate: toNumber(consent.expiryDate),
        isActive: consent.isActive
      }));

      console.log("Fetched and parsed consents for provider/patient:", parsedConsents);
      return parsedConsents;
    } catch (error) {
      console.error(`Error fetching consents for provider ${providerAddress} by patient ${patientAddress}:`, error);
      return [];
    }
  };


/**
 * @description Revokes a specific consent by its ID.
 * @param consentId The ID of the consent to revoke.
 * @returns boolean True if successful, false otherwise.
 */
export const revokeConsent = async (consentId: number): Promise<boolean> => {
  // ... (keep existing implementation - unchanged, still operates on consentId)
  try {
    const contract = await getContract();
    const tx = await contract.revokeConsent(consentId);
    await tx.wait();
    console.log(`Consent ID ${consentId} revoked successfully.`);
    return true;
  } catch (error) {
    console.error("Error revoking consent:", error);
    return false;
  }
};

/**
 * @description Gets details for a specific consent by its ID.
 * @param consentId The ID of the consent.
 * @returns A ConsentRecord object or null if not found/error.
 */
export const getConsentDetailsById = async (consentId: number): Promise<ConsentRecord | null> => {
  try {
    const contract = getReadOnlyContract();
    console.log(`Fetching details for consent ID ${consentId}`);
    const consent = await contract.getConsentById(consentId);

    if (!consent || toNumber(consent.id) === 0) { // Basic check
        console.log(`Consent with ID ${consentId} not found.`);
        return null;
    }

    // Parse according to the new structure
    const parsedConsent: ConsentRecord = {
      id: toNumber(consent.id),
      patientAddress: consent.patientAddress,
      providerAddress: consent.providerAddress,
      recordId: toNumber(consent.recordId), // Parse recordId
      purpose: consent.purpose,
      expiryDate: toNumber(consent.expiryDate),
      isActive: consent.isActive
    };

    console.log(`Fetched details for consent ID ${consentId}:`, parsedConsent);
    return parsedConsent;

  } catch (error) {
    console.error(`Error fetching consent details for ID ${consentId}:`, error);
    return null;
  }
};

// --- Record Functions (Unchanged) ---

export const uploadRecord = async (
  title: string, description: string, dataHash: string
): Promise<boolean> => {
  // ... (keep existing implementation - unchanged)
  try {
    const contract = await getContract();
    const tx = await contract.uploadRecord(title, description, dataHash);
    const receipt = await tx.wait();
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

export const getPatientRecords = async (patientAddress: string): Promise<HealthRecord[]> => {
  // ... (keep existing implementation - unchanged)
  try {
    const contract = getReadOnlyContract();
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
  }
};


// --- Key Sharing Functions (Unchanged) ---

export const getWrappedKeyHash = async (
    recordId: number, providerAddress: string
): Promise<string> => {
  // ... (keep existing implementation - unchanged)
   try {
        const contract = await getContract();
        console.log(`Calling contract.getWrappedKeyHash(${recordId}, ${providerAddress})`);
        const keyHash: string = await contract.getWrappedKeyHash(recordId, providerAddress);
        console.log(`Contract returned key hash: '${keyHash}'`);
        return keyHash;
    } catch (error: any) {
        console.error(`Error calling getWrappedKeyHash(${recordId}, ${providerAddress}) on contract:`, error);
        return "";
    }
};

export const shareWrappedKeyWithProvider = async (
    recordId: number, providerAddress: string, wrappedKeyIpfsHash: string
): Promise<boolean> => {
  // ... (keep existing implementation - unchanged)
   try {
        const contract = await getContract();
        console.log(`Calling contract.shareWrappedKeyHash(${recordId}, ${providerAddress}, ${wrappedKeyIpfsHash})`);
        const tx = await contract.shareWrappedKeyHash(recordId, providerAddress, wrappedKeyIpfsHash);
        console.log("Share key transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Share key transaction confirmed:", receipt);
        return receipt?.status === 1;
    } catch (error) {
        console.error(`Error calling shareWrappedKeyHash for record ${recordId} with provider ${providerAddress}:`, error);
        return false;
    }
};

// --- Optional: Client-Side Access Check Helper ---
// This avoids potentially costly on-chain view calls for every record check

/**
 * @description Checks provider access to a specific record based on a pre-fetched list of consents.
 * @param targetRecordId The ID of the record to check access for.
 * @param providerAddress The address of the provider seeking access.
 * @param relevantConsents An array of *active* consents already filtered for the correct patient/provider.
 *                         (e.g., fetched using getConsentsForProviderByPatient)
 * @returns boolean True if a valid consent exists for the specific record.
 */
export const checkProviderAccessForRecordClientSide = (
    targetRecordId: number,
    providerAddress: string, // Keep for potential double-check, though list should be pre-filtered
    relevantConsents: ConsentRecord[]
): boolean => {
    if (!relevantConsents || relevantConsents.length === 0) {
        return false;
    }
    const now = Math.floor(Date.now() / 1000);
    return relevantConsents.some(consent =>
        consent.providerAddress.toLowerCase() === providerAddress.toLowerCase() && // Ensure provider matches
        consent.recordId === targetRecordId &&  // Check if this consent is for the target record
        consent.isActive &&                     // Check if this specific consent is active
        consent.expiryDate >= now               // Check if this specific consent has expired
    );
};