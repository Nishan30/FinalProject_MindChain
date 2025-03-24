import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Database, FileText } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, connectWallet } = useWallet();

  const handleGetStarted = () => {
    if (isConnected) {
      navigate('/dashboard');
    } else {
      connectWallet();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Secure Mental Health Data</span>
            <span className="block text-blue-600">on the Blockchain</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            A revolutionary approach to mental healthcare data management that puts patients in control while ensuring privacy, security, and compliance.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <button
                onClick={handleGetStarted}
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
              >
                {isConnected ? 'Go to Dashboard' : 'Connect Wallet to Start'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              A better way to manage mental health data
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Our blockchain-based system provides unprecedented security and control over sensitive mental health information.
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <Shield size={24} />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Patient Consent Management</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Patients have complete control over who can access their data, for what purpose, and for how long.
                  </p>
                </div>
              </div>

              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <Lock size={24} />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">End-to-End Encryption</h3>
                  <p className="mt-2 text-base text-gray-500">
                    All sensitive data is encrypted and stored securely on IPFS, with access controlled by smart contracts.
                  </p>
                </div>
              </div>

              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <Database size={24} />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Immutable Audit Trail</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Every data access is recorded on the blockchain, creating a transparent and tamper-proof audit trail.
                  </p>
                </div>
              </div>

              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <FileText size={24} />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">HIPAA Compliant</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Designed with privacy and compliance in mind, meeting the highest standards for healthcare data protection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">How It Works</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Simple, secure, and transparent
            </p>
          </div>
          
          <div className="mt-10">
            <div className="space-y-10">
              <div className="relative">
                <div className="relative flex items-center justify-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-500 text-white text-2xl font-bold">
                    1
                  </div>
                </div>
                <div className="relative mt-6">
                  <h3 className="text-xl leading-6 font-medium text-gray-900 text-center">Connect Your Wallet</h3>
                  <p className="mt-2 text-base text-gray-500 text-center max-w-2xl mx-auto">
                    Connect your Ethereum wallet to establish your secure identity on the platform.
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <div className="relative flex items-center justify-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-500 text-white text-2xl font-bold">
                    2
                  </div>
                </div>
                <div className="relative mt-6">
                  <h3 className="text-xl leading-6 font-medium text-gray-900 text-center">Manage Your Data</h3>
                  <p className="mt-2 text-base text-gray-500 text-center max-w-2xl mx-auto">
                    Upload and manage your mental health records with complete control over who can access them.
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <div className="relative flex items-center justify-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-500 text-white text-2xl font-bold">
                    3
                  </div>
                </div>
                <div className="relative mt-6">
                  <h3 className="text-xl leading-6 font-medium text-gray-900 text-center">Grant and Revoke Consent</h3>
                  <p className="mt-2 text-base text-gray-500 text-center max-w-2xl mx-auto">
                    Easily grant healthcare providers access to specific data for limited periods and revoke access at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;