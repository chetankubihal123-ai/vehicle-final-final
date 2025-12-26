export interface User {
  id: string;
  email: string;
  name: string;
  role: 'personal' | 'fleet_owner' | 'driver';
  created_at?: string;
  fleet_owner_id?: string;
  assignedVehicle?: string | null;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  vehicle_number: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: number;
  fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  current_mileage: number;
  insurance_expiry: string;
  service_due_date: string;
  permit_expiry?: string;
  assigned_driver_id?: string;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
}

export interface Trip {
  id: string;
  vehicle_id: string;
  driver_id: string;
  driver_name?: string;
  start_mileage: number;
  end_mileage: number;
  start_location: string;
  start_location_lat?: string;
  start_location_lon?: string;
  end_location: string;
  end_location_lat?: string;
  end_location_lon?: string;
  trip_date: string;
  fuel_consumed?: number;
  goods_carried?: string;
  trip_purpose: string;
  created_at: string;
}

export interface Expense {
  id: string;
  vehicle_id: string;
  user_id: string;
  logged_by_name?: string;
  category: 'fuel' | 'maintenance' | 'insurance' | 'permit' | 'toll' | 'other';
  amount: number;
  description: string;
  expense_date: string;
  receipt_url?: string;
  created_at: string;
}

export interface ServiceReminder {
  id: string;
  vehicle_id: string;
  reminder_type: 'service' | 'insurance' | 'permit';
  due_date: string;
  description: string;
  is_completed: boolean;
  created_at: string;
}

export interface Driver {
  id: string;
  fleet_owner_id: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  assigned_vehicles: string[];
  status: 'active' | 'inactive';
  created_at: string;
}