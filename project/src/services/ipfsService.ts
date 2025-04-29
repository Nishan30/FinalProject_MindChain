// src/services/ipfsService.ts

// Use the Pinata SDK
import { PinataSDK } from "pinata"; // Assuming package name is 'pinata'

// --- Configuration ---
const pinataJwt = import.meta.env.VITE_PINATA_JWT;
const pinataGateway = import.meta.env.VITE_PINATA_GATEWAY; // Optional

let pinata: PinataSDK | null = null;
let isPinataInitialized = false;

if (!pinataJwt) {
    console.error("Pinata JWT not found. Check your .env file (should use VITE_PINATA_JWT) and ensure the development server was restarted. IPFS features disabled.");
} else {
    try {
        console.log("Initializing Pinata SDK...");
        pinata = new PinataSDK({
            pinataJwt: pinataJwt,
            // Only include gateway if you have one configured in .env
            ...(pinataGateway && { pinataGateway: pinataGateway }),
        });
        isPinataInitialized = true;
        console.log("Pinata SDK initialized successfully.");

        // Optional: Test authentication on initialization
        /*
        pinata.testAuthentication().then((result) => {
            console.log("Pinata authentication test successful:", result);
        }).catch((err) => {
            console.error("Pinata authentication test failed:", err);
            isPinataInitialized = false; // Mark as not initialized if auth fails
            pinata = null;
            alert("Pinata authentication failed. Check your JWT key.");
        });
        */

    } catch (error) {
        console.error("Could not initialize Pinata SDK:", error);
        pinata = null;
    }
}

// --- Upload Function ---
// Note: PinataSDK expects a readable stream or path for NodeJS,
// but for browser uploads, we often have Blob/File/ArrayBuffer.
// We might need to adapt how we pass data. The SDK might handle Blobs directly,
// or we might need to convert. Let's assume Blob works.
export const uploadToIPFS = async (data: Blob | File /* Pass Blob or File */): Promise<string> => {
    if (!pinata || !isPinataInitialized) {
        throw new Error("Pinata SDK is not initialized or configured correctly (check JWT key).");
    }
    try {
        console.log("Uploading data to Pinata via SDK...");

        // Use pinata.upload.public.file for direct file/blob upload
        // The second argument can be filename (optional but good practice)
        const filename = data instanceof File ? data.name : 'encrypted-data';
        const fileToUpload = data instanceof File ? data : new File([data], filename);
        const result = await pinata.upload.public.file(fileToUpload);

        console.log("Pinata SDK Upload result:", result);

        if (!result || !result.cid) {
            throw new Error("Pinata SDK upload did not return a valid CID.");
        }
        // Return the IPFS CID (Content Identifier / Hash)
        return result.cid; // Directly use result.cid
    } catch (error) {
        console.error("Error uploading to Pinata IPFS via SDK:", error);
        throw new Error(`Pinata upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
};

// --- Fetch Function ---
// Fetching raw data via the SDK might still use gateways implicitly or specific endpoints.
// Often, constructing the gateway URL is preferred for retrieval in the browser.
export const fetchFromIPFS = async (cid: string): Promise<ArrayBuffer> => {
    if (!pinata || !isPinataInitialized) {
        // Keep this check if using SDK's convert method
        throw new Error("Pinata SDK is not initialized or configured correctly.");
    }

    try {
        // Get the preferred gateway URL from the SDK
        const gatewayUrl = await pinata.gateways.public.convert(cid);
        console.log(`Fetching data from IPFS gateway (via SDK convert): ${gatewayUrl}`);

        const response = await fetch(gatewayUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch from IPFS gateway: ${response.status} ${response.statusText}`);
        }

        const data = await response.arrayBuffer();
        console.log(`Successfully fetched ${data.byteLength} bytes from CID: ${cid}`);
        return data;

    } catch (error) {
        console.error(`Error fetching CID ${cid} via Pinata SDK convert/fetch:`, error);
        throw new Error(`IPFS fetch failed for CID ${cid}: ${error instanceof Error ? error.message : String(error)}`);
    }
};
 // --- Public Gateway URL ---
 // Use the configured gateway or Pinata's public one as fallback
 export const getIPFSGatewayUrl = (cid: string): string => {
     const gateway = pinataGateway || 'gateway.pinata.cloud'; // Use configured or default Pinata gateway
     return `https://${gateway}/ipfs/${cid}`;
 }