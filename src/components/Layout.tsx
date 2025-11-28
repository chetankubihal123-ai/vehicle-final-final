import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Car,
  TruckIcon,
  MapPin,
  DollarSign,
  Bell,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  Radio
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getNavigationItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'vehicles', label: 'Vehicles', icon: Car },
      { id: 'tracking', label: 'Live Tracking', icon: Radio },
      { id: 'trips', label: 'Trips', icon: MapPin },
      { id: 'expenses', label: 'Expenses', icon: DollarSign },
      { id: 'reminders', label: 'Reminders', icon: Bell },
      { id: 'logout', label: 'Logout', icon: LogOut },
    ];

    if (user?.role === 'fleet_owner') {
      baseItems.splice(2, 0, { id: 'drivers', label: 'Drivers', icon: Users });
      baseItems.splice(3, 0, { id: 'fleet', label: 'Fleet Management', icon: TruckIcon });
    } else if (user?.role === 'driver') {
      // Remove Live Tracking for drivers
      const trackingIndex = baseItems.findIndex(item => item.id === 'tracking');
      if (trackingIndex !== -1) {
        baseItems.splice(trackingIndex, 1);
      }
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  const Sidebar = ({ className = '' }: { className?: string }) => (
    <div className={`bg-white shadow-lg h-full flex flex-col ${className}`}>
      <div className="p-6 border-b">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">VehicleTracker</h1>
            <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isLogout = item.id === 'logout';
          return (
            <button
              key={item.id}
              onClick={() => {
                if (isLogout) {
                  logout();
                } else {
                  onTabChange(item.id);
                }
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${isLogout
                ? 'text-red-600 hover:bg-red-50'
                : activeTab === item.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900">{user?.name}</h3>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 h-screen sticky top-0">
        <Sidebar className="h-full" />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-80 max-w-sm h-full">
            <Sidebar className="h-full" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">VehicleTracker</h1>
          <div className="w-10" />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}