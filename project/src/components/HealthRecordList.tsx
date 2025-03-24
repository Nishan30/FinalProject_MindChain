import React from 'react';
import { HealthRecord } from '../types';
import { FileText, Calendar, Users } from 'lucide-react';

interface HealthRecordListProps {
  records: HealthRecord[];
}

const HealthRecordList: React.FC<HealthRecordListProps> = ({ records }) => {
  if (records.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-600">No health records found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {records.map((record) => (
        <div key={record.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <FileText size={18} className="mr-2 text-blue-600" />
              {record.title}
            </h3>
          </div>
          
          <div className="p-4">
            <p className="text-gray-600 mb-4">{record.description}</p>
            
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <Calendar size={16} className="mr-2" />
              <span>Created: {record.dateCreated}</span>
            </div>
            
            {record.lastAccessed && (
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <Calendar size={16} className="mr-2" />
                <span>Last accessed: {record.lastAccessed}</span>
              </div>
            )}
            
            <div className="flex items-center text-sm text-gray-500">
              <Users size={16} className="mr-2" />
              <span>
                {record.accessibleTo.length === 0
                  ? 'Not shared with any providers'
                  : `Shared with ${record.accessibleTo.length} provider(s)`}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 flex justify-end">
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HealthRecordList;