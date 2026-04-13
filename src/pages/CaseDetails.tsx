import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { apiRequest } from '../lib/api';
import { Calendar, FileText, MessageSquare, User } from 'lucide-react';

interface CaseDetailsData {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string | null;
  created_at: string;
  image_url: string | null;
  assigned_to: string | null;
  user_id: string;
  profile?: {
    full_name: string;
    role: string;
  } | null;
}

interface SymptomRow {
  symptom_name: string;
  severity: string;
  duration_days: number;
}

interface DerivedDiagnosis {
  condition: string;
  confidence: number;
  summary: string;
  recommendation: string;
}

function deriveDiagnosis(caseItem: CaseDetailsData, symptoms: SymptomRow[]): DerivedDiagnosis {
  const titleLower = caseItem.title.toLowerCase();
  const descriptionLower = caseItem.description.toLowerCase();
  const symptomText = symptoms.map((s) => s.symptom_name.toLowerCase()).join(' ');
  const combinedText = `${titleLower} ${descriptionLower} ${symptomText}`;

  let condition = 'General Health Concern';
  let recommendation = 'Follow up with a healthcare professional for clinical confirmation and treatment guidance.';
  let confidence = 62;

  if (/(rash|itch|itching|skin|red patch|swelling)/.test(combinedText)) {
    condition = 'Possible Skin Irritation / Dermatitis Pattern';
    recommendation = 'Keep the affected area clean, avoid irritants, and seek medical review if redness, swelling, or itching worsens.';
    confidence = 78;
  } else if (/(fever|chills|body pain|fatigue)/.test(combinedText)) {
    condition = 'Possible Febrile Illness Pattern';
    recommendation = 'Monitor temperature, maintain hydration, and consult a clinician for diagnostic tests if symptoms persist.';
    confidence = 74;
  } else if (/(cough|breath|wheez|chest)/.test(combinedText)) {
    condition = 'Possible Respiratory Pattern';
    recommendation = 'Track breathing symptoms and seek prompt medical care if shortness of breath or chest discomfort increases.';
    confidence = 73;
  } else if (/(vomit|nausea|diarrhea|stomach|abdominal)/.test(combinedText)) {
    condition = 'Possible Gastrointestinal Pattern';
    recommendation = 'Maintain hydration and consult a doctor if pain, vomiting, or dehydration worsens.';
    confidence = 71;
  }

  const averageDuration = symptoms.length
    ? Math.round(symptoms.reduce((total, item) => total + (item.duration_days || 0), 0) / symptoms.length)
    : 0;
  const severeCount = symptoms.filter((item) => item.severity.toLowerCase() === 'severe').length;

  if (severeCount > 0) {
    confidence = Math.min(92, confidence + 6);
  }

  if (averageDuration >= 5) {
    confidence = Math.min(95, confidence + 4);
  }

  const summaryParts = [
    `The reported case suggests a ${condition.toLowerCase()}.`,
    symptoms.length
      ? `Recorded symptoms include ${symptoms
          .slice(0, 3)
          .map((item) => item.symptom_name)
          .join(', ')}${symptoms.length > 3 ? ', and others' : ''}.`
      : 'No structured symptoms were attached to this case.',
    averageDuration > 0 ? `Average recorded duration is about ${averageDuration} day(s).` : null,
  ].filter(Boolean);

  return {
    condition,
    confidence,
    summary: summaryParts.join(' '),
    recommendation,
  };
}

export function CaseDetails() {
  const { id } = useParams();
  const [caseItem, setCaseItem] = useState<CaseDetailsData | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomRow[]>([]);
  const [loading, setLoading] = useState(true);

  const getEmergencyScore = (score: unknown) => {
    const numericScore = Number(score);
    return Number.isFinite(numericScore) ? Math.max(0, Math.min(10, numericScore)) : 0;
  };

  useEffect(() => {
    if (!id) return;

    async function fetchCaseDetails() {
      try {
        const payload = await apiRequest<{
          case: CaseDetailsData | null;
          symptoms: SymptomRow[];
        }>(`/cases/${id}`);

        setCaseItem(payload.case || null);
        setSymptoms(payload.symptoms || []);
      } catch (error) {
        console.error('Error fetching case details:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCaseDetails();
  }, [id]);

  const derivedDiagnosis = caseItem ? deriveDiagnosis(caseItem, symptoms) : null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Case Details</h1>
            <p className="text-gray-600 mt-1">Review the full case record, symptoms, and diagnosis summary.</p>
          </div>
          <Link to="/cases" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to cases
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : !caseItem ? (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Case not found</h2>
            <p className="text-gray-600">
              The selected case could not be loaded. It may not exist or your backend is not configured yet.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 space-y-4">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-gray-900">{caseItem.title}</h2>
                  <p className="text-gray-600 leading-7">{caseItem.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {caseItem.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {caseItem.severity && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      {caseItem.severity.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{caseItem.profile?.full_name || 'Unknown patient'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(caseItem.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Assigned: {caseItem.assigned_to ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 font-semibold">
                  Emergency Score: {getEmergencyScore((caseItem as unknown as { emergency_score?: number }).emergency_score)}/10
                </span>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Symptoms</h3>
                {symptoms.length === 0 ? (
                  <p className="text-gray-600">No symptoms were recorded for this case.</p>
                ) : (
                  <div className="space-y-3">
                    {symptoms.map((symptom) => (
                      <div key={`${symptom.symptom_name}-${symptom.duration_days}`} className="rounded-lg bg-gray-50 p-4">
                        <p className="font-medium text-gray-900">{symptom.symptom_name}</p>
                        <p className="text-sm text-gray-600 mt-1 capitalize">
                          Severity: {symptom.severity} | Duration: {symptom.duration_days} days
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Diagnosis</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Likely condition (normal result)</p>
                    <p className="text-2xl font-bold text-gray-900">{derivedDiagnosis?.condition}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Confidence</p>
                    <p className="text-lg font-semibold text-gray-900">{derivedDiagnosis?.confidence}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Summary from case details</p>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-gray-800 leading-7">
                      {derivedDiagnosis?.summary}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Recommended action</p>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-gray-800 leading-7">
                      {derivedDiagnosis?.recommendation}
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