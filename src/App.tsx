import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import VehicleManagement from './components/VehicleManagement';
import TripTracking from './components/TripTracking';
import ExpenseManagement from './components/ExpenseManagement';
import ServiceReminders from './components/ServiceReminders';
import DriverManagement from './components/DriverManagement';
import FleetManagement from './components/FleetManagement';
import { MobileLocationTracker } from './components/MobileLocationTracker';
import DriverLocationService from './components/DriverLocationService';
import LiveTracking from './components/LiveTracking';



function AppContent(): JSX.Element {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = (): JSX.Element => {
    // Check for mobile tracker mode
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('mode') === 'tracker') {
      return <MobileLocationTracker />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'vehicles':
        return <VehicleManagement />;
      case 'drivers':
        return <DriverManagement />;
      case 'fleet':
        return <FleetManagement />;
      case 'trips':
        return <TripTracking />;
      case 'expenses':
        return <ExpenseManagement />;
      case 'reminders':
        return <ServiceReminders />;
      case 'tracking':
        return <LiveTracking />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
      {/* Automatic location tracking for drivers */}
      {user.role === 'driver' && <DriverLocationService />}
    </Layout>
  );
}

function App(): JSX.Element {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
