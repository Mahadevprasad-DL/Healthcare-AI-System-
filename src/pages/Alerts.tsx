import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Bell, CheckCircle, AlertCircle } from 'lucide-react';

interface Alert {
  id: string;
  alert_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  case_id: string | null;
}

interface EmergencyCase {
  id: string;
  title: string;
  description: string;
  emergency_score: number;
  created_at: string;
  status: string;
  assigned_to: string | null;
  profiles?: {
    full_name: string;
  };
}

interface DoctorUser {
  id: string;
  full_name: string;
  role: string;
}

export function Alerts() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [emergencyCases, setEmergencyCases] = useState<EmergencyCase[]>([]);
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorsError, setDoctorsError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'emergency'>('all');
  const [assignCaseId, setAssignCaseId] = useState<string | null>(null);
  const [selectedDoctorByCase, setSelectedDoctorByCase] = useState<Record<string, string>>({});
  const [assigningCaseId, setAssigningCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (filter === 'emergency') {
      void fetchEmergencyCases();
      if ((profile?.role === 'asha_worker' || profile?.role === 'admin') && doctors.length === 0) {
        void fetchDoctors();
      }
    } else {
      void fetchAlerts();
    }
  }, [filter, profile?.role]);

  async function fetchAlerts() {
    try {
      setLoading(true);
      const payload = await apiRequest<{ alerts: Alert[] }>(`/alerts?filter=${filter}`);
      setAlerts(payload.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmergencyCases() {
    try {
      setLoading(true);
      const payload = await apiRequest<{ cases: EmergencyCase[] }>('/cases');
      const prioritized = [...(payload.cases || [])].sort((a, b) => {
        const scoreDiff = Number(b.emergency_score || 0) - Number(a.emergency_score || 0);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setEmergencyCases(prioritized);
    } catch (error) {
      console.error('Error fetching emergency cases:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDoctors() {
    try {
      setLoadingDoctors(true);
      setDoctorsError('');
      const payload = await apiRequest<{ users: DoctorUser[] }>('/users/doctors');
      setDoctors(payload.users || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setDoctorsError(error instanceof Error ? error.message : 'Unable to load doctors.');
    } finally {
      setLoadingDoctors(false);
    }
  }

  async function openAssignPanel(caseId: string) {
    setAssignCaseId(caseId);
    if (doctors.length === 0 && !loadingDoctors) {
      await fetchDoctors();
    }
  }

  async function assignCaseToDoctor(caseId: string) {
    const doctorId = selectedDoctorByCase[caseId];
    if (!doctorId) {
      return;
    }

    try {
      setAssigningCaseId(caseId);
      await apiRequest(`/cases/${caseId}/assign-doctor`, {
        method: 'PATCH',
        body: JSON.stringify({ doctor_id: doctorId }),
      });

      setAssignCaseId(null);
      await fetchEmergencyCases();
    } catch (error) {
      console.error('Error assigning case to doctor:', error);
    } finally {
      setAssigningCaseId(null);
    }
  }

  async function markAsRead(alertId: string) {
    try {
      await apiRequest(`/alerts/${alertId}/read`, {
        method: 'PATCH',
      });
      await fetchAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      await apiRequest('/alerts/read-all', {
        method: 'PATCH',
      });
      await fetchAlerts();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  const getAlertIcon = (type: string) => {
    const icons: Record<string, typeof AlertCircle> = {
      new_case: AlertCircle,
      escalation: AlertCircle,
      diagnosis: CheckCircle,
      update: Bell,
    };
    return icons[type] || Bell;
  };

  const getAlertColor = (type: string) => {
    const colors: Record<string, string> = {
      new_case: 'bg-blue-100 text-blue-600',
      escalation: 'bg-red-100 text-red-600',
      diagnosis: 'bg-green-100 text-green-600',
      update: 'bg-yellow-100 text-yellow-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
            <p className="text-gray-600 mt-1">Stay updated with important notifications</p>
          </div>
          {filter !== 'emergency' && alerts.some((a) => !a.is_read) && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            >
              Mark All as Read
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Unread
          </button>
          {(profile?.role === 'asha_worker' || profile?.role === 'admin') && (
            <button
              onClick={() => setFilter('emergency')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'emergency'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-red-700 border border-red-300 hover:bg-red-50'
              }`}
            >
              Emergency
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filter === 'emergency' ? (
          emergencyCases.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No emergency cases</h3>
              <p className="text-gray-600">No registered cases are available right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {emergencyCases.map((caseItem) => (
                <div key={caseItem.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          PRIORITY: {Math.max(0, Math.min(10, Number(caseItem.emergency_score || 0)))}/10
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {caseItem.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{caseItem.title}</h3>
                      <p className="text-gray-600 mt-1 line-clamp-2">{caseItem.description}</p>
                      <div className="text-sm text-gray-600 mt-2">
                        Patient: {caseItem.profiles?.full_name || 'Unknown patient'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Created: {new Date(caseItem.created_at).toLocaleString()}
                      </div>
                      <Link
                        to={`/case/${caseItem.id}`}
                        className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Case →
                      </Link>
                    </div>

                    <div className="w-full max-w-xs flex-shrink-0">
                      {(profile?.role === 'asha_worker' || profile?.role === 'admin') && (
                        <>
                          {assignCaseId !== caseItem.id ? (
                            <button
                              onClick={() => {
                                void openAssignPanel(caseItem.id);
                              }}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                              Assign
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <select
                                value={selectedDoctorByCase[caseItem.id] || ''}
                                onChange={(event) =>
                                  setSelectedDoctorByCase((prev) => ({
                                    ...prev,
                                    [caseItem.id]: event.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select doctor</option>
                                {doctors.map((doctor) => (
                                  <option key={doctor.id} value={doctor.id}>
                                    {doctor.full_name}
                                  </option>
                                ))}
                              </select>
                              {loadingDoctors && (
                                <p className="text-xs text-gray-500">Loading doctors...</p>
                              )}
                              {!loadingDoctors && doctors.length === 0 && (
                                <p className="text-xs text-red-600">No doctor accounts found. Please register/login a doctor account.</p>
                              )}
                              {doctorsError && (
                                <p className="text-xs text-red-600">{doctorsError}</p>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => assignCaseToDoctor(caseItem.id)}
                                  disabled={!selectedDoctorByCase[caseItem.id] || assigningCaseId === caseItem.id}
                                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                  {assigningCaseId === caseItem.id ? 'Assigning...' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setAssignCaseId(null)}
                                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No alerts</h3>
            <p className="text-gray-600">
              {filter === 'unread'
                ? "You're all caught up! No unread alerts."
                : 'You have no alerts at this time.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const Icon = getAlertIcon(alert.alert_type);
              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-xl shadow-sm p-6 border transition ${
                    alert.is_read ? 'border-gray-100' : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${getAlertColor(alert.alert_type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {alert.alert_type.replace('_', ' ')}
                          </p>
                          <p className="text-gray-700 mt-1">{alert.message}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!alert.is_read && (
                          <button
                            onClick={() => markAsRead(alert.id)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-4"
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                      {alert.case_id && (
                        <Link
                          to={`/case/${alert.case_id}`}
                          className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Case →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
