import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { apiRequest } from '../lib/api';
import { GitBranch, AlertTriangle, Activity, CheckCircle } from 'lucide-react';

interface Case {
  id: string;
  title: string;
  description: string;
  emergency_score: number;
  status: string;
  severity: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
  };
}

interface CaseWithSymptoms extends Case {
  symptoms: Array<{
    symptom_name: string;
    severity: string;
    duration_days: number;
  }>;
  predictions: Array<{
    confidence_score: number;
    disease_name: string;
  }>;
}

export function DecisionEngine() {
  const [cases, setCases] = useState<CaseWithSymptoms[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    try {
      const payload = await apiRequest<{ cases: CaseWithSymptoms[] }>('/cases/decision-queue');
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

  async function classifyCase(caseItem: CaseWithSymptoms) {
    setProcessing(caseItem.id);
    try {
      let severityScore = 0;

      caseItem.symptoms.forEach((symptom) => {
        if (symptom.severity === 'severe') severityScore += 3;
        else if (symptom.severity === 'moderate') severityScore += 2;
        else severityScore += 1;

        if (symptom.duration_days > 7) severityScore += 2;
        else if (symptom.duration_days > 3) severityScore += 1;
      });

      if (caseItem.predictions.length > 0) {
        const confidence = caseItem.predictions[0].confidence_score;
        if (confidence > 80) severityScore += 2;
        else if (confidence > 60) severityScore += 1;
      }

      let severity: 'early' | 'moderate' | 'severe';
      let newStatus: string;

      if (severityScore >= 10) {
        severity = 'severe';
        newStatus = 'in_review';
      } else if (severityScore >= 5) {
        severity = 'moderate';
        newStatus = 'in_review';
      } else {
        severity = 'early';
        newStatus = 'in_review';
      }

      await apiRequest(`/cases/${caseItem.id}/classify`, {
        method: 'POST',
        body: JSON.stringify({
          severity,
          status: newStatus,
        }),
      });

      await fetchCases();
    } catch (error) {
      console.error('Error classifying case:', error);
    } finally {
      setProcessing(null);
    }
  }

  const getSeverityIcon = (severity: string | null) => {
    if (severity === 'severe') return AlertTriangle;
    if (severity === 'moderate') return Activity;
    return CheckCircle;
  };

  const getSeverityColor = (severity: string | null) => {
    if (severity === 'severe') return 'text-red-600 bg-red-100';
    if (severity === 'moderate') return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Decision Engine</h1>
          <p className="text-gray-600 mt-1">
            Automatically classify cases based on severity and assign priority levels
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How Classification Works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Analyzes symptoms severity and duration</li>
            <li>• Considers diagnosis confidence scores</li>
            <li>• Classifies cases as Early, Moderate, or Severe</li>
            <li>• Automatically notifies appropriate medical staff</li>
          </ul>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
            <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending cases</h3>
            <p className="text-gray-600">All cases have been classified and processed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {cases.map((caseItem) => {
              const SeverityIcon = getSeverityIcon(caseItem.severity);
              return (
                <div
                  key={caseItem.id}
                  className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {caseItem.title}
                      </h3>
                      <p className="text-gray-600 mb-3">{caseItem.description}</p>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          PRIORITY: {Math.max(0, Math.min(10, Number(caseItem.emergency_score || 0)))}/10
                        </span>
                        <span className="text-sm text-gray-600">
                          Patient: {caseItem.profiles?.full_name || 'Unknown patient'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Symptoms:</p>
                          <div className="flex flex-wrap gap-2">
                            {caseItem.symptoms.map((symptom, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs"
                              >
                                {symptom.symptom_name} ({symptom.severity})
                              </span>
                            ))}
                          </div>
                        </div>

                        {caseItem.predictions.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Diagnosis:
                            </p>
                            <span className="text-sm text-gray-800">
                              {caseItem.predictions[0].disease_name} (
                              {caseItem.predictions[0].confidence_score}% confidence)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {caseItem.severity && (
                      <div
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getSeverityColor(
                          caseItem.severity
                        )}`}
                      >
                        <SeverityIcon className="w-5 h-5" />
                        <span className="font-semibold capitalize">{caseItem.severity}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-sm text-gray-600">
                      Created: {new Date(caseItem.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => classifyCase(caseItem)}
                      disabled={processing === caseItem.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <GitBranch className="w-4 h-4" />
                      <span>
                        {processing === caseItem.id ? 'Classifying...' : 'Classify Case'}
                      </span>
                    </button>
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
