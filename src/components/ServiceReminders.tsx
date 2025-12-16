import React from 'react';
import { Bell, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useVehicles } from '../hooks/useVehicles';
import { format, parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';

export default function ServiceReminders() {
  const { vehicles } = useVehicles();

  const getReminders = () => {
    const reminders: Array<{
      id: string;
      vehicle: any;
      type: 'service' | 'insurance' | 'permit';
      dueDate: string;
      daysUntilDue: number;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    vehicles.forEach((vehicle) => {
      // Service reminders
      if (vehicle.service_due_date) {
        try {
          const serviceDays = differenceInDays(parseISO(vehicle.service_due_date), new Date());
          reminders.push({
            id: `${vehicle.id}-service`,
            vehicle,
            type: 'service',
            dueDate: vehicle.service_due_date,
            daysUntilDue: serviceDays,
            priority: serviceDays <= 7 ? 'high' : serviceDays <= 30 ? 'medium' : 'low',
          });
        } catch (e) {
          console.error("Invalid service date:", vehicle.service_due_date);
        }
      }

      // Insurance reminders
      if (vehicle.insurance_expiry) {
        try {
          const insuranceDays = differenceInDays(parseISO(vehicle.insurance_expiry), new Date());
          reminders.push({
            id: `${vehicle.id}-insurance`,
            vehicle,
            type: 'insurance',
            dueDate: vehicle.insurance_expiry,
            daysUntilDue: insuranceDays,
            priority: insuranceDays <= 7 ? 'high' : insuranceDays <= 30 ? 'medium' : 'low',
          });
        } catch (e) {
          console.error("Invalid insurance date:", vehicle.insurance_expiry);
        }
      }

      // Permit reminders (if applicable)
      if (vehicle.permit_expiry) {
        try {
          const permitDays = differenceInDays(parseISO(vehicle.permit_expiry), new Date());
          reminders.push({
            id: `${vehicle.id}-permit`,
            vehicle,
            type: 'permit',
            dueDate: vehicle.permit_expiry,
            daysUntilDue: permitDays,
            priority: permitDays <= 7 ? 'high' : permitDays <= 30 ? 'medium' : 'low',
          });
        } catch (e) {
          console.error("Invalid permit date:", vehicle.permit_expiry);
        }
      }
    });

    return reminders
      .filter(r => r.daysUntilDue <= 60 && !Number.isNaN(r.daysUntilDue)) // Check for NaN
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  };

  const reminders = getReminders();
  const overdueReminders = reminders.filter(r => r.daysUntilDue < 0);
  const urgentReminders = reminders.filter(r => r.daysUntilDue >= 0 && r.daysUntilDue <= 7);
  const upcomingReminders = reminders.filter(r => r.daysUntilDue > 7);

  const getPriorityColor = (priority: string, daysUntilDue: number) => {
    if (daysUntilDue < 0) return 'border-red-500 bg-red-50';
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const getPriorityIcon = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return AlertTriangle;
    if (daysUntilDue <= 7) return AlertTriangle;
    return Clock;
  };

  const ReminderCard = ({ reminder }: { reminder: any }) => {
    const Icon = getPriorityIcon(reminder.daysUntilDue);
    const isOverdue = reminder.daysUntilDue < 0;

    return (
      <div className={`rounded-xl shadow-sm border-l-4 p-6 hover:shadow-md transition-shadow ${getPriorityColor(reminder.priority, reminder.daysUntilDue)}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-100' : reminder.priority === 'high' ? 'bg-red-100' : reminder.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
              <Icon className={`h-6 w-6 ${isOverdue ? 'text-red-600' : reminder.priority === 'high' ? 'text-red-600' : reminder.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)} Due
              </h3>
              <p className="text-gray-600">
                {reminder.vehicle.vehicle_number} - {reminder.vehicle.make} {reminder.vehicle.model}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-900">
              {format(parseISO(reminder.dueDate), 'MMM dd, yyyy')}
            </p>
            <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' :
                reminder.daysUntilDue <= 7 ? 'text-red-600' :
                  reminder.daysUntilDue <= 30 ? 'text-yellow-600' : 'text-blue-600'
              }`}>
              {isOverdue
                ? `${Math.abs(reminder.daysUntilDue)} days overdue`
                : reminder.daysUntilDue === 0
                  ? 'Due today'
                  : `${reminder.daysUntilDue} days remaining`
              }
            </p>
          </div>
        </div>

        {isOverdue && (
          <div className="mt-4 p-3 bg-red-100 rounded-lg">
            <p className="text-red-800 text-sm font-medium">
              ⚠️ This reminder is overdue. Please take action immediately.
            </p>
          </div>
        )}
      </div>
    );
  };

  const StatCard = ({ title, count, icon: Icon, color }: {
    title: string;
    count: number;
    icon: any;
    color: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Reminders</h1>
        <p className="text-gray-600 mt-1">Stay on top of vehicle maintenance and compliance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Overdue"
          count={overdueReminders.length}
          icon={AlertTriangle}
          color="bg-red-500"
        />
        <StatCard
          title="Due This Week"
          count={urgentReminders.length}
          icon={AlertTriangle}
          color="bg-orange-500"
        />
        <StatCard
          title="Upcoming"
          count={upcomingReminders.length}
          icon={Clock}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Vehicles"
          count={vehicles.length}
          icon={CheckCircle}
          color="bg-green-500"
        />
      </div>

      {/* Overdue Reminders */}
      {overdueReminders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-red-600 mb-4 flex items-center">
            <AlertTriangle className="h-6 w-6 mr-2" />
            Overdue ({overdueReminders.length})
          </h2>
          <div className="space-y-4">
            {overdueReminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        </div>
      )}

      {/* Urgent Reminders */}
      {urgentReminders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-yellow-600 mb-4 flex items-center">
            <AlertTriangle className="h-6 w-6 mr-2" />
            Due This Week ({urgentReminders.length})
          </h2>
          <div className="space-y-4">
            {urgentReminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center">
            <Clock className="h-6 w-6 mr-2" />
            Upcoming ({upcomingReminders.length})
          </h2>
          <div className="space-y-4">
            {upcomingReminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        </div>
      )}

      {reminders.length === 0 && (
        <div className="text-center py-12">
          <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No upcoming reminders</p>
          <p className="text-gray-400">All your vehicles are up to date!</p>
        </div>
      )}
    </div>
  );
}