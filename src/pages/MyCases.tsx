import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Calendar } from 'lucide-react';

interface Case {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string | null;
  emergency_score: number;
  created_at: string;
  image_url: string | null;
}

export function MyCases() {
  const { profile } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000/api';
  const getEmergencyScore = (score: unknown) => {
    const numericScore = Number(score);
    return Number.isFinite(numericScore) ? Math.max(0, Math.min(10, numericScore)) : 0;
  };

  useEffect(() => {
    fetchCases();
  }, [profile]);

  async function fetchCases() {
    try {
      const token = localStorage.getItem('healthsetu_auth_token');

      const response = await fetch(`${apiBaseUrl}/cases/me`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to fetch cases.');
      }

      setCases(payload.cases || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_review: 'bg-blue-100 text-blue-800',
      diagnosed: 'bg-purple-100 text-purple-800',
      treatment: 'bg-teal-100 text-teal-800',
      resolved: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityColor = (severity: string | null) => {
    if (!severity) return 'bg-gray-100 text-gray-800';
    const colors: Record<string, string> = {
      early: 'bg-green-100 text-green-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      severe: 'bg-red-100 text-red-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Cases</h1>
            <p className="text-gray-600 mt-1">View and track your submitted health cases</p>
          </div>
          <Link
            to="/create-case"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Create New Case
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No cases yet</h3>
            <p className="text-gray-600 mb-6">
              You haven't submitted any health cases. Create your first case to get started.
            </p>
            <Link
              to="/create-case"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create Your First Case
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{caseItem.title}</h3>
                    <p className="text-gray-600 line-clamp-2">{caseItem.description}</p>
                  </div>
                  {caseItem.image_url && (
                    <img
                      src={caseItem.image_url}
                      alt="Case"
                      className="w-20 h-20 rounded-lg object-cover ml-4"
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                    {caseItem.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {caseItem.severity && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(caseItem.severity)}`}>
                      {caseItem.severity.toUpperCase()}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    EMERGENCY: {getEmergencyScore(caseItem.emergency_score)}/10
                  </span>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(caseItem.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Link
                    to={`/case/${caseItem.id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
