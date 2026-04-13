import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { Users, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface Stats {
  totalCases: number;
  pendingCases: number;
  resolvedCases: number;
  alerts: number;
}

export function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalCases: 0,
    pendingCases: 0,
    resolvedCases: 0,
    alerts: 0,
  });
  const [loading, setLoading] = useState(true);
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000/api';

  useEffect(() => {
    fetchStats();
  }, [profile]);

  async function fetchStats() {
    try {
      const token = localStorage.getItem('healthsetu_auth_token');
      const response = await fetch(`${apiBaseUrl}/dashboard/stats`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to fetch dashboard stats.');
      }

      setStats({
        totalCases: payload.totalCases || 0,
        pendingCases: payload.pendingCases || 0,
        resolvedCases: payload.resolvedCases || 0,
        alerts: payload.alerts || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { name: 'Total Cases', value: stats.totalCases, icon: FileText, color: 'blue' },
    { name: 'Pending Cases', value: stats.pendingCases, icon: AlertCircle, color: 'yellow' },
    { name: 'Resolved Cases', value: stats.resolvedCases, icon: CheckCircle, color: 'green' },
    { name: 'Unread Alerts', value: stats.alerts, icon: Users, color: 'red' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {profile?.full_name}
          </h1>
          <p className="text-gray-600 mt-1 capitalize">
            {profile?.role?.replace('_', ' ')} Dashboard
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              const colorClasses = {
                blue: 'bg-blue-100 text-blue-600',
                yellow: 'bg-yellow-100 text-yellow-600',
                green: 'bg-green-100 text-green-600',
                red: 'bg-red-100 text-red-600',
              };
              return (
                <div
                  key={stat.name}
                  className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile?.role === 'villager' && (
              <>
                <a
                  href="/create-case"
                  className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  <FileText className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="font-medium text-blue-900">Create New Case</span>
                </a>
                <a
                  href="/my-cases"
                  className="flex items-center p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition"
                >
                  <FileText className="w-5 h-5 text-teal-600 mr-3" />
                  <span className="font-medium text-teal-900">View My Cases</span>
                </a>
              </>
            )}
            {(profile?.role === 'asha_worker' || profile?.role === 'doctor' || profile?.role === 'admin') && (
              <>
                <a
                  href="/cases"
                  className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  <FileText className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="font-medium text-blue-900">View All Cases</span>
                </a>
                <a
                  href="/reports"
                  className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
                >
                  <FileText className="w-5 h-5 text-green-600 mr-3" />
                  <span className="font-medium text-green-900">Generate Reports</span>
                </a>
              </>
            )}
            <a
              href="/alerts"
              className="flex items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition"
            >
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <span className="font-medium text-red-900">View Alerts</span>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
