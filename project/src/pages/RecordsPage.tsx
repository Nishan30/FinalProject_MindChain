import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import HealthRecordList from '../components/HealthRecordList';
import { getPatientRecords, uploadRecord } from '../services/contractService';
import { HealthRecord } from '../types';

const RecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWallet();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Redirect to home if not connected or not a patient
  useEffect(() => {
    if (!user) {
      navigate('/');
    } else if (user.role !== 'patient') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch records
  const fetchRecords = async () => {
    if (!user?.address) return;
    
    try {
      setLoading(true);
      const data = await getPatientRecords(user.address);
      setRecords(data);
      setError('');
    } catch (err) {
      console.error('Error fetching records:', err);
      setError('Failed to load health records. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.address) {
      fetchRecords();
    }
  }, [user?.address]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    
    if (!title || !description || !file) {
      setUploadError('All fields are required');
      return;
    }
    
    try {
      setUploading(true);
      
      // In a real implementation, you would:
      // 1. Encrypt the file
      // 2. Upload to IPFS
      // 3. Get the IPFS hash
      // 4. Store the hash on the blockchain
      
      // For this demo, we'll simulate this process
      const mockIpfsHash = `QmHash${Math.random().toString(36).substring(2, 10)}`;
      
      const success = await uploadRecord(title, description, mockIpfsHash);
      
      if (success) {
        setTitle('');
        setDescription('');
        setFile(null);
        setShowUploadForm(false);
        fetchRecords();
      } else {
        setUploadError('Failed to upload record. Please try again.');
      }
    } catch (err) {
      console.error('Error uploading record:', err);
      setUploadError('An error occurred while processing your request');
    } finally {
      setUploading(false);
    }
  };

  if (!user || user.role !== 'patient') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <FileText className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">My Health Records</h1>
        </div>
        
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          {showUploadForm ? (
            'Cancel'
          ) : (
            <>
              <Upload size={18} className="mr-1" />
              Upload Record
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {showUploadForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload New Health Record</h2>
          
          {uploadError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {uploadError}
            </div>
          )}
          
          <form onSubmit={handleUpload}>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Therapy Session Notes"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the record"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                File
              </label>
              <input
                type="file"
                id="file"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Files will be encrypted before being stored on IPFS
              </p>
            </div>
            
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-70"
            >
              {uploading ? 'Uploading...' : 'Upload Record'}
            </button>
          </form>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Your Health Records</h2>
          <p className="text-sm text-gray-600">
            Securely stored and encrypted on IPFS, with access controlled by blockchain
          </p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-4">
              <p className="text-gray-600">Loading records...</p>
            </div>
          ) : (
            <HealthRecordList records={records} />
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordsPage;