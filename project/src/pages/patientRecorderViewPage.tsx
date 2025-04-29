// pages/PatientRecordsViewerPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext'; // Adjust path
// Import necessary service functions and types
import { getPatientRecords, getPatientConsents } from '../services/contractService'; // Adjust path
// Import IPFS fetch and gateway URL generator
import { fetchFromIPFS, getIPFSGatewayUrl } from '../services/ipfsService'; // Adjust path
// Import placeholder crypto functions (NEEDS REAL IMPLEMENTATION)
import { getDecryptionKeyForRecord, decryptData } from '../services/cryptoService'; // Adjust path
import { HealthRecord, ConsentRecord, User } from '../types'; // Adjust path
// Import Icons
import {
    FileText,
    Calendar,
    AlertTriangle,
    CheckCircle,
    Lock,
    Unlock,
    Eye,
    X,
    Copy as CopyIcon,
    Download,
    Info // Added Info icon
} from 'lucide-react';

// --- Helper Functions ---

/**
 * Formats a Unix timestamp (seconds) into a locale-specific date and time string.
 * @param timestamp Unix timestamp in seconds.
 * @returns Formatted date string or 'N/A'.
 */
const formatTimestamp = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return 'N/A';
  try {
    // Multiply by 1000 for milliseconds
    return new Date(timestamp * 1000).toLocaleString(undefined, {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hour12: true
    });
  } catch (e) {
      console.error("Error formatting timestamp:", e);
      return 'Invalid Date';
  }
};

/**
 * Checks if the provider has active consent for the specific data type for this patient.
 * @param patientConsents Array of consents granted BY the patient.
 * @param providerAddress Address of the logged-in provider checking access.
 * @param requestedDataType The specific data type access is requested for.
 * @returns boolean True if valid consent exists, false otherwise.
 */
const checkProviderConsent = (
    patientConsents: ConsentRecord[] | null,
    providerAddress: string | undefined,
    requestedDataType: string | null
): boolean => {
    // Basic validation
    if (!patientConsents || !providerAddress || !requestedDataType) {
        return false;
    }

    const nowTimestamp = Math.floor(Date.now() / 1000); // Current time in seconds

    // Find if there's at least one active consent matching criteria
    const hasValidConsent = patientConsents.some(consent => {
        const isProviderMatch = consent.providerAddress.toLowerCase() === providerAddress.toLowerCase();
        const isDataTypeMatch = consent.dataType === requestedDataType;
        const isActiveFlag = consent.isActive;
        const isNotExpired = consent.expiryDate >= nowTimestamp;

        return isProviderMatch && isDataTypeMatch && isActiveFlag && isNotExpired;
    });

    return hasValidConsent;
};

// --- Component Definition ---

const PatientRecordsViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWallet(); // Get the logged-in provider info (address, role)
  const { patientAddress } = useParams<{ patientAddress: string }>(); // Get patient address from URL path (e.g., /patient-records/0x123...)
  const [searchParams] = useSearchParams(); // Hook to access URL query parameters
  const requestedDataType = searchParams.get('dataType'); // Get data type from query (e.g., ?dataType=Therapy%20Notes)

  // State for fetched data
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [patientConsents, setPatientConsents] = useState<ConsentRecord[] | null>(null); // Consents GRANTED BY the patient

  // State for UI control
  const [loading, setLoading] = useState(true); // Loading initial page data
  const [error, setError] = useState<string | null>(null); // General page error

  // State for viewing/downloading specific files
  const [pdfUrl, setPdfUrl] = useState<string | null>(null); // Blob URL for the PDF viewer
  const [viewingRecordId, setViewingRecordId] = useState<number | null>(null); // ID of the record being viewed/loaded
  const [fileLoadingStates, setFileLoadingStates] = useState<{ [key: number]: boolean }>({}); // Loading state per file { recordId: isLoading }
  const [fileErrorStates, setFileErrorStates] = useState<{ [key: number]: string | null }>({}); // Error state per file { recordId: errorMessage }

  // Memoized value to determine if the provider has overall access for the requested data type
  const hasValidAccess = useMemo(() => {
      return checkProviderConsent(patientConsents, user?.address, requestedDataType);
  }, [patientConsents, user?.address, requestedDataType]); // Recalculate when these change

  // --- Effects ---

  // Effect for redirection logic
  useEffect(() => {
    if (!user) {
      console.log("PatientRecordsViewer: No user found, redirecting to home.");
      navigate('/'); // Not logged in
      return; // Stop further execution in this effect
    }
    if (user.role !== 'provider') {
      console.log("PatientRecordsViewer: User is not a provider, redirecting to dashboard.");
      navigate('/dashboard'); // Not a provider
      return; // Stop further execution in this effect
    }
    if (!patientAddress || !requestedDataType) {
       console.error("PatientRecordsViewer: Missing patientAddress or requestedDataType in URL.");
       setError("Required information (Patient Address or Data Type) is missing from the URL.");
       setLoading(false); // Stop loading as we can't fetch
       // Optionally navigate back: navigate(-1);
       return; // Stop further execution in this effect
    }
  }, [user, navigate, patientAddress, requestedDataType]); // Dependencies

  // Effect to fetch initial records and consents
  useEffect(() => {
    // Only fetch if prerequisites are met (user is provider, address/dataType exist)
    if (user?.role === 'provider' && patientAddress && requestedDataType) {
      setLoading(true);
      setError(null); // Clear previous errors
      setPatientConsents(null); // Reset consents
      setRecords([]); // Reset records

      const fetchData = async () => {
        console.log(`Fetching data for patient: ${patientAddress}, type: ${requestedDataType}`);
        try {
          // Fetch records and consents in parallel for efficiency
          const [fetchedRecords, fetchedConsents] = await Promise.all([
             getPatientRecords(patientAddress),
             getPatientConsents(patientAddress) // Fetch consents granted BY this specific patient
          ]);

          setRecords(fetchedRecords);
          setPatientConsents(fetchedConsents);
          console.log("Fetched Records:", fetchedRecords);
          console.log("Fetched Patient Consents:", fetchedConsents);

        } catch (err: any) {
          console.error("Error fetching patient data:", err);
          setError(err.message || "Failed to load patient data. Please check the address and try again.");
        } finally {
          setLoading(false); // Stop loading indicator
        }
      };

      fetchData();
    } else {
       // If prerequisites aren't met (e.g., still redirecting), just stop loading
       if(loading) setLoading(false);
    }
    // Dependencies: Re-run if user, address, or data type changes
  }, [user, patientAddress, requestedDataType]);

  // Effect to clean up Blob URL when component unmounts or pdfUrl changes
  useEffect(() => {
    const currentPdfUrl = pdfUrl; // Capture current URL in effect scope
    // Cleanup function
    return () => {
      if (currentPdfUrl) {
        console.log("Revoking Blob URL:", currentPdfUrl);
        URL.revokeObjectURL(currentPdfUrl);
      }
    };
  }, [pdfUrl]); // Run when pdfUrl changes

  // --- Event Handlers ---

  /**
   * Handles fetching, decrypting, and displaying a record's file (e.g., PDF).
   * @param record The HealthRecord object containing the IPFS hash.
   */
  const handleViewFile = useCallback(async (record: HealthRecord) => {
    // Double-check consent and necessary info
    if (!hasValidAccess || !user?.address || !patientAddress) {
      alert("Consent validation failed or required information is missing. Cannot view record.");
      return;
    }

    const recordId = record.id;
    console.log(`Initiating view/download for record ID: ${recordId}, Hash: ${record.dataHash}`);

    // Set loading state for this specific file
    setViewingRecordId(recordId);
    setFileLoadingStates(prev => ({ ...prev, [recordId]: true }));
    setFileErrorStates(prev => ({ ...prev, [recordId]: null }));
    setPdfUrl(null); // Clear any previously displayed PDF

    try {
        // 1. Fetch encrypted data from IPFS
        setFileErrorStates(prev => ({ ...prev, [recordId]: "Fetching from IPFS..." })); // Progress update
        const encryptedChunks = await fetchFromIPFS(record.dataHash);
        const encryptedBlob = new Blob([encryptedChunks]);
        const encryptedBuffer = await encryptedBlob.arrayBuffer();
        console.log(`Record ${recordId}: Fetched encrypted data, size: ${encryptedBuffer.byteLength}`);
        setFileErrorStates(prev => ({ ...prev, [recordId]: "Fetching key..." })); // Progress update


        // 2. Get the DECRYPTION key (CRITICAL - NEEDS SECURE IMPLEMENTATION)
        const decryptionKey = await getDecryptionKeyForRecord(user.address, patientAddress, recordId);
        if (!decryptionKey) {
            throw new Error("Decryption key not available or permission denied.");
        }
        console.log(`Record ${recordId}: Decryption key obtained (not logged).`);
        setFileErrorStates(prev => ({ ...prev, [recordId]: "Decrypting..." })); // Progress update


        // 3. Decrypt the data (CRITICAL - NEEDS SECURE IMPLEMENTATION)
        // Assumes decryptData handles IV extraction if prepended during encryption
        const decryptedDataBuffer = await decryptData(encryptedBuffer, decryptionKey);
        console.log(`Record ${recordId}: Decryption successful, size: ${decryptedDataBuffer.byteLength}`);


        // 4. Create a Blob URL for viewing
        // Determine MIME type - default to pdf, but could be dynamic if stored/inferred
        const mimeType = 'application/pdf'; // TODO: Make dynamic if possible
        const fileBlob = new Blob([decryptedDataBuffer], { type: mimeType });
        const url = URL.createObjectURL(fileBlob);
        console.log(`Record ${recordId}: Created Blob URL: ${url}`);


        // 5. Set state to display the PDF viewer modal
        setPdfUrl(url);

    } catch (err: any) {
        console.error(`Error viewing record ${recordId}:`, err);
        setFileErrorStates(prev => ({ ...prev, [recordId]: `Failed to view file: ${err.message || 'Unknown error'}` }));
        setPdfUrl(null); // Ensure modal doesn't show on error
    } finally {
        // Clear loading state for this specific file, regardless of success/failure
        setFileLoadingStates(prev => ({ ...prev, [recordId]: false }));
        // Don't reset viewingRecordId here, it's needed for the modal title
    }
  }, [hasValidAccess, user?.address, patientAddress]); // Dependencies for the handler

  /**
   * Closes the PDF viewer modal and revokes the Blob URL.
   */
  const closePdfViewer = useCallback(() => {
    // pdfUrl cleanup is handled by the useEffect cleanup function
    setPdfUrl(null);
    setViewingRecordId(null);
    // Clear any lingering error message for the viewed file
    if(viewingRecordId !== null) {
        setFileErrorStates(prev => ({ ...prev, [viewingRecordId]: null }));
    }
  }, [pdfUrl, viewingRecordId]); // Include pdfUrl in dependencies for revoke cleanup

  /**
   * Copies text (like IPFS hash) to the clipboard.
   * @param text The text to copy.
   * @param recordId The associated record ID for logging.
   */
   const copyToClipboard = useCallback((text: string, recordId: number) => {
     if (!text) return;
     navigator.clipboard.writeText(text).then(() => {
       console.log(`Copied to clipboard for record ${recordId}: ${text.substring(0, 10)}...`);
       alert('IPFS Hash copied!'); // Simple feedback
     }, (err) => {
       console.error(`Failed to copy hash for record ${recordId}:`, err);
       alert('Failed to copy hash to clipboard.');
     });
   }, []);


   // --- Render Logic ---

   // Display loading spinner for initial page load
   if (loading) {
     return (
       <div className="flex justify-center items-center min-h-[400px]">
         <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
         <p className="ml-4 text-lg text-gray-600">Loading Patient Data...</p>
       </div>
     );
   }

  // Main Page Content
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative">
      {/* Page Header */}
      <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Health Records</h1>
          <p className="text-sm text-gray-600 mt-1">
            Viewing records for Patient: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{patientAddress}</code>
          </p>
          <p className="text-sm text-gray-600">
            Requested Data Type: <span className="font-semibold text-blue-700">{requestedDataType || 'N/A'}</span>
          </p>
      </div>

      {/* General Error Display */}
      {error && (
        <div role="alert" className="p-4 bg-red-50 text-red-800 rounded-md border border-red-200 flex items-start">
          <AlertTriangle size={20} className="mr-3 flex-shrink-0 text-red-500" />
          <div>
             <h3 className="font-semibold">Error Loading Data</h3>
             <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Consent Status Info Box */}
      {!error && ( // Only show if no general error
          <div role="status" className={`p-4 rounded-md flex items-start border ${
              hasValidAccess
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-orange-50 text-orange-800 border-orange-200'
          }`}>
              {hasValidAccess ? (
                 <CheckCircle size={20} className="mr-3 flex-shrink-0 text-green-600" />
              ) : (
                 <AlertTriangle size={20} className="mr-3 flex-shrink-0 text-orange-500" />
              )}
              <div>
                  <h3 className="font-semibold">Consent Status</h3>
                  <p className="text-sm">
                      {hasValidAccess
                          ? `You currently have valid, active consent to access records of type "${requestedDataType}" for this patient.`
                          : `You do NOT have valid or active consent for the requested data type ("${requestedDataType}") for this patient.`}
                  </p>
              </div>
          </div>
      )}


      {/* Records List Section */}
      {!error && ( // Only show list section if no general error
          <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-800">Available Records for Patient</h2>
                  <p className="text-sm text-gray-600 mt-1">
                      {hasValidAccess
                        ? `File access is enabled for records matching the consent criteria.`
                        : "File access is restricted due to missing or invalid consent."
                      }
                  </p>
              </div>

              {records.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                      No health records have been uploaded by this patient yet.
                  </div>
              ) : (
                  <ul role="list" className="divide-y divide-gray-200">
                      {records.map((record) => {
                          // Determine access based on the overall consent check for the requestedDataType
                          const canAccessDetails = hasValidAccess;
                          const recordId = record.id; // Use variable for clarity
                          const isLoadingFile = fileLoadingStates[recordId];
                          const fileError = fileErrorStates[recordId];

                          return (
                              <li key={recordId} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                      {/* Record Info (Left/Top on Mobile) */}
                                      <div className="min-w-0 flex-1">
                                          <p className="text-sm font-semibold text-blue-700 truncate flex items-center mb-1">
                                              <FileText size={16} className="mr-1.5 flex-shrink-0" />
                                              {record.title || "Untitled Record"} (ID: {recordId})
                                          </p>
                                          <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                                              {record.description || "No description provided."}
                                          </p>
                                          <p className="flex items-center text-xs text-gray-500">
                                              <Calendar size={14} className="mr-1.5" />
                                              Created: {formatTimestamp(record.dateCreated)}
                                          </p>
                                      </div>

                                      {/* Access Details & Actions (Right/Bottom on Mobile) */}
                                      <div className="flex-shrink-0 flex flex-col items-start sm:items-end space-y-1.5 w-full sm:w-auto">
                                          {canAccessDetails ? (
                                              <>
                                                  <span className="text-xs text-green-700 font-medium flex items-center px-1.5 py-0.5 bg-green-50 rounded-full border border-green-200">
                                                      <Unlock size={12} className="mr-1"/> Access Granted
                                                  </span>
                                                  {/* IPFS Hash Display & Copy */}
                                                  <div className="w-full text-left sm:text-right">
                                                       <span className="text-xs text-gray-500 block">IPFS Hash:</span>
                                                       <div className="flex items-center justify-start sm:justify-end mt-0.5">
                                                            <code className="text-xs font-mono break-all bg-gray-100 px-2 py-1 rounded border max-w-[200px] truncate">
                                                               {record.dataHash}
                                                            </code>
                                                            <button
                                                                onClick={() => copyToClipboard(record.dataHash, recordId)}
                                                                className="ml-1.5 text-gray-400 hover:text-gray-600 p-1"
                                                                title="Copy IPFS Hash"
                                                            >
                                                                <CopyIcon size={14}/>
                                                            </button>
                                                       </div>
                                                  </div>
                                                  {/* View File Button */}
                                                  <button
                                                        onClick={() => handleViewFile(record)}
                                                        disabled={isLoadingFile}
                                                        className="inline-flex items-center justify-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto"
                                                  >
                                                       {isLoadingFile ? (
                                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                       ) : (
                                                           <Eye size={14} className="mr-1.5" />
                                                       )}
                                                       {isLoadingFile ? 'Loading...' : 'View File'}
                                                  </button>
                                                  {/* File specific error */}
                                                  {fileError && (
                                                      <p className="text-xs text-red-600 mt-1 text-left sm:text-right max-w-[250px]">{fileError}</p>
                                                  )}
                                              </>
                                          ) : ( // If access is restricted
                                              <span className="text-xs text-orange-700 font-medium flex items-center px-1.5 py-0.5 bg-orange-50 rounded-full border border-orange-200">
                                                  <Lock size={12} className="mr-1"/> Details Restricted
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              </li>
                          );
                      })}
                  </ul>
               )}
            </div>
        )}

        {/* PDF Viewer Modal */}
        {pdfUrl && viewingRecordId !== null && (
             <div
                className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in" // Added animation class
                onClick={closePdfViewer} // Close on overlay click
                aria-modal="true"
                role="dialog"
             >
                 <div
                    className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden transform transition-all scale-95 opacity-0 animate-scale-in" // Added animation classes
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                 >
                     {/* Modal Header */}
                     <div className="flex justify-between items-center p-3 border-b bg-gray-50 flex-shrink-0">
                          <h3 className="text-lg font-medium text-gray-800">
                              Viewing Record ID: <span className="font-semibold">{viewingRecordId}</span>
                          </h3>
                          <button
                              onClick={closePdfViewer}
                              className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              aria-label="Close PDF Viewer"
                           >
                              <X size={20} />
                          </button>
                     </div>
                     {/* PDF Embed */}
                     <div className="flex-grow overflow-auto p-1 bg-gray-200">
                         <iframe
                              src={pdfUrl}
                              title={`PDF Viewer - Record ${viewingRecordId}`}
                              className="w-full h-full border-0 bg-white" // Added bg-white for iframe itself
                         />
                         {/* Consider adding loading state for iframe */}
                         {/* Consider using react-pdf for better control and rendering */}
                     </div>
                 </div>
             </div>
         )}

    </div> // End main container
  );
};

export default PatientRecordsViewerPage;

// Add animation keyframes to your global CSS (e.g., index.css)
/*
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out forwards;
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out forwards;
}
*/