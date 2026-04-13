import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/api';
import { FileText, User, Calendar } from 'lucide-react';

interface Case {
  id: string;
  title: string;
  description: string;
  emergency_score: number;
  status: string;
  severity: string | null;
  created_at: string;
  user_id: string;
  assigned_to: string | null;
  profiles: {
    full_name: string;
  };
}

export function AllCases() {
  const { profile } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    fetchCases();
  }, [profile, filter]);

  async function fetchCases() {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const payload = await apiRequest<{ cases: Case[] }>(`/cases${params.toString() ? `?${params.toString()}` : ''}`);
      const prioritizedCases = [...(payload.cases || [])].sort((a, b) => {
        const scoreDiff = Number(b.emergency_score || 0) - Number(a.emergency_score || 0);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setCases(prioritizedCases);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  }

  async function assignToSelf(caseId: string) {
    setAssigning(caseId);
    try {
      await apiRequest(`/cases/${caseId}/assign`, {
        method: 'PATCH',
      });

      await fetchCases();
    } catch (error) {
      console.error('Error assigning case:', error);
    } finally {
      setAssigning(null);
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Cases</h1>
          <p className="text-gray-600 mt-1">View and manage patient cases</p>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto">
          {['all', 'pending', 'in_review', 'diagnosed', 'treatment', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No cases found</h3>
            <p className="text-gray-600">There are no cases matching your current filter.</p>
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
                    <p className="text-gray-600 line-clamp-2 mb-3">{caseItem.description}</p>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>Patient: {caseItem.profiles.full_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    PRIORITY: {Math.max(0, Math.min(10, Number(caseItem.emergency_score || 0)))}/10
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      caseItem.status
                    )}`}
                  >
                    {caseItem.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {caseItem.severity && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(
                        caseItem.severity
                      )}`}
                    >
                      {caseItem.severity.toUpperCase()}
                    </span>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(caseItem.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div>
                    {caseItem.assigned_to === profile?.id && (
                      <span className="text-sm text-blue-600 font-medium">
                        Assigned to you
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {!caseItem.assigned_to && (
                      <button
                        onClick={() => assignToSelf(caseItem.id)}
                        disabled={assigning === caseItem.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {assigning === caseItem.id ? 'Assigning...' : 'Assign to Me'}
                      </button>
                    )}
                    <Link
                      to={`/case/${caseItem.id}`}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
