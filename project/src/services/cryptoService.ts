// src/services/cryptoService.ts
import { BrowserProvider, ethers } from 'ethers';
import { Buffer } from 'buffer'; // Ensure buffer is installed and available

// --- DEPENDENCIES - Adjust paths as needed ---
import { fetchFromIPFS, uploadToIPFS } from './ipfsService';
// getWrappedKeyHash and shareWrappedKeyWithProvider are essential
import { getWrappedKeyHash, shareWrappedKeyWithProvider } from './contractService';

// --- Configuration ---
const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12;

// --- KDF Configuration ---
const KDF_ALGORITHM = 'PBKDF2';
const KDF_HASH = 'SHA-256';
const KDF_SALT_STRING = "health-records-dapp-salt-v1";
const KDF_ITERATIONS = 100000;

// --- Signature Configuration ---
const SIGNATURE_MESSAGE_PREFIX = "Sign this message to generate/access your secure encryption key for the Health Records dApp.\n\nAddress: ";
const SIGNATURE_MESSAGE_NONCE = "\nNonce: 20240516";

// --- Helper: Get Signature (Unchanged) ---
async function getSignature(userAddress: string): Promise<string | null> {
    // ... (keep existing implementation) ...
     if (!window.ethereum) {
        console.error("Wallet not found.");
        alert("Wallet not found. Please install MetaMask or a compatible wallet.");
        return null;
    }
    try {
        const provider = new BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner(userAddress);
        const messageToSign = `${SIGNATURE_MESSAGE_PREFIX}${userAddress}${SIGNATURE_MESSAGE_NONCE}`;
        console.log("Requesting signature for key derivation...");
        const signature = await signer.signMessage(messageToSign);
        console.log("Signature obtained for key derivation.");
        return signature;
    } catch (error: any) {
        console.error("Failed to get signature:", error);
        if (error.code === 4001) { alert("Signature request rejected."); }
        else { alert(`Failed to get signature: ${error.message || 'Unknown error'}`); }
        return null;
    }
}

// --- Helper: Derive Key from Signature using PBKDF2 (Unchanged) ---
async function deriveKeyFromSignature_PBKDF2(signature: string): Promise<CryptoKey> {
    // ... (keep existing implementation, ensure 'extractable' is true) ...
    try {
        const encoder = new TextEncoder();
        const passwordMaterial = encoder.encode(signature);
        const salt = encoder.encode(KDF_SALT_STRING);
        const baseKey = await window.crypto.subtle.importKey('raw', passwordMaterial, { name: KDF_ALGORITHM }, false, ['deriveBits', 'deriveKey']);
        const derivedKey = await window.crypto.subtle.deriveKey(
            { name: KDF_ALGORITHM, salt: salt, iterations: KDF_ITERATIONS, hash: KDF_HASH },
            baseKey,
            { name: AES_ALGORITHM, length: AES_KEY_LENGTH_BITS },
            true, // MUST BE EXTRACTABLE
            ['encrypt', 'decrypt']
        );
        console.log("AES key derived via PBKDF2.");
        return derivedKey;
    } catch (error) {
        console.error("Failed to derive key via PBKDF2:", error);
        throw new Error(`Key derivation via PBKDF2 failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// --- Derive/Retrieve PATIENT'S Key Function (Unchanged) ---
interface KeyCache { key: CryptoKey | null }
export const getOrDeriveEncryptionKey = async (userAddress: string, cache: KeyCache): Promise<CryptoKey | null> => {
    // ... (keep existing implementation) ...
     if (cache.key) { return cache.key; }
    console.log(`Deriving encryption key for ${userAddress}...`);
    const signature = await getSignature(userAddress);
    if (!signature) return null;
    try {
        const key = await deriveKeyFromSignature_PBKDF2(signature);
        if (!key) throw new Error("Key derivation resulted in a null key.");
        cache.key = key;
        return key;
    } catch (error) {
        console.error("Error deriving encryption key:", error);
        alert(`Failed to derive encryption key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        cache.key = null;
        return null;
    }
};

// --- Encryption Function (Patient encrypts data - Unchanged) ---
export const encryptData = async (data: ArrayBuffer, key: CryptoKey): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array } | null> => {
    // ... (keep existing implementation) ...
     try {
        if (!data || data.byteLength === 0) { console.error("Encryption Error: Cannot encrypt empty data."); return null; }
        if (!key) { console.error("Encryption Error: CryptoKey is missing."); return null; }
        const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
        const encryptedData = await window.crypto.subtle.encrypt({ name: AES_ALGORITHM, iv: iv }, key, data);
        console.log("Data encrypted.");
        return { encryptedData, iv };
    } catch (error) {
        console.error("Encryption failed:", error);
        return null;
    }
};

// --- Decryption Function (Provider decrypts data - Unchanged) ---
export const decryptData = async (encryptedDataWithIv: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer | null> => {
    // ... (keep existing implementation) ...
    try {
        if (encryptedDataWithIv.byteLength <= IV_LENGTH_BYTES) throw new Error("Invalid encrypted data: too short.");
        const iv = new Uint8Array(encryptedDataWithIv.slice(0, IV_LENGTH_BYTES));
        const encryptedData = encryptedDataWithIv.slice(IV_LENGTH_BYTES);
        const decryptedData = await window.crypto.subtle.decrypt({ name: AES_ALGORITHM, iv: iv }, key, encryptedData);
        console.log(decryptedData);
        console.log("Data decrypted.");
        return decryptedData;
    } catch (error: any) {
        console.error("Decryption failed:", error);
        if (error.name === 'OperationError') throw new Error("Decryption failed: Likely incorrect key or corrupted data.");
        throw new Error(`Decryption failed: ${error.message || String(error)}`);
    }
};


// --- REMOVED FUNCTIONS ---
// export const getProviderPublicKey = async (...) => { ... }; // REMOVED
// export const wrapDataWithPublicKey = async (...) => { ... }; // REMOVED


// --- UPDATED Key Sharing Orchestration ---
/**
 * Orchestrates sharing the patient's AES key for a specific record with a provider
 * using the simplified approach: export raw key, hex encode, upload hex, store hash on chain.
 * Assumes patientKey is extractable.
 */
export const shareKeyForRecord = async (
    patientKey: CryptoKey,
    recordId: number,
    providerAddress: string
): Promise<boolean> => {
    console.log(`Initiating SIMPLIFIED key sharing for Record ${recordId} with Provider ${providerAddress}`);
    let operationStep = "Initialization";

    try {
        // 1. Export Patient's Raw AES Key
        operationStep = "Exporting patient key";
        console.log(`[${operationStep}]`);
        const rawKeyBuffer = await window.crypto.subtle.exportKey('raw', patientKey);
        if (!rawKeyBuffer || rawKeyBuffer.byteLength === 0) throw new Error("Failed to export raw key or key is empty.");
        console.log(`[${operationStep}] Raw key exported (${rawKeyBuffer.byteLength} bytes).`);

        // 2. Hex-Encode the Raw Key
        operationStep = "Hex-encoding key";
        console.log(`[${operationStep}]`);
        const sharedKeyHex = Buffer.from(rawKeyBuffer).toString('hex');
        if (!sharedKeyHex) throw new Error("Failed to hex-encode the key.");
        console.log(`[${operationStep}] Key hex-encoded.`);

        // 3. Prepare Hex Key Data as Blob for IPFS
        operationStep = "Preparing hex key blob";
        console.log(`[${operationStep}]`);
        // Store the hex string directly as plain text
        const sharedKeyBlob = new Blob([sharedKeyHex], { type: 'text/plain' });
        console.log(`[${operationStep}] Prepared hex key blob, size: ${sharedKeyBlob.size} bytes.`);

        // 4. Upload Hex Key Blob to IPFS
        operationStep = `Uploading hex key blob to IPFS`;
        console.log(`[${operationStep}]`);
        const sharedKeyIpfsHash = await uploadToIPFS(sharedKeyBlob); // Requires ipfsService import
        if (!sharedKeyIpfsHash) throw new Error("IPFS upload of hex key returned no hash.");
        console.log(`[${operationStep}] Hex key blob uploaded to IPFS: ${sharedKeyIpfsHash}`);

        // 5. Store IPFS Hash on Blockchain
        // The name "shareWrappedKeyWithProvider" is now slightly inaccurate, but we keep it for consistency with the contract call
        operationStep = "Storing hex key hash on blockchain";
        console.log(`[${operationStep}]`);
        const shareSuccess = await shareWrappedKeyWithProvider(recordId, providerAddress, sharedKeyIpfsHash); // Requires contractService import
        if (!shareSuccess) throw new Error("Blockchain transaction to share key hash failed or was reverted.");
        console.log(`[${operationStep}] Hex key hash successfully stored on blockchain.`);

        // 6. Success!
        console.log(`--- SIMPLIFIED Key sharing complete for Record ${recordId} with Provider ${providerAddress} ---`);
        return true;

    } catch (error: any) {
        console.error(`SIMPLIFIED Key Sharing Failed during [${operationStep}] for Record ${recordId}:`, error);
        alert(`Key sharing failed during step: ${operationStep}.\nError: ${error.message}\n\nThe provider may not be able to decrypt the record.`);
        return false; // Indicate overall failure
    }
};


// --- UPDATED Provider Decryption Key Retrieval ---
// Fetches hex key data, attempts eth_decrypt (as gatekeeper/potential passthrough), imports key.
export const getDecryptionKeyForRecord_Provider = async (
    providerAddress: string,
    recordId: number
): Promise<CryptoKey | null> => {
    console.log(`Attempting to get decryption key for record ${recordId} for provider ${providerAddress} (Simplified Flow)`);
    if (!window.ethereum) {
        console.error("Wallet (window.ethereum) not found.");
        alert("Wallet not connected. Please connect your wallet.");
        return null;
    }

    let operationStep = "Initialization";
    try {
        // 1. Get IPFS Hash of "Wrapped" (Hex) Key from Contract
        operationStep = "Fetching key location hash";
        console.log(`[${operationStep}]`);
        const sharedKeyIpfsHash = await getWrappedKeyHash(recordId, providerAddress); // Assumes import from contractService
        if (!sharedKeyIpfsHash) {
            // Access control in getWrappedKeyHash might throw, or it returns empty
            console.error(`No key hash found for record ${recordId} / provider ${providerAddress}.`);
            alert("Access Denied: Decryption key location not found. Consent may be invalid, revoked, or key was never shared.");
            return null;
        }
        console.log(`[${operationStep}] Found key location hash: ${sharedKeyIpfsHash}`);

        // 2. Fetch Hex Key Data from IPFS
        operationStep = "Fetching hex key data";
        console.log(`[${operationStep}] Fetching from IPFS: ${sharedKeyIpfsHash}`);
        const hexKeyDataArrayBuffer: ArrayBuffer = await fetchFromIPFS(sharedKeyIpfsHash); // Assumes import from ipfsService
        if (!hexKeyDataArrayBuffer || hexKeyDataArrayBuffer.byteLength === 0) {
             throw new Error(`Failed to fetch hex key data from IPFS hash: ${sharedKeyIpfsHash}`);
        }
        // Convert buffer to UTF-8 string (expecting the hex string)
        const hexKeyDataString = Buffer.from(hexKeyDataArrayBuffer).toString('utf-8').trim();
        if (!hexKeyDataString) throw new Error("Fetched key data is empty.");
         // Basic validation for hex format
         if (!/^(0x)?[a-fA-F0-9]+$/.test(hexKeyDataString)) {
            throw new Error("Fetched key data is not a valid hex string.");
        }
        console.log(`[${operationStep}] Fetched hex key data (${hexKeyDataString.length} chars).`);

        operationStep = "Attempting wallet decryption (eth_decrypt)";
        console.log(`[${operationStep}]`);

        let keyToImportHex = hexKeyDataString; // Default to using the fetched hex string
        try {
             // Ensure 0x prefix for the call
            const prefixedHexKey = hexKeyDataString.startsWith('0x') ? hexKeyDataString : '0x' + hexKeyDataString;

            const decryptResult: string | null = await window.ethereum.request({
                method: 'eth_decrypt',
                params: [prefixedHexKey, providerAddress],
            });

            console.log("eth_decrypt call completed. Result:", decryptResult);

            if (decryptResult) {
                 // Optional: Check if it just passed through the original value
                 const resultWithoutPrefix = decryptResult.startsWith('0x') ? decryptResult.substring(2) : decryptResult;
                 const originalWithoutPrefix = hexKeyDataString.startsWith('0x') ? hexKeyDataString.substring(2) : hexKeyDataString;
                 if (resultWithoutPrefix.toLowerCase() === originalWithoutPrefix.toLowerCase()) {
                     console.log("eth_decrypt seems to have passed through the hex key data.");
                     keyToImportHex = hexKeyDataString; // Use original formatting consistency
                 } else {
                     console.warn("eth_decrypt returned a modified value. Using the decrypted result, but this is unexpected for this flow.", decryptResult);
                     keyToImportHex = decryptResult; // Use the result from eth_decrypt
                 }
            } else {
                console.warn("eth_decrypt returned null or empty. Proceeding with fetched hex key directly.");
            }

        } catch (decryptError: any) {
            console.warn(`eth_decrypt failed (Code: ${decryptError.code}). This might be expected if wallet doesn't support decrypting arbitrary hex. Proceeding with fetched hex key directly. Error: ${decryptError.message}`);
        }

        // 4. Convert Final Hex Key to ArrayBuffer
        operationStep = "Decoding final hex key";
        console.log(`[${operationStep}]`);
        const finalHex = keyToImportHex.startsWith('0x') ? keyToImportHex.substring(2) : keyToImportHex;
        const rawKeyBuffer = Buffer.from(finalHex, 'hex');
        if (rawKeyBuffer.length === 0) throw new Error("Decoded key buffer is empty.");
        // Convert Buffer -> ArrayBuffer
        const rawKeyArrayBuffer = rawKeyBuffer.buffer.slice(rawKeyBuffer.byteOffset, rawKeyBuffer.byteOffset + rawKeyBuffer.length);

        // 5. Import Raw AES Key into CryptoKey
        operationStep = "Importing key";
        console.log(`[${operationStep}] Importing raw key into CryptoKey...`);
        const importedKey = await window.crypto.subtle.importKey(
            'raw', rawKeyArrayBuffer, { name: AES_ALGORITHM }, true, ['decrypt']
        );
        if (!importedKey) throw new Error("Failed to import key using crypto.subtle.importKey.");
        console.log(`[${operationStep}] Successfully imported AES CryptoKey for decryption.`);
        return importedKey;

    } catch (error: any) {
        console.error(`Error during provider key retrieval (Simplified Flow) [${operationStep}]:`, error);
        // Avoid duplicate alerts if possible
        if (!error.message?.includes("User rejected")) {
             alert(`An error occurred while preparing the decryption key: ${error.message || 'Unknown error'}`);
        }
        return null; // Return null on any failure
    }
};
// --- ********** END UPDATED FUNCTIONS ********** ---