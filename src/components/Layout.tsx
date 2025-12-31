import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Radio,
  User as UserIcon,
  ChevronDown,

  Phone,
  Mail
} from 'lucide-react';
import ProfileModal from './ProfileModal';
import { API_URL } from '../config';
import { socket } from '../socket'; // Add socket import

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

      // Remove Vehicles list for drivers (as requested)
      const vehiclesIndex = baseItems.findIndex(item => item.id === 'vehicles');
      if (vehiclesIndex !== -1) {
        baseItems.splice(vehiclesIndex, 1);
      }
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  // NOTIFICATION LOGIC
  React.useEffect(() => {
    if (!user) return;

    // 1. Connect socket
    socket.auth = { token: localStorage.getItem("token") };
    if (!socket.connected) socket.connect();

    // 2. Join owner room
    if (user.role === 'fleet_owner' || user.role === 'admin') {
      socket.emit("join_owner_room");
      console.log("Joined owner room");
    }

    // 3. Listen for alerts
    const onTrackingStarted = (data: any) => {
      // Create a native notification or toast
      // For now, simpler: alert + sound
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audio.play().catch(e => console.error("Audio play failed", e));

      // We can also use a custom toast if available, or just browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Driver Tracking Started", {
          body: `${data.driverName} started tracking vehicle ${data.vehicleNumber}`,
          icon: "/icon.png" // optional
        });
      } else if ("Notification" in window && Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("Driver Tracking Started", {
              body: `${data.driverName} started tracking vehicle ${data.vehicleNumber}`,
            });
          }
        });
      }

      // Fallback or additional in-app UI can go here?
      // For this request, "popup notification alert" -> Browser Notification is best
      alert(`🔔 ALERT: ${data.driverName} just started tracking ${data.vehicleNumber}!`);
    };

    socket.on("alert_tracking_started", onTrackingStarted);

    return () => {
      socket.off("alert_tracking_started", onTrackingStarted);
    };
  }, [user]);

  const Sidebar = ({ className = '' }: { className?: string }) => (
    <div className={`bg-white shadow-lg h-full flex flex-col ${className}`}>
      <div className="p-6 border-b">
        <div
          className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => {
            onTabChange('dashboard');
            setSidebarOpen(false);
          }}
        >
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

        {/* Desktop Top Header */}
        <header className="hidden lg:flex bg-white/80 backdrop-blur-md border-b sticky top-0 z-30 px-8 py-4 items-center justify-between">
          <div /> {/* Spacer */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 p-1.5 hover:bg-gray-100 rounded-full transition-all duration-200 border border-transparent hover:border-gray-200"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500/20">
                <img
                  src={user?.profilePic ? (user.profilePic.startsWith('http') ? user.profilePic : `${API_URL}${user.profilePic}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}&mood=smiling&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-sm font-bold text-gray-900 leading-tight">{user?.name}</p>
                <p className="text-xs text-secondary leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b border-gray-50">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</p>
                    </div>

                    <button
                      onClick={() => {
                        setProfileModalOpen(true);
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-5 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                    >
                      <UserIcon className="h-4 w-4" />
                      <span className="font-medium text-sm">Profile Settings</span>
                    </button>



                    <div className="my-2 border-t border-gray-50" />

                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-5 py-3 text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="font-medium text-sm">Sign Out</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 flex flex-col">
          <div className="flex-1">
            {children}
          </div>

          <footer className="mt-auto pt-8 pb-4">
            <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs lg:text-sm text-gray-400">
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Car className="h-4 w-4 text-indigo-500" />
                  <span className="font-bold text-gray-900 tracking-tight">VehicleTracker</span>
                </div>
                <p className="font-medium whitespace-nowrap">Copyright © 2025. All rights reserved.</p>
              </div>

              <div className="flex flex-col items-center md:items-end gap-2">
                <div className="bg-indigo-50 px-3 py-1 rounded-full">
                  <span className="text-indigo-600 font-bold">Web Creator: CARS</span>
                </div>
                <div className="flex flex-wrap justify-center md:justify-end gap-x-4 gap-y-1">
                  <a href="tel:9916463062" className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors group">
                    <Phone className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">9916463062</span>
                  </a>
                  <a href="mailto:chetankubihal123@gmail.com" className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors group">
                    <Mail className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">chetankubihal123@gmail.com</span>
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}