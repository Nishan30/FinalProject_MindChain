// src/pages/RecordsPage.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, AlertCircle, CheckCircle, X, Eye } from 'lucide-react'; // Added X, Eye
import { useWallet } from '../context/WalletContext'; // Adjust path
import { useEncryptionKey } from '../context/KeyContext'; // Adjust path
import HealthRecordList from '../components/HealthRecordList'; // Adjust path
import { getPatientRecords, uploadRecord } from '../services/contractService'; // Adjust path
import { uploadToIPFS, fetchFromIPFS } from '../services/ipfsService'; // Added fetchFromIPFS, Adjust path
import { encryptData, decryptData, getOrDeriveEncryptionKey } from '../services/cryptoService'; // Added decryptData, Adjust path
import { HealthRecord } from '../types'; // Adjust path

const RecordsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useWallet();
    const { encryptionKey, setEncryptionKey, keyCacheRef } = useEncryptionKey(); // Use the key context

    // State for records list
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [loading, setLoading] = useState(true); // Loading records list
    const [error, setError] = useState(''); // Error fetching records list

    // State for upload form
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false); // Uploading process active
    const [uploadProgress, setUploadProgress] = useState(''); // More detailed progress/status
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the file input

    // State for viewing own files (PDF Modal)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [viewingRecordId, setViewingRecordId] = useState<number | null>(null);
    const [fileLoadingStates, setFileLoadingStates] = useState<{ [key: number]: boolean }>({}); // { recordId: isLoading }
    const [fileErrorStates, setFileErrorStates] = useState<{ [key: number]: string | null }>({}); // { recordId: errorMessage }

    // --- Effects ---

    // Redirect logic: Ensure user is logged in and is a patient
    useEffect(() => {
        if (!user) {
            navigate('/');
        } else if (user.role !== 'patient') {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    // Fetch records logic (memoized)
    const fetchRecords = useCallback(async (showLoader = true) => {
        if (!user?.address) {
            // Avoid setting loading if we can't fetch
            if (loading && showLoader) setLoading(false);
            return;
        }
        console.log("Fetching records for:", user.address);
        if (showLoader) setLoading(true);
        // Clear list-level error before fetching, keep file-level errors
        setError('');
        try {
            const data = await getPatientRecords(user.address);
            setRecords(data);
        } catch (err) {
            console.error('Error fetching records:', err);
            setError('Failed to load health records. Please try refreshing.');
            setRecords([]); // Clear records on error
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [user?.address]); // Dependency is stable user address

    // Initial records fetch on mount or user change
    useEffect(() => {
        if (user?.address && user.role === 'patient') {
            fetchRecords();
        } else {
             // If user context changes to null or non-patient, stop loading
            if(loading) setLoading(false);
        }
    }, [user?.address, user?.role, fetchRecords]); // Include fetchRecords which has user.address dependency

    // Effect to clean up Blob URL for PDF viewer when unmounted or URL changes
    useEffect(() => {
        const currentPdfUrl = pdfUrl; // Capture URL in effect scope
        return () => { // Cleanup function
            if (currentPdfUrl) {
                console.log("Cleanup Effect: Revoking Blob URL:", currentPdfUrl);
                URL.revokeObjectURL(currentPdfUrl);
            }
        };
    }, [pdfUrl]); // Re-run only when pdfUrl state changes

    // --- Callback Functions ---

    // Function to ensure encryption key is derived and available
    const ensureKeyIsAvailable = useCallback(async (): Promise<CryptoKey | null> => {
        if (encryptionKey) {
            console.log("Using existing key from context.");
            return encryptionKey;
        }
        if (!user?.address) {
            console.error("User address not available for key derivation.");
            setError("Cannot derive key: Wallet address unavailable.");
            return null;
        }
        console.log("Attempting to derive key...");
        const key = await getOrDeriveEncryptionKey(user.address, keyCacheRef.current); // Pass cache ref
        if (key) {
            setEncryptionKey(key); // Update context state
            console.log("Key derived and set in context.");
        } else {
            // Error alerts are handled inside getOrDeriveEncryptionKey
            setError("Failed to prepare encryption key. Check wallet connection and signature prompts.");
            // Also set error for specific operation if applicable (like upload or view)
        }
        return key;
    }, [user?.address, encryptionKey, setEncryptionKey, keyCacheRef]); // Dependencies

    // Handler for file selection in upload form
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadError(''); // Clear errors when new file selected
            setUploadSuccess(false);
            setUploadProgress('');
        } else {
            setFile(null);
        }
    };

    // Main Upload Handler Logic
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploadError(''); setUploadSuccess(false); setUploadProgress('Initiating upload...');
        // Basic validation
        if (!title.trim() || !description.trim() || !file || !user?.address) {
            setUploadError('Title, description, and a selected file are required.');
            setUploadProgress(''); return;
        }
        setUploading(true); // Start upload process

        try {
            // 1. Ensure Key is Ready
            setUploadProgress('Preparing encryption key...');
            const key = await ensureKeyIsAvailable();
            if (!key) {
                setUploadError("Encryption key needed. Please approve signature request if prompted.");
                throw new Error("Encryption key unavailable.");
            }
            setUploadProgress('Encryption key ready.');

            // 2. Read File
            setUploadProgress(`Reading file: ${file.name}...`);
            const fileReader = new FileReader();
            const fileBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                fileReader.onload = (event) => resolve(event.target?.result as ArrayBuffer);
                fileReader.onerror = (err) => reject(new Error(`File reading failed: ${err}`));
                fileReader.readAsArrayBuffer(file);
            });
            console.log("File read completed.");

            // 3. Encrypt Data (Check result before destructuring)
            setUploadProgress('Encrypting file data...');
            const encryptionResult = await encryptData(fileBuffer, key);
            if (!encryptionResult) {
                throw new Error("File encryption failed. Check console for details.");
            }
            const { encryptedData, iv } = encryptionResult; // Destructure safely
            // Prepend IV
            const combinedBuffer = new Uint8Array(iv.length + encryptedData.byteLength);
            combinedBuffer.set(iv, 0); combinedBuffer.set(new Uint8Array(encryptedData), iv.length);
            const dataToUpload = new Blob([combinedBuffer]);
            console.log("File encrypted (IV prepended).");

            // 4. Upload to IPFS
            setUploadProgress(`Uploading encrypted data to IPFS...`);
            const ipfsHash = await uploadToIPFS(dataToUpload);
            if (!ipfsHash) throw new Error("IPFS upload failed to return a hash.");
            console.log("IPFS Upload Successful! Hash:", ipfsHash);
            setUploadProgress(`File on IPFS: ${ipfsHash.substring(0, 10)}...`);

            // 5. Store Metadata on Blockchain
            setUploadProgress('Storing record metadata on blockchain...');
            const txSuccess = await uploadRecord(title, description, ipfsHash);
            if (!txSuccess) throw new Error('Storing record metadata failed. Transaction may have reverted.');
            console.log("Blockchain record transaction successful.");

            // SUCCESS
            setUploadSuccess(true); setUploadProgress('Record successfully created!'); setError('');
            // Reset form & refresh list after delay
            setTimeout(() => {
                setTitle(''); setDescription(''); setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                setShowUploadForm(false); setUploadProgress(''); setUploadSuccess(false);
                fetchRecords(false); // Refresh list without main loader
            }, 2500); // Slightly longer delay

        } catch (err: any) {
            console.error('Error during full upload process:', err);
            const errorMsg = `Upload failed: ${err.message || 'An unknown error occurred'}`;
            setUploadError(errorMsg); setUploadProgress('Upload failed.'); setUploadSuccess(false);
        } finally {
            setUploading(false); // Re-enable form/button
        }
    };

    // --- Handler for Viewing Own Record ---
    const handleViewOwnRecord = useCallback(async (record: HealthRecord) => {
        const recordId = record.id;
        console.log(`Patient viewing own record ID: ${recordId}, Hash: ${record.dataHash}`);

        // Set loading/status state for THIS specific record
        setFileLoadingStates(prev => ({ ...prev, [recordId]: true }));
        setFileErrorStates(prev => ({ ...prev, [recordId]: "Preparing key..." }));
        setViewingRecordId(recordId); // Track which record is being actively viewed/loaded
        setPdfUrl(null); // Close any previously opened modal

        // 1. Ensure key is available (patient's own key)
        const key = await ensureKeyIsAvailable(); // Uses the derivation/context logic
        if (!key) {
            // Set error for this specific file item
            setFileErrorStates(prev => ({ ...prev, [recordId]: "Your key is unavailable. Connect wallet & sign." }));
            setFileLoadingStates(prev => ({ ...prev, [recordId]: false }));
            setViewingRecordId(null);
            return; // Stop if key cannot be obtained
        }

        try {
            // 2. Fetch encrypted data from IPFS
            setFileErrorStates(prev => ({ ...prev, [recordId]: "Fetching data..." }));
            const encryptedBuffer = await fetchFromIPFS(record.dataHash);
            if (!encryptedBuffer || encryptedBuffer.byteLength === 0) {
                throw new Error("Fetched empty record data from IPFS.");
            }

            // 3. Decrypt data using OWN key
            setFileErrorStates(prev => ({ ...prev, [recordId]: "Decrypting..." }));
            console.log("key" , key);
            const decryptedDataBuffer = await decryptData(encryptedBuffer, key); // Pass patient's key
            if (!decryptedDataBuffer) { // Check if decryptData returned null
                throw new Error("Decryption failed. Check console.");
            }
            console.log(`Record ${recordId}: Decryption successful.`);

            // 4. Create Blob URL
            const mimeType = 'application/pdf'; // Assuming PDF for simplicity
            const fileBlob = new Blob([decryptedDataBuffer], { type: mimeType });
            const url = URL.createObjectURL(fileBlob);
            console.log(`Record ${recordId}: Created Blob URL: ${url}`);

            // 5. Set state to display the PDF Modal
            setPdfUrl(url); // Trigger modal rendering
            setFileErrorStates(prev => ({ ...prev, [recordId]: null })); // Clear any previous error/status for this item

        } catch (err: any) {
            console.error(`Error viewing own record ${recordId}:`, err);
            // Display specific error message for this file item
            setFileErrorStates(prev => ({ ...prev, [recordId]: `Failed: ${err.message || 'Unknown error'}` }));
            setPdfUrl(null); // Ensure modal doesn't open on error
        } finally {
            // Always clear loading state for this specific file
            setFileLoadingStates(prev => ({ ...prev, [recordId]: false }));
            // Keep viewingRecordId set if modal is open or error is shown
        }
    }, [ensureKeyIsAvailable, decryptData, fetchFromIPFS]); // Dependencies

    // --- Handler to close PDF modal ---
    const closePdfViewer = useCallback(() => {
        setPdfUrl(null); // Setting to null triggers the useEffect cleanup for the blob URL
        // Clear error state only for the record that was being viewed
        if(viewingRecordId !== null) {
            setFileErrorStates(prev => ({ ...prev, [viewingRecordId]: null }));
        }
        setViewingRecordId(null); // Reset which record is being viewed
    }, [viewingRecordId]); // viewingRecordId needed to clear correct error state


    // --- Render ---

    // Render null if user is not a patient (redirect logic runs in useEffect)
    if (!user || user.role !== 'patient') {
        // Optionally show a loading indicator while redirecting
        // return <div className="text-center p-10">Loading...</div>;
        return null;
    }

    // Main component JSX
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header and Upload Button */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center">
                    <FileText className="h-7 w-7 text-blue-600 mr-2" />
                    <h1 className="text-3xl font-bold text-gray-900">My Health Records</h1>
                </div>
                <button
                    onClick={() => {
                        setShowUploadForm(!showUploadForm);
                        // Reset form state if closing form
                        if (showUploadForm) {
                            setUploadError(''); setUploadProgress(''); setUploadSuccess(false);
                            setTitle(''); setDescription(''); setFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                        }
                    }}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors text-sm font-medium"
                >
                    {showUploadForm ? (
                        <> <X size={18} className="-ml-1 mr-1" /> Cancel Upload </>
                    ) : (
                        <> <Upload size={18} className="-ml-1 mr-1" /> Upload New Record </>
                    )}
                </button>
            </div>

            {/* General Error Display (for fetching list) */}
            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded-md flex items-center border border-red-200">
                    <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                    <span>{error}</span>
                     {/* Optional: Add refresh button */}
                     {/* <button onClick={() => fetchRecords(true)} className="ml-auto text-sm font-medium text-red-800 underline">Try Again</button> */}
                </div>
            )}

            {/* Upload Form Section (Conditional) */}
            {showUploadForm && (
                <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Upload New Health Record</h2>

                    {/* Upload Status Display Area */}
                     <div className="mb-4 min-h-[2rem]"> {/* Reserve space for messages */}
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
                    <form onSubmit={handleUpload} className="space-y-2">
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
                    <p className="text-sm text-gray-600 mt-1">View or manage consents for your encrypted records.</p>
                </div>
                <div className="p-4 sm:p-6">
                     {/* Loading State */}
                    {loading ? (
                        <div className="text-center py-10">
                            <svg className="animate-spin mx-auto h-8 w-8 text-blue-600" /* ... */>...</svg>
                            <p className="text-gray-600 mt-4">Loading records...</p>
                        </div>
                    ) : !error && records.length === 0 ? ( // Empty State (No Error)
                        <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
                            <p className="text-gray-600">You haven't uploaded any records yet.</p>
                            <p className="text-sm text-gray-500 mt-2">Click "Upload New Record" above.</p>
                        </div>
                    ) : !error ? ( // Data Available State (No Error)
                        <HealthRecordList
                            records={records}
                            onViewRecord={handleViewOwnRecord} // Pass the handler
                            fileLoadingStates={fileLoadingStates} // Pass state for item-level feedback
                            fileErrorStates={fileErrorStates}   // Pass state for item-level feedback
                         />
                    ) : null /* Error State Handled Above */}
                </div>
            </div>

             {/* PDF Viewer Modal */}
             {pdfUrl && viewingRecordId !== null && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4" // Basic, visible styling
                    onClick={closePdfViewer} // Close on overlay click
                    aria-modal="true"
                    role="dialog"
                    aria-labelledby="record-pdf-modal-title"
                >
                    <div
                        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden" // Basic, visible styling
                        onClick={(e) => e.stopPropagation()} // Prevent closing on modal click
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-3 border-b bg-gray-50 flex-shrink-0">
                            <h3 id="record-pdf-modal-title" className="text-lg font-medium text-gray-800">
                                Viewing Record ID: <span className="font-semibold">{viewingRecordId}</span>
                            </h3>
                            <button
                                onClick={closePdfViewer}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                aria-label="Close PDF Viewer"
                            > <X size={20} /> </button>
                        </div>
                        {/* PDF Embed */}
                        <div className="flex-grow overflow-auto p-1 bg-gray-300">
                            <iframe
                                src={pdfUrl}
                                title={`PDF Viewer - Record ${viewingRecordId}`}
                                className="w-full h-full border-0 bg-white shadow-inner" // Ensure dimensions
                            />
                        </div>
                    </div>
                </div>
            )}

        </div> // End main container
    );
};

export default RecordsPage;