import React from 'react';
import { useNavigate } from 'react-router-dom';
// Icons: Added Eye for the new card
import { Shield, FileText, User, Clock, Eye } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWallet();

  // Redirect to home if not connected
  React.useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Render loading or nothing if user is not yet available
  if (!user) {
    // Optionally return a loading spinner here
    return null;
  }

  // --- Helper Function for Card Rendering ---
  const Card: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void; bgColorClass: string; textColorClass: string }> =
    ({ title, description, icon, onClick, bgColorClass, textColorClass }) => (
    <div
      onClick={onClick}
      className="bg-white shadow-md rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow transform hover:-translate-y-1"
    >
      <div className="flex items-center mb-4">
        <div className={`${bgColorClass} p-3 rounded-full`}>
          {React.cloneElement(icon as React.ReactElement, { className: `h-6 w-6 ${textColorClass}` })}
        </div>
        <h3 className="ml-4 text-lg font-medium text-gray-800">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
  // --- End Helper Function ---


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1> {/* Increased size/margin */}

      {/* Welcome Banner */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-10 border-l-4 border-blue-500"> {/* Added border */}
        <h2 className="text-xl font-semibold text-gray-800 mb-3">
           Welcome, <span className="capitalize font-bold">{user.role}</span>!
        </h2>
        <p className="text-gray-600 text-sm mb-1">
          Wallet Address: <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{user.address}</span> {/* Display full address */}
        </p>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {/* == Patient Cards == */}
        {user.role === 'patient' && (
          <>
            <Card
              title="Manage Consents"
              description="Control who can access your mental health data and grant new permissions."
              icon={<Shield />}
              onClick={() => navigate('/consents')}
              bgColorClass="bg-blue-100"
              textColorClass="text-blue-600"
            />
            <Card
              title="My Health Records"
              description="View and manage your encrypted health records securely stored on IPFS."
              icon={<FileText />}
              onClick={() => navigate('/records')}
              bgColorClass="bg-green-100"
              textColorClass="text-green-600"
             />
          </>
        )}

        {/* == Provider Cards == */}
        {user.role === 'provider' && (
          <>
            <Card
              title="Consented Patient Data" // Renamed for clarity
              description="Access records for patients who have granted you active consent using their wallet address."
              icon={<User />}
              onClick={() => navigate('/view-patient-consents')} // Keep route or adjust if needed
              bgColorClass="bg-purple-100"
              textColorClass="text-purple-600"
            />
             {/* --- NEW CARD --- */}
            <Card
              title="Verify Patient Consent" // Clearer Name
              description="Enter a Consent ID provided by a patient to view its specific details and status."
              icon={<Eye />} // Using Eye icon
              onClick={() => navigate('/view-consent')} // Route to the existing page
              bgColorClass="bg-yellow-100" // Different color
              textColorClass="text-yellow-700"
            />
             {/* --- END NEW CARD --- */}
          </>
        )}

        {/* == Common Card == */}
        <Card
           title="Profile Settings"
           description="Manage your account settings and preferences."
           icon={<User />} // Re-using User icon is okay here
           onClick={() => navigate('/profile')} // Assuming /profile exists
           bgColorClass="bg-gray-100"
           textColorClass="text-gray-600"
        />
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Clock className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-800">Recent Activity</h3>
        </div>
        {/* You would fetch and display actual activity here */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-gray-600 text-center py-4">
            No recent activity to display.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;