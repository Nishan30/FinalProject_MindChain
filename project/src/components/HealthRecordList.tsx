// components/HealthRecordList.tsx
import React from 'react';
import { HealthRecord } from '../types'; // Ensure this path is correct
import { FileText, Calendar, Eye, AlertCircle } from 'lucide-react'; // Added Eye, AlertCircle

interface HealthRecordListProps {
  records: HealthRecord[];
  // Callback function to trigger viewing/decrypting the record
  onViewRecord: (record: HealthRecord) => void; // Pass the full record object
  // Optional state for file loading/errors passed from parent
  fileLoadingStates?: { [key: number]: boolean };
  fileErrorStates?: { [key: number]: string | null };
}

// Helper function to format the Unix timestamp (seconds)
const formatTimestamp = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return 'N/A';
  try {
    // Include time for better context
    return new Date(timestamp * 1000).toLocaleString(undefined, {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: true
    });
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return 'Invalid Date';
  }
};

const HealthRecordList: React.FC<HealthRecordListProps> = ({
  records,
  onViewRecord, // Destructure the callback
  fileLoadingStates = {}, // Provide default empty objects
  fileErrorStates = {}
}) => {

  // Handle case where records might be loading or errored in parent
  if (!records) {
     return <p className="text-center text-gray-500 py-4">Loading records...</p>; // Or null/spinner
  }

  if (records.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
        <p className="text-gray-600">No health records found.</p>
        <p className="text-sm text-gray-500 mt-2">Use the "Upload New Record" button to add records.</p>
      </div>
    );
  }

  // Use a list for semantic correctness
  return (
    <ul role="list" className="divide-y divide-gray-200 border-t border-gray-200">
      {records.map((record) => {
        const recordId = record.id;
        // Get loading/error state for this specific record from props
        const isLoadingFile = fileLoadingStates[recordId] ?? false;
        const fileError = fileErrorStates[recordId] ?? null;

        return (
          <li key={recordId} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              {/* Record Information */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-700 truncate flex items-center mb-1">
                  <FileText size={16} className="mr-1.5 flex-shrink-0" />
                  {record.title || 'Untitled Record'} (ID: {recordId})
                </p>
                <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                  {record.description || 'No description provided.'}
                </p>
                <p className="flex items-center text-xs text-gray-500">
                  <Calendar size={14} className="mr-1.5" />
                  Created: {formatTimestamp(record.dateCreated)}
                </p>
              </div>

              {/* Actions and Status */}
              <div className="flex-shrink-0 flex flex-col items-stretch sm:items-end gap-1.5 w-full sm:w-auto">
                 {/* View File Button */}
                <button
                  onClick={() => onViewRecord(record)} // Call the passed handler with the record object
                  disabled={isLoadingFile}
                  className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto"
                  title={`View file for Record ID ${recordId}`}
                >
                  {isLoadingFile ? (
                     // Loading Spinner SVG
                     <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                     <Eye size={14} className="mr-1.5" />
                  )}
                  {isLoadingFile ? 'Loading...' : 'View File'}
                </button>

                {/* Display File-Specific Error/Status */}
                {fileError && (
                   <p className={`text-xs mt-1 text-left sm:text-right max-w-[250px] flex items-center ${fileError.startsWith('Failed:') ? 'text-red-600' : 'text-gray-600'}`}>
                       {fileError.startsWith('Failed:') && <AlertCircle size={12} className="mr-1 flex-shrink-0" />}
                       {fileError}
                   </p>
                )}
              </div>

            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default HealthRecordList;