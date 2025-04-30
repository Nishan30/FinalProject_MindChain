// pages/PatientRecordsViewerPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import { useWallet } from '../context/WalletContext'; // Adjust path
// Import necessary service functions and types
// Use getConsentsForProviderByPatient to fetch only relevant consents
import { getPatientRecords, getConsentsForProviderByPatient, checkProviderAccessForRecordClientSide } from '../services/contractService'; // Adjust path
// Import IPFS fetch
import { fetchFromIPFS } from '../services/ipfsService'; // Adjust path
// Import the CORRECT crypto functions
import { getDecryptionKeyForRecord_Provider, decryptData } from '../services/cryptoService'; // Adjust path
import { HealthRecord, ConsentRecord } from '../types'; // Import updated types
// Import Icons
import {
    FileText,
    Calendar,
    AlertTriangle,
    // CheckCircle, // Replaced by Info
    Lock,
    Unlock,
    Eye,
    X,
    Copy as CopyIcon,
    Info,
    RefreshCw // Added for potential refresh button
} from 'lucide-react';

// --- Helper Functions ---

const formatTimestamp = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return 'N/A';
  try {
    // Format to include time as well
    return new Date(timestamp * 1000).toLocaleString(undefined, {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hour12: true
    });
  } catch (e) {
      console.error("Error formatting timestamp:", e);
      return 'Invalid Date';
  }
};

// --- Component Definition ---

const PatientRecordsViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Get location object to check for state
  const { user } = useWallet(); // Logged-in provider info
  const { patientAddress } = useParams<{ patientAddress: string }>(); // Patient being viewed

  // State for fetched data
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [relevantConsents, setRelevantConsents] = useState<ConsentRecord[]>([]); // Consents granted TO this provider
  const [recordAccessMap, setRecordAccessMap] = useState<{ [recordId: number]: boolean }>({}); // Map: recordId -> hasAccess (boolean)

  // State for UI control
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for viewing/downloading specific files
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [viewingRecordId, setViewingRecordId] = useState<number | null>(null);
  const [fileLoadingStates, setFileLoadingStates] = useState<{ [key: number]: boolean }>({}); // { recordId: isLoading }
  const [fileErrorStates, setFileErrorStates] = useState<{ [key: number]: string | null }>({}); // { recordId: errorMessage }

  // State to trigger auto-viewing a record based on navigation state
  const [autoViewRecordId, setAutoViewRecordId] = useState<number | null>(null);

  // --- Data Fetching Logic ---
  const fetchData = useCallback(async (showLoadingIndicator = true) => {
    // Only fetch if prerequisites are met
    if (!(user?.role === 'provider' && user?.address && patientAddress)) {
        console.log("Prerequisites not met for fetching data.");
        setLoading(false); // Ensure loading stops if we can't fetch
        return;
    }

    if (showLoadingIndicator) {
        setLoading(true);
    }
    setError(null); // Clear previous errors on fetch/refresh

    console.log(`Fetching records for patient: ${patientAddress} and consents granted to provider: ${user.address}`);
    try {
      // Fetch records and ONLY consents relevant to this provider in parallel
      const [fetchedRecords, fetchedConsents] = await Promise.all([
         getPatientRecords(patientAddress),
         getConsentsForProviderByPatient(patientAddress, user.address!)
      ]);

      setRecords(fetchedRecords);
      setRelevantConsents(fetchedConsents);
      console.log("Fetched Records:", fetchedRecords);
      console.log("Fetched Relevant Consents:", fetchedConsents);

      // Determine access for each record using client-side helper
      const accessMap: { [recordId: number]: boolean } = {};
      fetchedRecords.forEach(record => {
          accessMap[record.id] = checkProviderAccessForRecordClientSide(
              record.id,
              user.address!, // We know user.address exists here
              fetchedConsents // Pass the pre-filtered consents
          );
      });
      setRecordAccessMap(accessMap);
      console.log("Record Access Map Updated:", accessMap);

    } catch (err: any) {
      console.error("Error fetching patient data:", err);
      setError(err.message || "Failed to load patient data. Please check the address and try again.");
      // Clear data on error to avoid displaying stale info
      setRecords([]);
      setRelevantConsents([]);
      setRecordAccessMap({});
    } finally {
      if (showLoadingIndicator) {
          setLoading(false); // Stop loading indicator
      }
    }
  // Dependencies: Re-run if user, provider address, or patient address changes
  }, [user?.role, user?.address, patientAddress]); // Use specific user properties

  // --- Effects ---

  // Effect for initial redirection logic (Provider Role Check)
  useEffect(() => {
    if (!user) {
      console.log("PatientRecordsViewer: No user found, redirecting to home.");
      navigate('/');
      return;
    }
    if (user.role !== 'provider') {
      console.log("PatientRecordsViewer: User is not a provider, redirecting to dashboard.");
      navigate('/dashboard');
      return;
    }
    if (!patientAddress) {
       console.error("PatientRecordsViewer: Missing patientAddress in URL.");
       setError("Required patient address is missing from the URL.");
       setLoading(false); // Stop loading as we can't proceed
       return;
    }
  }, [user, navigate, patientAddress]);

  // Effect to fetch initial data
  useEffect(() => {
    fetchData(); // Call the memoized fetch function
  }, [fetchData]); // Dependency is the stable fetchData function

  // Effect to handle auto-view logic based on navigation state
  useEffect(() => {
    // Check only after loading is complete and data is potentially available
    if (!loading && location.state?.highlightRecordId) {
        const recordIdToView = location.state.highlightRecordId as number;
        console.log(`Received highlightRecordId from navigation state: ${recordIdToView}`);

        // Check if we have access and the record exists in our list
        if (recordAccessMap[recordIdToView]) {
             console.log(`Setting record ID ${recordIdToView} for auto-view.`);
             setAutoViewRecordId(recordIdToView); // Set state to trigger the next effect
        } else {
             console.warn(`Record ID ${recordIdToView} passed in state, but not found in list or no access.`);
             // Optionally show an info message
             // setAutoViewError(`Could not automatically view Record ID ${recordIdToView}. Access may have been revoked or the record removed.`);
        }
         // Clear the state from location history regardless, to prevent re-triggering
         navigate(location.pathname, { replace: true, state: {} });
    }
    // Only run when loading finishes or location state potentially changes
  }, [loading, location.state, records, recordAccessMap, navigate, location.pathname]);


  // Effect to clean up Blob URL for PDF viewer
  useEffect(() => {
    const currentPdfUrl = pdfUrl;
    return () => {
      if (currentPdfUrl) {
        console.log("Revoking Blob URL:", currentPdfUrl);
        URL.revokeObjectURL(currentPdfUrl);
      }
    };
  }, [pdfUrl]);

  // --- Event Handlers ---

  /**
   * Handles fetching, decrypting, and displaying a record's file (e.g., PDF).
   */
  const handleViewFile = useCallback(async (record: HealthRecord) => {
    const recordId = record.id;

    // Access Check: Ensure access based on the map and user context
    if (!recordAccessMap[recordId] || !user?.address) {
      alert(`Access Denied: You do not have valid consent to view record ID ${recordId}.`);
      console.warn(`Attempted to view record ${recordId} without valid access.`);
      // Clear any previous error for this file if access is now denied
      setFileErrorStates(prev => ({ ...prev, [recordId]: "Access Denied." }));
      return;
    }

    console.log(`Initiating view for record ID: ${recordId}, Hash: ${record.dataHash}`);

    // Set UI states for this specific file operation
    setViewingRecordId(recordId);
    setFileLoadingStates(prev => ({ ...prev, [recordId]: true }));
    setFileErrorStates(prev => ({ ...prev, [recordId]: null }));
    setPdfUrl(null); // Close any existing PDF viewer

    try {
        // 1. Fetch encrypted data from IPFS
        setFileErrorStates(prev => ({ ...prev, [recordId]: "Fetching record data..." }));
        const encryptedBuffer = await fetchFromIPFS(record.dataHash);
        if (!encryptedBuffer || encryptedBuffer.byteLength === 0) {
            throw new Error("Fetched empty or invalid record data from IPFS.");
        }
        console.log(`Record ${recordId}: Fetched encrypted data, size: ${encryptedBuffer.byteLength}`);

        // 2. Get the AES Decryption Key (Provider Logic)
        setFileErrorStates(prev => ({ ...prev, [recordId]: "Requesting decryption key..." }));
        const decryptionKey = await getDecryptionKeyForRecord_Provider(
            user.address, // Provider's address
            recordId      // Specific Record ID
        );
        if (!decryptionKey) {
            // Error likely alerted within getDecryptionKeyForRecord_Provider
            throw new Error("Failed to obtain decryption key. Patient may not have shared the key, or an error occurred.");
        }
        console.log("decryptionKey", decryptionKey);
        console.log(`Record ${recordId}: Provider decryption key obtained successfully.`);

        // 3. Decrypt Data
        setFileErrorStates(prev => ({ ...prev, [recordId]: "Decrypting record data..." }));
        const decryptedDataBuffer = await decryptData(encryptedBuffer, decryptionKey);

        if (!decryptedDataBuffer) {
          // Handle the case where encryption failed (error logged in cryptoService)
          throw new Error("File encryption failed. Check console for details.");
      }

        // 4. Create Blob URL for Viewing
        const mimeType = 'application/pdf'; // TODO: Make dynamic
        const fileBlob = new Blob([decryptedDataBuffer], { type: mimeType });
        const url = URL.createObjectURL(fileBlob);
        console.log(`Record ${recordId}: Created Blob URL: ${url}`);

        // 5. Display PDF Modal
        setPdfUrl(url);
        setFileErrorStates(prev => ({ ...prev, [recordId]: null })); // Clear status on success

    } catch (err: any) {
        console.error(`Error viewing record ${recordId}:`, err);
        setFileErrorStates(prev => ({ ...prev, [recordId]: `Failed: ${err.message || 'Unknown error'}` }));
        setPdfUrl(null); // Ensure modal doesn't show on error
    } finally {
        setFileLoadingStates(prev => ({ ...prev, [recordId]: false })); // Clear loading state for this file
    }
  }, [user?.address, recordAccessMap, decryptData, fetchFromIPFS, getDecryptionKeyForRecord_Provider]); 
  // Effect to trigger handleViewFile when autoViewRecordId is set
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (autoViewRecordId !== null) {
        const record = records.find(r => r.id === autoViewRecordId);
        if (record) {
            console.log(`Auto-viewing record ID: ${autoViewRecordId}`);
            // Use a small timeout to allow UI updates before potentially blocking actions (like alerts in handleViewFile)
            timer = setTimeout(() => {
                handleViewFile(record); // Call the existing view function
                setAutoViewRecordId(null); // Reset the trigger state
            }, 150); // Adjust delay if needed
        } else {
            // Record not found in the current list, reset state
            setAutoViewRecordId(null);
        }
    }
    // Cleanup timer on unmount or if autoViewRecordId changes before timeout
    return () => { if (timer) clearTimeout(timer); };
}, [autoViewRecordId, records, handleViewFile]); // Depend on trigger state, records list, and handler// Dependencies for the handler

  /** Closes the PDF viewer modal */
  const closePdfViewer = useCallback(() => {
    setPdfUrl(null); // Blob URL cleanup is handled by useEffect
    if(viewingRecordId !== null) {
        // Clear error/status only for the record that was being viewed when closing
        setFileErrorStates(prev => ({ ...prev, [viewingRecordId]: null }));
    }
    setViewingRecordId(null);
  }, [viewingRecordId]); // Dependency updated

  /** Copies text to the clipboard */
   const copyToClipboard = useCallback((text: string, recordId: number) => {
     if (!text) return;
     navigator.clipboard.writeText(text).then(() => {
       alert('IPFS Hash copied!');
     }, (err) => {
       console.error(`Failed to copy hash for record ${recordId}:`, err);
       alert('Failed to copy hash to clipboard.');
     });
   }, []);


   // --- Render Logic ---

   if (loading && records.length === 0) { // Show main loading only on initial load
     return (
       <div className="flex justify-center items-center min-h-[400px]">
         <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
         <p className="ml-4 text-lg text-gray-600">Loading Patient Data & Consents...</p>
       </div>
     );
   }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative">
      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
              <h1 className="text-3xl font-bold text-gray-900">Patient Health Records</h1>
              <p className="text-sm text-gray-600 mt-1">
                Viewing records for Patient: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{patientAddress}</code>
              </p>
          </div>
           <button
             onClick={() => fetchData(true)} // Pass true to show loading spinner on refresh
             disabled={loading}
             className="flex items-center text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
             title="Refresh records and consent status"
           >
             <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
             Refresh
           </button>
      </div>


      {/* General Error Display */}
      {error && (
        <div role="alert" className="p-4 bg-red-50 text-red-800 rounded-md border border-red-200 flex items-start">
          <AlertTriangle size={20} className="mr-3 flex-shrink-0 text-red-500" />
          <div>
             <h3 className="font-semibold">Error Loading Data</h3>
             <p className="text-sm">{error}</p>
          </div>
            {/* Optional: Add dismiss button */}
            {/* <button onClick={() => setError(null)} className="ml-auto p-1 text-red-600 hover:text-red-800 -mt-1 -mr-1"><X size={18}/></button> */}
        </div>
      )}

      {/* Access Information Box */}
      {!error && (
          <div role="status" className="p-4 rounded-md flex items-start border bg-blue-50 text-blue-800 border-blue-200">
              <Info size={20} className="mr-3 flex-shrink-0 text-blue-600 mt-0.5" />
              <div>
                  <h3 className="font-semibold">Access Information</h3>
                  <p className="text-sm">
                      Access to view individual record files below depends on specific, active consents granted by the patient directly to your provider address ({user?.address ? `${user.address.substring(0, 6)}...${user.address.substring(user.address.length - 4)}` : 'N/A'}).
                  </p>
                   <p className="text-xs mt-1 text-blue-700">
                       If a record shows "Access Restricted", it means no valid consent for that specific record was found for you, or the patient has not shared the necessary decryption key.
                   </p>
              </div>
          </div>
      )}


      {/* Records List Section */}
      {!error && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-800">Available Records for Patient</h2>
                  <p className="text-sm text-gray-600 mt-1">
                      Check the status next to each record to determine your access permissions.
                  </p>
              </div>

              {/* Handle case where loading finished but records array is still empty */}
               {!loading && records.length === 0 && !error ? (
                  <div className="p-8 text-center text-gray-500">
                      No health records have been uploaded by this patient yet.
                  </div>
              ) : (
                  <ul role="list" className="divide-y divide-gray-200">
                      {/* Display records */}
                      {records.map((record) => {
                          const recordId = record.id;
                          const canAccessFile = recordAccessMap[recordId] ?? false;
                          const isLoadingFile = fileLoadingStates[recordId];
                          const fileError = fileErrorStates[recordId]; // Can be error or status message

                          return (
                              <li key={recordId} className={`px-4 py-4 sm:px-6 transition-colors ${canAccessFile ? 'hover:bg-gray-50' : 'bg-gray-100 opacity-90'}`}>
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                      {/* Record Info (always visible) */}
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

                                      {/* Access Details & Actions (Conditional) */}
                                      <div className="flex-shrink-0 flex flex-col items-start sm:items-end space-y-2 w-full sm:w-auto">
                                          {/* Status Badge */}
                                          {canAccessFile ? (
                                               <span className="text-xs text-green-700 font-medium flex items-center px-2 py-0.5 bg-green-100 rounded-full border border-green-200">
                                                  <Unlock size={12} className="mr-1"/> Access Granted
                                              </span>
                                          ) : (
                                               <span className="text-xs text-orange-700 font-medium flex items-center px-2 py-0.5 bg-orange-100 rounded-full border border-orange-200">
                                                  <Lock size={12} className="mr-1"/> Access Restricted
                                              </span>
                                          )}

                                          {/* Actions shown only if access granted */}
                                          {canAccessFile && (
                                              <>
                                                  {/* IPFS Hash & Copy */}
                                                  <div className="w-full text-left sm:text-right text-xs">
                                                       <span className="text-gray-500 block mb-0.5">Record Data Hash:</span>
                                                       <div className="flex items-center justify-start sm:justify-end">
                                                            <code className="font-mono break-all bg-gray-100 px-2 py-1 rounded border border-gray-200 max-w-[180px] truncate" title={record.dataHash}>
                                                               {record.dataHash}
                                                            </code>
                                                            <button
                                                                onClick={() => copyToClipboard(record.dataHash, recordId)}
                                                                className="ml-1.5 text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
                                                                title="Copy IPFS Hash"
                                                            > <CopyIcon size={14}/> </button>
                                                       </div>
                                                  </div>
                                                  {/* View File Button & Status/Error */}
                                                   <div className="w-full sm:w-auto flex flex-col items-stretch sm:items-end">
                                                      <button
                                                            onClick={() => handleViewFile(record)}
                                                            disabled={isLoadingFile}
                                                            className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto"
                                                      >
                                                           {isLoadingFile ? (
                                                                <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                           ) : ( <Eye size={14} className="mr-1.5" /> )}
                                                           {isLoadingFile ? 'Loading...' : 'View File'}
                                                      </button>
                                                      {/* File specific status/error */}
                                                      {fileError && (
                                                          <p className={`text-xs mt-1 text-left sm:text-right max-w-[250px] ${fileError.startsWith('Failed:') ? 'text-red-600' : 'text-gray-600'}`}>
                                                            {fileError}
                                                          </p>
                                                      )}
                                                   </div>
                                              </>
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
                // Basic styling for position, background, layout, z-index
                className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4" // Increased z-index just in case
                onClick={closePdfViewer} // Close on overlay click
                aria-modal="true"
                role="dialog"
                aria-labelledby="pdf-modal-title" // Accessibility
             >
                 {/* Modal Content Box - Basic styling, no animations/transforms */}
                 <div
                    className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden" // Removed animation/transform/opacity classes
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                 >
                     {/* Modal Header */}
                     <div className="flex justify-between items-center p-3 border-b bg-gray-50 flex-shrink-0">
                          <h3 id="pdf-modal-title" className="text-lg font-medium text-gray-800">
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
                              src={pdfUrl} // Source is the Blob URL
                              title={`PDF Viewer - Record ${viewingRecordId}`}
                              className="w-full h-full border-0 bg-white shadow-inner" // Ensure width/height and basic styling
                              // sandbox="" // Generally NOT needed for blob URLs, can restrict functionality
                         />
                         {/* You could add a loading indicator specifically for the iframe if needed */}
                     </div>
                 </div>
             </div>
         )}

    </div> // End main container
  );
};

export default PatientRecordsViewerPage;
