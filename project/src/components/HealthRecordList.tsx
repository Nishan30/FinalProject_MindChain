// components/HealthRecordList.tsx
import React from 'react';
import { HealthRecord } from '../types'; // Ensure this path is correct
import { FileText, Calendar, Eye } from 'lucide-react'; // Changed Users to Eye for View Details

interface HealthRecordListProps {
  records: HealthRecord[];
  // Optional: Add a function prop to handle viewing details
  // onViewDetails?: (recordId: number) => void;
}

// Helper function to format the Unix timestamp number into a readable date
const formatTimestamp = (timestamp: number): string => {
  if (!timestamp) return 'N/A';
  // Multiply by 1000 because Date expects milliseconds
  return new Date(timestamp * 1000).toLocaleDateString();
};

const HealthRecordList: React.FC<HealthRecordListProps> = ({ records }) => {
  console.log('Rendering HealthRecordList with records:', records);

  if (!records || records.length === 0) { // Added check for undefined records
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-600">No health records found.</p>
        <p className="text-sm text-gray-500 mt-2">You can upload records using the button above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {records.map((record) => (
        <div key={record.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col"> {/* Added flex flex-col */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <FileText size={18} className="mr-2 text-blue-600 flex-shrink-0" /> {/* Added flex-shrink-0 */}
              <span className="truncate">{record.title || 'Untitled Record'}</span> {/* Added truncate and fallback */}
            </h3>
          </div>

          {/* Content takes remaining space */}
          <div className="p-4 flex-grow">
            <p className="text-gray-600 mb-4 text-sm line-clamp-3"> {/* Added line-clamp */}
              {record.description || 'No description provided.'} {/* Added fallback */}
            </p>

            <div className="flex items-center text-sm text-gray-500 mb-2">
              <Calendar size={16} className="mr-2 flex-shrink-0" />
              <span>Created: {formatTimestamp(record.dateCreated)}</span>
            </div>

            {/*
              Removed sections for lastAccessed and accessibleTo as they are not in the corrected interface
            */}
            {/* <p className="text-xs text-gray-400 mt-2">Data Hash: <span className="font-mono break-all">{record.dataHash}</span></p> */}

          </div>

          {/* Footer aligned to bottom */}
          <div className="bg-gray-50 px-4 py-3 flex justify-end border-t border-gray-200">
            <button
              // onClick={() => onViewDetails?.(record.id)} // Uncomment and implement if needed
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              // disabled // Enable/disable based on whether details can be viewed
              title="View Details (functionality not implemented)" // Added title
            >
              <Eye size={16} className="mr-1" />
              View Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HealthRecordList;