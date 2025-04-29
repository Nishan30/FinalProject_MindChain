import React from 'react';
import { useNavigate } from 'react-router-dom';
// Import necessary icons from lucide-react
import { Shield, Lock, Database, FileText, User as UserIcon, Briefcase } from 'lucide-react';
// Import the updated useWallet hook from your context file
import { useWallet } from '../context/WalletContext'; // Adjust path if needed

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  // Get the necessary state and functions from the wallet context
  const { isConnected, connectWallet, isConnecting, user } = useWallet();

  // Effect to redirect the user to the dashboard if they are already connected
  React.useEffect(() => {
    // Check if connected AND user object exists (meaning role is determined)
    if (isConnected && user) {
      console.log("User already connected, redirecting to dashboard...");
      navigate('/dashboard');
    }
    // Dependencies: run when connection status or user object changes, or navigate function changes
  }, [isConnected, user, navigate]);

  // Handler function to connect with a specific role hint
  const handleConnectAs = async (role: 'patient' | 'provider') => {
    // Prevent initiating a new connection if already connecting or connected
    if (isConnecting || isConnected) {
      console.log("Connection attempt ignored: Already connecting or connected.");
      return;
    }

    console.log(`Attempting to connect as: ${role}`);
    await connectWallet(role); // Call context function with the desired role hint
    // Navigation to dashboard will happen automatically via the useEffect above
    // if the connection and role determination are successful.
  };

  return (
    // Main container with gradient background
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">

      {/* Hero Section */}
      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center">
          {/* Main Heading */}
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Secure Mental Health Data</span>
            <span className="block text-blue-600">on the Blockchain</span>
          </h1>
          {/* Subtitle */}
          <p className="mt-4 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-6 md:text-xl md:max-w-3xl">
            A revolutionary approach giving patients control and providers secure access. Choose your role to begin.
          </p>

          {/* Connection Buttons Area */}
          <div className="mt-8 max-w-md mx-auto sm:flex sm:justify-center gap-4 md:mt-10">
            {/* Connect as Patient Button */}
            <button
              onClick={() => handleConnectAs('patient')}
              disabled={isConnecting || isConnected} // Disable if connecting OR already connected
              className={`w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white transition-colors duration-150 ease-in-out md:py-4 md:text-lg md:px-10 ${
                (isConnecting || isConnected)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isConnecting ? (
                 <>
                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Connecting...
                 </>
              ) : (
                <>
                  <UserIcon className="h-5 w-5 mr-2 -ml-1" />
                  Connect as Patient
                </>
              )}
            </button>

            {/* Connect as Provider Button */}
            <button
              onClick={() => handleConnectAs('provider')}
              disabled={isConnecting || isConnected} // Disable if connecting OR already connected
              className={`w-full mt-4 sm:mt-0 sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md transition-colors duration-150 ease-in-out md:py-4 md:text-lg md:px-10 ${
                 (isConnecting || isConnected)
                   ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                   : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
              }`}
            >
               {isConnecting ? (
                 <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Connecting...
                 </>
              ) : (
                <>
                  <Briefcase className="h-5 w-5 mr-2 -ml-1" />
                  Connect as Provider
                </>
              )}
            </button>
          </div>
          {/* End Connection Buttons Area */}

        </div>
      </div>

      {/* Features Section (Remains Unchanged) */}
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
              {/* Feature Item 1 */}
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
              {/* Feature Item 2 */}
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <Lock size={24} />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">End-to-End Encryption</h3>
                  <p className="mt-2 text-base text-gray-500">
                    All sensitive data is encrypted before being stored securely on IPFS, with access controlled by smart contracts.
                  </p>
                </div>
              </div>
              {/* Feature Item 3 */}
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <Database size={24} />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Immutable Audit Trail</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Key actions like consent changes are recorded on the blockchain, creating a transparent and tamper-proof log.
                  </p>
                </div>
              </div>
              {/* Feature Item 4 */}
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <FileText size={24} />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Data Integrity & Control</h3>
                   <p className="mt-2 text-base text-gray-500">
                    Leverage blockchain for secure access control and IPFS for decentralized, resilient storage of encrypted data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section (Remains Unchanged) */}
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
              {/* Step 1 */}
              <div className="relative">
                <div className="relative flex items-center justify-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-500 text-white text-2xl font-bold shadow-md">
                    1
                  </div>
                </div>
                <div className="relative mt-6">
                  <h3 className="text-xl leading-6 font-medium text-gray-900 text-center">Choose Role & Connect</h3>
                  <p className="mt-2 text-base text-gray-500 text-center max-w-2xl mx-auto">
                    Select whether you're a patient or provider and connect your Ethereum wallet to establish your identity.
                  </p>
                </div>
              </div>
              {/* Step 2 */}
              <div className="relative">
                 <div className="relative flex items-center justify-center">
                   <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-500 text-white text-2xl font-bold shadow-md">
                     2
                   </div>
                 </div>
                 <div className="relative mt-6">
                   <h3 className="text-xl leading-6 font-medium text-gray-900 text-center">Manage Data & Permissions</h3>
                   <p className="mt-2 text-base text-gray-500 text-center max-w-2xl mx-auto">
                     Patients upload encrypted records and control access via blockchain consents. Providers access data they're permitted to view.
                   </p>
                 </div>
               </div>
               {/* Step 3 */}
               <div className="relative">
                 <div className="relative flex items-center justify-center">
                   <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-500 text-white text-2xl font-bold shadow-md">
                     3
                   </div>
                 </div>
                 <div className="relative mt-6">
                   <h3 className="text-xl leading-6 font-medium text-gray-900 text-center">Secure Access & Audit</h3>
                   <p className="mt-2 text-base text-gray-500 text-center max-w-2xl mx-auto">
                     Smart contracts enforce consent rules for data access, while the blockchain provides a transparent audit trail.
                   </p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

    </div> // End main container
  );
};

export default HomePage;