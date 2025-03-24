import { ethers } from "ethers";
import { ConsentRecord, HealthRecord } from "../types";
import { toBigInt, toNumber } from "ethers"; 
import contract from "./healthContract.json";
const abi = contract.abi;

// Replace with your actual contract address and ABI
const CONTRACT_ADDRESS = "0xaF3ca4F23E6d0B81B739612D1F9f245F9111cfb9"; // Contract address

// ✅ Get the contract with signer for write operations
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

// ✅ Get consents for a patient
export const getPatientConsents = async (patientAddress: string) => {
  try {
    const contract = await getContract();
    const consents = await contract.getPatientConsents(patientAddress);

    // Correct conversion for ethers v6
    const parsedConsents = consents.map((consent: any) => ({
      id: toNumber(consent.id), // Correct way to convert to number
      providerAddress: consent.providerAddress,
      dataType: consent.dataType,
      purpose: consent.purpose,
      expiryDate: new Date(toNumber(consent.expiryDate) * 1000).toLocaleDateString(),
    }));

    console.log("Fetched consents:", parsedConsents);
    return parsedConsents;
  } catch (error) {
    console.error("Error fetching consents:", error);
    throw error;
  }
};

// ✅ Grant consent to a provider
export const grantConsent = async (
  providerAddress: string,
  dataType: string,
  purpose: string,
  expiryDate: string // Date as string "YYYY-MM-DD"
) => {
  try {
    // Convert date string to Unix timestamp
    const expiryDateTimestamp = Math.floor(new Date(expiryDate).getTime() / 1000);

    // Call contract method
    const contract = await getContract();
    const tx = await contract.grantConsent(
      providerAddress,
      dataType,
      purpose,
      expiryDateTimestamp
    );

    // Wait for transaction to be mined
    await tx.wait();
    console.log("Consent granted successfully!");
    return tx;
  } catch (error) {
    console.error("Error granting consent:", error);
    throw error;
  }
};

// ✅ Revoke a consent by ID
export const revokeConsent = async (consentId: number): Promise<void> => {
  try {
    const contract = await getContract();
    const tx = await contract.revokeConsent(consentId);
    await tx.wait();
  } catch (error) {
    console.error("Error revoking consent:", error);
    throw error;
  }
};

// ✅ Upload a health record (IPFS hash)
export const uploadRecord = async (
  title: string,
  description: string,
  dataHash: string
): Promise<number> => {
  try {
    const contract = await getContract();
    const tx = await contract.uploadRecord(title, description, dataHash);
    const receipt = await tx.wait();
    return toNumber(receipt.events[0].args.recordId); // Use toNumber for BigNumber to JS number conversion
  } catch (error) {
    console.error("Error uploading record:", error);
    throw error;
  }
};

// ✅ Get records for a patient
export const getPatientRecords = async (
  patientAddress: string
): Promise<HealthRecord[]> => {
  try {
    const contract = await getContract();
    const records = await contract.getPatientRecords(patientAddress);

    return records.map((record: any) => ({
      id: toNumber(record.id), // Use toNumber to convert BigNumber to JS number
      patientAddress: record.patientAddress,
      title: record.title,
      description: record.description,
      dataHash: record.dataHash,
      dateCreated: new Date(toNumber(record.dateCreated) * 1000).toISOString(), // Convert date
    }));
  } catch (error) {
    console.error("Error fetching records:", error);
    throw error;
  }
};
