// src/utils/cryptoService.ts
import { BrowserProvider, ethers } from 'ethers';
import { Buffer } from 'buffer'; // Ensure buffer is available

// --- Configuration ---
const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH_BITS = 256; // Use 256 bits
const IV_LENGTH_BYTES = 12; // Standard for AES-GCM

// --- KDF Configuration (Using PBKDF2) ---
const KDF_ALGORITHM = 'PBKDF2';
const KDF_HASH = 'SHA-256'; // Hash for PBKDF2
const KDF_SALT_STRING = "health-records-dapp-salt-v1"; // **IMPORTANT**: Use a unique, fixed salt for your app
const KDF_ITERATIONS = 100000; // Number of iterations (balance security/performance)

const SIGNATURE_MESSAGE_PREFIX = "Sign this message to generate your secure encryption key for the Health Records dApp.\n\nAddress: ";
const SIGNATURE_MESSAGE_NONCE = "\nNonce: 20240516"; // Fixed nonce string

// Ensure Buffer is available globally if needed (e.g., for some libraries, though maybe not Web Crypto directly)
// window.Buffer = window.Buffer || Buffer;

// --- Helper: Get Signature (Keep as is, but ensure userAddress is passed correctly) ---
async function getSignature(userAddress: string): Promise<string | null> {
    // ... (Your existing implementation is generally okay)
    // Ensure you are requesting signature for the correct userAddress
    if (!window.ethereum) {
        console.error("Wallet not found.");
        alert("Wallet not found. Please install MetaMask or a compatible wallet.");
        return null;
    }
    try {
        const provider = new BrowserProvider(window.ethereum);
        // Request accounts to ensure connection, though signer might be implicitly available
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner(userAddress); // Get signer for the *intended* address

        const messageToSign = `${SIGNATURE_MESSAGE_PREFIX}${userAddress}${SIGNATURE_MESSAGE_NONCE}`;

        console.log("Requesting signature for key derivation...");
        alert(`Please sign the message in your wallet to generate/access your secure encryption key.\nMessage:\n${messageToSign}`);

        const signature = await signer.signMessage(messageToSign);
        console.log("Signature obtained for key derivation.");
        return signature;
    } catch (error: any) {
        console.error("Failed to get signature:", error);
        if (error.code === 4001) {
            alert("Signature request rejected. Cannot generate encryption key.");
        } else {
            alert(`Failed to get signature: ${error.message || 'Unknown error'}`);
        }
        return null;
    }
}

// --- Helper: Derive Key from Signature using PBKDF2 ---
async function deriveKeyFromSignature_PBKDF2(signature: string): Promise<CryptoKey> {
    try {
        const encoder = new TextEncoder();
        // Use the signature itself as the "password" material
        const passwordMaterial = encoder.encode(signature);
        // Use a fixed, application-specific salt
        const salt = encoder.encode(KDF_SALT_STRING);

        // 1. Import the password material as a base key for PBKDF2
        const baseKey = await window.crypto.subtle.importKey(
            'raw',
            passwordMaterial,
            { name: KDF_ALGORITHM },
            false, // Not extractable
            ['deriveBits', 'deriveKey']
        );

        // 2. Derive the AES key using PBKDF2
        const derivedKey = await window.crypto.subtle.deriveKey(
            {
                name: KDF_ALGORITHM,
                salt: salt,
                iterations: KDF_ITERATIONS,
                hash: KDF_HASH,
            },
            baseKey, // Use the imported key as the base key
            { name: AES_ALGORITHM, length: AES_KEY_LENGTH_BITS }, // Desired AES key algorithm and length
            true, // Make the key extractable if you need to (e.g., for wrapping), false otherwise
            ['encrypt', 'decrypt'] // Key usages
        );

        console.log("AES key derived via PBKDF2.");
        return derivedKey;
    } catch (error) {
        console.error("Failed to derive key via PBKDF2:", error);
        throw new Error(`Key derivation via PBKDF2 failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}


// --- Derive/Retrieve Key Function ---
// This should be called by your app, potentially caching the result in secure memory (e.g., React Context)
// Avoid storing the key in localStorage. Re-derive per session or use secure memory cache.
export const getOrDeriveEncryptionKey = async (userAddress: string, cache: { key: CryptoKey | null }): Promise<CryptoKey | null> => {
    if (cache.key) {
        console.log("Using cached encryption key.");
        return cache.key;
    }

    console.log(`Deriving encryption key for ${userAddress} via signature + PBKDF2...`);
    const signature = await getSignature(userAddress);
    if (!signature) {
        console.error("Could not obtain signature. Key derivation aborted.");
        return null;
    }
    try {
        const key = await deriveKeyFromSignature_PBKDF2(signature);
        console.log("Encryption key derived successfully.");
        cache.key = key; // Cache the key in memory
        return key;
    } catch (error) {
        console.error("Error deriving encryption key:", error);
        cache.key = null;
        return null;
    }
};

// --- Encryption Function ---
export const encryptData = async (data: ArrayBuffer, key: CryptoKey): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array }> => {
    try {
        const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
        const encryptedData = await window.crypto.subtle.encrypt(
            { name: AES_ALGORITHM, iv: iv },
            key,
            data
        );
        console.log("Data encrypted.");
        // Return IV separately or prepend it before returning ArrayBuffer, but be consistent
        return { encryptedData, iv };
    } catch (error) {
        console.error("Encryption failed:", error);
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
};

// --- Decryption Function ---
// Assumes IV is prepended to the ciphertext
export const decryptData = async (encryptedDataWithIv: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> => {
    try {
        if (encryptedDataWithIv.byteLength < IV_LENGTH_BYTES) { // Use < instead of <=
            throw new Error("Invalid encrypted data: too short to contain IV.");
        }
        // Extract IV from the beginning
        const iv = new Uint8Array(encryptedDataWithIv.slice(0, IV_LENGTH_BYTES));
        // Get the actual ciphertext
        const encryptedData = encryptedDataWithIv.slice(IV_LENGTH_BYTES);

        if (encryptedData.byteLength === 0) {
             throw new Error("Invalid encrypted data: ciphertext is empty.");
        }


        const decryptedData = await window.crypto.subtle.decrypt(
            { name: AES_ALGORITHM, iv: iv },
            key,
            encryptedData
        );
        console.log("Data decrypted.");
        return decryptedData;
    } catch (error: any) { // Catch specific errors if possible
        console.error("Decryption failed:", error);
        // Provide more specific feedback if it's likely an incorrect key or corrupted data
        if (error.name === 'OperationError') {
             throw new Error("Decryption failed: Likely incorrect key or corrupted data.");
        }
        throw new Error(`Decryption failed: ${error.message || String(error)}`);
    }
};


// --- Placeholder for Provider Decryption ---
// Needs implementation involving fetching wrapped key and asymmetric decryption
export const getDecryptionKeyForRecord_Provider = async (
    providerAddress: string, // The provider trying to decrypt
    consentIdentifier: string // Info to link to the wrapped key (e.g., consentId, or identifier stored off-chain)
): Promise<CryptoKey | null> => {
    console.warn("Provider decryption logic (getDecryptionKeyForRecord_Provider) not implemented.");
    // 1. Fetch the wrapped (asymmetrically encrypted) AES key associated with consentIdentifier
    //    (e.g., from an off-chain database or IPFS hash linked from blockchain)
    // 2. Prompt provider's wallet to decrypt the wrapped key using their private key (e.g., using eth_decrypt or similar)
    // 3. Import the decrypted raw AES key using crypto.subtle.importKey
    // 4. Return the imported CryptoKey
    alert("Provider decryption logic is not yet implemented!");
    return null;
};