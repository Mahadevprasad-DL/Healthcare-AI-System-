import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { apiRequest } from '../lib/api';
import { FileBarChart, Download, TrendingUp, Users, Activity } from 'lucide-react';

interface Stats {
  totalCases: number;
  pendingCases: number;
  resolvedCases: number;
  severeCases: number;
  totalPatients: number;
  avgResolutionTime: number;
}

export function Reports() {
  const [stats, setStats] = useState<Stats>({
    totalCases: 0,
    pendingCases: 0,
    resolvedCases: 0,
    severeCases: 0,
    totalPatients: 0,
    avgResolutionTime: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const payload = await apiRequest<Stats>('/reports/summary');
      setStats(payload);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleExport = () => {
    const csvContent = `
Healthcare AI System Report
Generated: ${new Date().toLocaleString()}

Summary Statistics:
Total Cases,${stats.totalCases}
Pending Cases,${stats.pendingCases}
Resolved Cases,${stats.resolvedCases}
Severe Cases,${stats.severeCases}
Total Patients,${stats.totalPatients}
Average Resolution Time,${stats.avgResolutionTime} days
    `.trim();

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthcare-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const reportCards = [
    { name: 'Total Cases', value: stats.totalCases, icon: FileBarChart, color: 'blue' },
    { name: 'Pending Cases', value: stats.pendingCases, icon: Activity, color: 'yellow' },
    { name: 'Resolved Cases', value: stats.resolvedCases, icon: TrendingUp, color: 'green' },
    { name: 'Severe Cases', value: stats.severeCases, icon: Activity, color: 'red' },
    { name: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'purple' },
    {
      name: 'Avg Resolution Time',
      value: `${stats.avgResolutionTime} days`,
      icon: TrendingUp,
      color: 'teal',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-1">Analytics and insights for healthcare management</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reportCards.map((card) => {
                const Icon = card.icon;
                const colorClasses = {
                  blue: 'bg-blue-100 text-blue-600',
                  yellow: 'bg-yellow-100 text-yellow-600',
                  green: 'bg-green-100 text-green-600',
                  red: 'bg-red-100 text-red-600',
                  purple: 'bg-purple-100 text-purple-600',
                  teal: 'bg-teal-100 text-teal-600',
                };
                return (
                  <div
                    key={card.name}
                    className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-600">{card.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Case Status Distribution</h2>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Pending</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {((stats.pendingCases / (stats.totalCases || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(stats.pendingCases / (stats.totalCases || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Resolved</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {((stats.resolvedCases / (stats.totalCases || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(stats.resolvedCases / (stats.totalCases || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Severity Breakdown</h2>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Severe Cases</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {stats.severeCases} cases
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(stats.severeCases / (stats.totalCases || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
