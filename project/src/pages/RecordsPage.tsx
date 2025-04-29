// src/pages/RecordsPage.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useWallet } from '../context/WalletContext'; // Adjust path
import { useEncryptionKey } from '../context/KeyContext';
import HealthRecordList from '../components/HealthRecordList'; // Adjust path
import { getPatientRecords, uploadRecord } from '../services/contractService'; // Adjust path
import { uploadToIPFS } from '../services/ipfsService'; // Adjust path
import { encryptData, getOrDeriveEncryptionKey } from '../services/cryptoService'; // Adjust path (uses PBKDF2)
import { HealthRecord } from '../types'; // Adjust path

const RecordsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useWallet();
    const { encryptionKey, setEncryptionKey, keyCacheRef } = useEncryptionKey(); // Use the key context

    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [loading, setLoading] = useState(true); // Loading records list
    const [error, setError] = useState(''); // Error fetching records list
    const [showUploadForm, setShowUploadForm] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false); // Uploading process active
    const [uploadProgress, setUploadProgress] = useState(''); // More detailed progress/status
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Ref for the file input to allow resetting it
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Redirect logic
    useEffect(() => {
        if (!user) { navigate('/'); }
        else if (user.role !== 'patient') { navigate('/dashboard'); }
    }, [user, navigate]);

    // Fetch records logic
    const fetchRecords = useCallback(async () => {
        if (!user?.address) return;
        console.log("Fetching records for:", user.address);
        setLoading(true);
        setError('');
        try {
            const data = await getPatientRecords(user.address);
            setRecords(data);
        } catch (err) {
            console.error('Error fetching records:', err);
            setError('Failed to load health records. Please try again later.');
        } finally {
            setLoading(false);
        }
    }, [user?.address]); // Dependency

    useEffect(() => {
        if (user?.address && user.role === 'patient') {
            fetchRecords();
        }
    }, [user?.address, user?.role, fetchRecords]); // Include fetchRecords and role

    // Function to ensure encryption key is derived and available
    const ensureKeyIsAvailable = useCallback(async (): Promise<CryptoKey | null> => {
        if (encryptionKey) {
            console.log("Using existing key from context.");
            return encryptionKey;
        }
        if (!user?.address) {
            console.error("User address not available for key derivation.");
            setError("Cannot derive key: Wallet not connected or address unavailable."); // Show error to user
            return null;
        }
        console.log("Attempting to derive key...");
        // Pass the stable ref object for caching
        const key = await getOrDeriveEncryptionKey(user.address, keyCacheRef.current);
        if (key) {
            setEncryptionKey(key); // Update context state
            console.log("Key derived and set in context.");
        } else {
            // getOrDeriveEncryptionKey should alert/log errors internally
            setError("Failed to prepare encryption key. Please ensure your wallet is connected and sign the message when prompted.");
            setUploadError("Failed to prepare encryption key."); // Also set form error
        }
        return key;
    }, [user?.address, encryptionKey, setEncryptionKey, keyCacheRef]); // Dependencies for useCallback

    // Handler for file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadError('');
            setUploadSuccess(false);
            setUploadProgress('');
        } else {
            setFile(null);
        }
    };

    // Main Upload Handler
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploadError('');
        setUploadSuccess(false);
        setUploadProgress('Initiating upload...');

        if (!title.trim() || !description.trim() || !file || !user?.address) {
            setUploadError('Title, description, file, and wallet connection are required.');
            setUploadProgress('');
            return;
        }

        setUploading(true);

        try {
            // 1. Ensure Key is Ready
            setUploadProgress('Preparing encryption key...');
            const key = await ensureKeyIsAvailable();
            if (!key) {
                // Error is set within ensureKeyIsAvailable
                setUploadProgress('Key preparation failed.');
                throw new Error("Encryption key could not be prepared."); // Throw to exit try block
            }
            setUploadProgress('Encryption key ready.');

            // 2. Read File
            setUploadProgress(`Reading file: ${file.name}...`);
            const fileReader = new FileReader();
            const fileBufferPromise = new Promise<ArrayBuffer>((resolve, reject) => {
                fileReader.onload = (event) => resolve(event.target?.result as ArrayBuffer);
                fileReader.onerror = (error) => reject(error);
                fileReader.readAsArrayBuffer(file);
            });
            const fileBuffer = await fileBufferPromise;
            console.log("File read completed.");

            // 3. Encrypt Data
            setUploadProgress('Encrypting file data...');
            const { encryptedData, iv } = await encryptData(fileBuffer, key);
            // Prepend IV to the encrypted data for storage
            const combinedBuffer = new Uint8Array(iv.length + encryptedData.byteLength);
            combinedBuffer.set(iv, 0);
            combinedBuffer.set(new Uint8Array(encryptedData), iv.length);
            const dataToUpload = new Blob([combinedBuffer]); // Create Blob from combined buffer
            console.log("File encrypted (IV prepended).");

            // 4. Upload to IPFS
            setUploadProgress(`Uploading encrypted data to IPFS...`);
            // Ensure uploadToIPFS handles Blob correctly
            const ipfsHash = await uploadToIPFS(dataToUpload);
            if (!ipfsHash) {
                throw new Error("IPFS upload failed to return a hash.");
            }
            console.log("IPFS Upload Successful! Hash:", ipfsHash);
            setUploadProgress(`File uploaded to IPFS: ${ipfsHash.substring(0, 10)}...`);

            // 5. Store Metadata on Blockchain
            setUploadProgress('Storing record metadata on the blockchain...');
            // Ensure uploadRecord returns a boolean or throws on failure
            const txSuccess = await uploadRecord(title, description, ipfsHash);

            if (txSuccess) {
                console.log("Blockchain record transaction successful.");
                setUploadSuccess(true);
                setUploadProgress('Record successfully created!');
                setError(''); // Clear any previous general errors

                // Reset form and refresh list after a short delay
                setTimeout(() => {
                    setTitle('');
                    setDescription('');
                    setFile(null);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                    }
                    setShowUploadForm(false);
                    setUploadProgress('');
                    setUploadSuccess(false); // Reset success state for next upload
                    fetchRecords(); // Refresh the list
                }, 2000); // Delay to show success message

            } else {
                // If uploadRecord returns false instead of throwing
                throw new Error('Storing record metadata on the blockchain failed. Transaction may have reverted.');
            }
        } catch (err: any) {
            console.error('Error during full upload process:', err);
            const errorMsg = `Upload failed: ${err.message || 'An unknown error occurred'}`;
            setUploadError(errorMsg);
            setUploadProgress('Upload failed.'); // Update status
            setUploadSuccess(false);
        } finally {
            setUploading(false); // Re-enable button
        }
    };

    // Render null if user is not a patient (redirect handles actual navigation)
    if (!user || user.role !== 'patient') {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header and Upload Button */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center">
                    <FileText className="h-6 w-6 text-blue-600 mr-2" />
                    <h1 className="text-2xl font-bold text-gray-900">My Health Records</h1>
                </div>
                <button
                    onClick={() => {
                        setShowUploadForm(!showUploadForm);
                        // Reset form state if closing
                        if (showUploadForm) {
                            setUploadError('');
                            setUploadProgress('');
                            setUploadSuccess(false);
                            setTitle('');
                            setDescription('');
                            setFile(null);
                             if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                            }
                        }
                    }}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
                >
                    {showUploadForm ? (
                        'Cancel Upload'
                    ) : (
                        <>
                            <Upload size={18} className="mr-1" />
                            Upload New Record
                        </>
                    )}
                </button>
            </div>

            {/* General Error Display (for fetching list) */}
            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded-md flex items-center">
                    <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Upload Form Section (Conditional) */}
            {showUploadForm && (
                <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Upload New Health Record</h2>

                    {/* Upload Status Display Area */}
                     <div className="mb-4 min-h-[4rem]"> {/* Reserve space for messages */}
                        {uploadError && (
                            <div className="p-3 bg-red-100 text-red-700 rounded-md flex items-center text-sm">
                               <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                               <span>{uploadError}</span>
                            </div>
                        )}
                         {uploadSuccess && (
                            <div className="p-3 bg-green-100 text-green-700 rounded-md flex items-center text-sm">
                               <CheckCircle size={18} className="mr-2 flex-shrink-0" />
                               <span>{uploadProgress || 'Upload successful!'}</span>
                            </div>
                        )}
                         {/* Show progress only when actively uploading and no final success/error */}
                         {uploading && !uploadSuccess && !uploadError && uploadProgress && (
                           <div className="p-3 bg-blue-50 text-blue-700 rounded-md flex items-center text-sm">
                              <svg className="animate-spin h-4 w-4 mr-2 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             <span>{uploadProgress}</span>
                           </div>
                         )}
                     </div>


                    {/* Actual Form */}
                    <form onSubmit={handleUpload} className="space-y-4">
                        {/* Title Input */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                Record Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                placeholder="e.g., Therapy Session Notes - Jan 2024"
                                required
                                disabled={uploading}
                            />
                        </div>
                        {/* Description Input */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                placeholder="Brief description of the record's content"
                                required
                                disabled={uploading}
                            />
                        </div>
                        {/* File Input */}
                        <div>
                            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                                File <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="file"
                                id="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                required
                                disabled={uploading}
                                // accept=".pdf,.jpg,.png,.txt,.md" // Example: Specify acceptable file types
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                File will be encrypted before upload.
                            </p>
                        </div>
                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={uploading || !file} // Disable if uploading or no file
                            className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" // Adjusted padding
                        >
                            {uploading ? (
                                <>
                                    {/* Spinner */}
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Processing...
                                </>
                            ) : (
                                'Encrypt, Upload & Save Record'
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* Records List Display */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-800">Your Stored Health Records</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Encrypted records stored on IPFS. Access is managed via your consents.
                    </p>
                </div>
                <div className="p-6">
                     {/* Loading State */}
                    {loading ? (
                        <div className="text-center py-10">
                            <svg className="animate-spin mx-auto h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="text-gray-600 mt-4">Loading records...</p>
                        </div>
                    ) : !error && records.length === 0 ? ( // Empty State (No Error)
                        <div className="bg-gray-50 p-6 rounded-lg text-center">
                            <p className="text-gray-600">You haven't uploaded any records yet.</p>
                            <p className="text-sm text-gray-500 mt-2">Click "Upload New Record" above to add your first record.</p>
                        </div>
                    ) : !error ? ( // Data Available State (No Error)
                        <HealthRecordList records={records} />
                    ) : null /* Error State (Error message shown above) */}
                </div>
            </div>
        </div>
    );
};

export default RecordsPage;