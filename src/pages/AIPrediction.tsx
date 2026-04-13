import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { apiRequest } from '../lib/api';
import { Brain, CheckCircle, AlertTriangle, Upload, Trash2, TrendingUp } from 'lucide-react';

interface Case {
  id: string;
  title: string;
  description: string;
}

interface Prediction {
  disease_name: string;
  confidence_score: number;
  recommended_action: string;
  created_at?: string;
  top_predictions?: Array<{
    disease_name: string;
    confidence_score: number;
  }>;
}

interface UploadedImage {
  id: string;
  fileName: string;
  dataUrl: string;
}

export function AIPrediction() {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [machineEnabled, setMachineEnabled] = useState(false);
  const [machinePrediction, setMachinePrediction] = useState<Prediction | null>(null);
  const [machineLoading, setMachineLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (selectedCase) {
      setError('');
    }
  }, [selectedCase]);

  async function fetchCases() {
    setLoading(true);
    try {
      const payload = await apiRequest<{ cases: Case[] }>('/cases/selectable');
      setCases(payload.cases || []);
    } catch (fetchError) {
      console.error('Error fetching cases:', fetchError);
    } finally {
      setLoading(false);
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return TrendingUp;
    return AlertTriangle;
  };

  const selectedCaseData = cases.find((caseItem) => caseItem.id === selectedCase) || null;

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read image file.'));
      reader.readAsDataURL(file);
    });

  const normalizePrediction = (value: unknown): Prediction | null => {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const source = value as Record<string, unknown>;
    const nested = source.prediction && typeof source.prediction === 'object'
      ? (source.prediction as Record<string, unknown>)
      : source;

    const disease = typeof nested.disease_name === 'string' ? nested.disease_name.trim() : '';
    const confidence = Number(nested.confidence_score);

    if (!disease || !Number.isFinite(confidence)) {
      return null;
    }

    return {
      disease_name: disease,
      confidence_score: Math.max(0, Math.min(100, confidence)),
      recommended_action:
        typeof nested.recommended_action === 'string' && nested.recommended_action.trim()
          ? nested.recommended_action
          : 'Please consult a qualified healthcare professional for confirmation and treatment.',
      created_at: typeof nested.created_at === 'string' ? nested.created_at : undefined,
      top_predictions: Array.isArray(nested.top_predictions)
        ? (nested.top_predictions as Array<{ disease_name: string; confidence_score: number }>)
        : undefined,
    };
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    try {
      const nextImages = await Promise.all(
        files
          .filter((file) => file.type.startsWith('image/'))
          .map(async (file) => ({
            id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
            fileName: file.name,
            dataUrl: await readFileAsDataUrl(file),
          }))
      );

      setUploadedImages((current) => [...current, ...nextImages]);
      setMachinePrediction(null);
      setError('');
    } finally {
      event.target.value = '';
    }
  };

  const removeUploadedImage = (id: string) => {
    setUploadedImages((current) => current.filter((image) => image.id !== id));
  };

  const runMachinePrediction = async () => {
    if (!selectedCase) {
      setError('Please select a case first.');
      return;
    }

    if (uploadedImages.length === 0) {
      setError('Please upload at least one image first.');
      return;
    }

    setMachineLoading(true);
    setError('');

    try {
      const payload = await apiRequest<{ prediction: Prediction }>('/ml/predict-image', {
        method: 'POST',
        body: JSON.stringify({
          case_id: selectedCase,
          images: uploadedImages.map((image) => image.dataUrl),
        }),
      });

      const normalized = normalizePrediction(payload.prediction);
      if (!normalized) {
        throw new Error('Model returned an invalid prediction response.');
      }

      setMachinePrediction(normalized);
    } catch (predictError) {
      console.error('Error generating image prediction:', predictError);
      setError(predictError instanceof Error ? predictError.message : 'Unable to generate prediction.');
    } finally {
      setMachineLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Diagnosis</h1>
          <p className="text-gray-600 mt-1">
            Get AI-powered disease predictions based on symptoms, case information, and uploaded images.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Case</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <select
                value={selectedCase}
                onChange={(e) => setSelectedCase(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a case for prediction...</option>
                {cases.map((caseItem) => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedCaseData && (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Normal Result</h3>
                  <p className="text-sm text-gray-600">Selected case information</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Case title</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedCaseData.title}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 leading-7">
                  {selectedCaseData.description}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Get the prediction with Machine</h2>
              <p className="text-sm text-gray-600">
                Turn this on, upload images from your dataset, and generate the machine result card.
              </p>
            </div>

            <label className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={machineEnabled}
                onChange={(e) => {
                  setMachineEnabled(e.target.checked);
                  setMachinePrediction(null);
                  setError('');
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-gray-900">Get prediction with Machine</span>
            </label>
          </div>

          {machineEnabled && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Images</label>
                <label className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-4 text-blue-700 hover:bg-blue-100 transition cursor-pointer">
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Upload Dataset Images</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleImageUpload(event)}
                  />
                </label>

                <p className="text-xs text-gray-500 mt-2">
                  Upload one or more images. The model will analyze all uploaded images and return a combined prediction.
                </p>

                {uploadedImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedImages.map((image) => (
                      <div key={image.id} className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                        <div className="relative">
                          <img
                            src={image.dataUrl}
                            alt={image.fileName}
                            className="h-40 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(image.id)}
                            className="absolute right-2 top-2 rounded-full bg-white/95 p-2 text-gray-700 shadow hover:bg-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="px-3 py-2 text-sm text-gray-900 truncate">{image.fileName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => void runMachinePrediction()}
                disabled={machineLoading || uploadedImages.length === 0 || !selectedCase}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Brain className="w-5 h-5" />
                <span>{machineLoading ? 'Analyzing...' : 'Analyze Uploaded Images'}</span>
              </button>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-2">
                    <Brain className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Machine Result</h3>
                    <p className="text-sm text-gray-600">AI generated diagnosis from uploaded images</p>
                  </div>
                </div>

                {!uploadedImages.length ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
                    Upload images to generate a machine result.
                  </div>
                ) : machineLoading ? (
                  <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : machinePrediction ? (
                  <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-4">
                    <div>
                      <p className="text-sm text-gray-600">Machine diagnosis</p>
                      <p className="text-2xl font-bold text-gray-900">{machinePrediction.disease_name}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Confidence Score</p>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                machinePrediction.confidence_score >= 80
                                  ? 'bg-green-600'
                                  : machinePrediction.confidence_score >= 60
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                              }`}
                              style={{ width: `${machinePrediction.confidence_score}%` }}
                            />
                          </div>
                        </div>
                        <div
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold ${getConfidenceColor(
                            machinePrediction.confidence_score
                          )}`}
                        >
                          {(() => {
                            const Icon = getConfidenceIcon(machinePrediction.confidence_score);
                            return <Icon className="w-5 h-5" />;
                          })()}
                          <span>{machinePrediction.confidence_score}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Recommended Action</p>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-gray-800 leading-7">
                        {machinePrediction.recommended_action}
                      </div>
                    </div>

                    {machinePrediction.created_at && (
                      <p className="text-xs text-gray-500">
                        Generated on {new Date(machinePrediction.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
                    No machine result available yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            <strong>Disclaimer:</strong> The normal result shows the selected case details, while the machine result is generated from uploaded images using a dataset-trained model.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
