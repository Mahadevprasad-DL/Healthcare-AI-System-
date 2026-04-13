import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { Plus, Upload, X } from 'lucide-react';

interface Symptom {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: number;
}

interface SelectedImage {
  id: string;
  source: 'upload' | 'camera';
  fileName: string;
  dataUrl: string;
}

export function CreateCase() {
  const navigate = useNavigate();
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000/api';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emergencyScore, setEmergencyScore] = useState(5);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState<{
    name: string;
    severity: 'mild' | 'moderate' | 'severe';
    duration: number;
  }>({
    name: '',
    severity: 'mild',
    duration: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read image file.'));
      reader.readAsDataURL(file);
    });

  const appendImages = async (files: FileList | File[], source: 'upload' | 'camera') => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      return;
    }

    const preparedImages = await Promise.all(
      imageFiles.map(async (file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        source,
        fileName: file.name,
        dataUrl: await readFileAsDataUrl(file),
      }))
    );

    setSelectedImages((current) => [...current, ...preparedImages]);
  };

  const handleImagePickerChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    try {
      await appendImages(files, 'upload');
    } finally {
      event.target.value = '';
    }
  };

  const removeImage = (id: string) => {
    setSelectedImages((current) => current.filter((image) => image.id !== id));
  };

  const addSymptom = () => {
    if (!currentSymptom.name) return;

    setSymptoms([
      ...symptoms,
      {
        id: Math.random().toString(36).substr(2, 9),
        ...currentSymptom,
      },
    ]);

    setCurrentSymptom({ name: '', severity: 'mild', duration: 1 });
  };

  const removeSymptom = (id: string) => {
    setSymptoms(symptoms.filter((s) => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('healthsetu_auth_token');

      const response = await fetch(`${apiBaseUrl}/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          description,
          emergency_score: emergencyScore,
          image_url: selectedImages[0]?.dataUrl || null,
          images: selectedImages.map((image) => ({
            image_url: image.dataUrl,
            image_source: image.source,
          })),
          symptoms,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to create case.');
      }

      navigate('/my-cases');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Case</h1>
          <p className="text-gray-600 mt-1">Submit your health concerns for medical review</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Case Information</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Case Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of your health concern"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your symptoms and concerns in detail..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Case Images</label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-4 text-blue-700 hover:bg-blue-100 transition"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="font-medium">Upload Images</span>
                  </button>

                  <div className="rounded-xl border border-dashed border-red-300 bg-red-50 px-4 py-4 text-red-700">
                    <label htmlFor="emergencyScore" className="block text-sm font-medium mb-2">
                      Emergency Score
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="emergencyScore"
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={emergencyScore}
                        onChange={(e) => setEmergencyScore(Number(e.target.value))}
                        className="flex-1 accent-red-600"
                      />
                      <div className="min-w-14 rounded-lg bg-white px-3 py-2 text-center font-semibold text-red-700 border border-red-200">
                        {emergencyScore}/10
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Upload multiple photos from your gallery and set how urgent the case is.
                </p>

                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImagePickerChange}
                />

                {selectedImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedImages.map((image, index) => (
                      <div key={image.id} className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                        <div className="relative">
                          <img
                            src={image.dataUrl}
                            alt={`${image.source} preview ${index + 1}`}
                            className="h-40 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="absolute right-2 top-2 rounded-full bg-white/95 p-2 text-gray-700 shadow hover:bg-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="font-medium text-gray-900 truncate">{image.fileName}</span>
                          <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold uppercase text-gray-700">
                            {image.source}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Symptoms</h2>

            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label htmlFor="symptomName" className="block text-sm font-medium text-gray-700 mb-2">
                    Symptom Name
                  </label>
                  <input
                    id="symptomName"
                    type="text"
                    value={currentSymptom.name}
                    onChange={(e) => setCurrentSymptom({ ...currentSymptom, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Fever"
                  />
                </div>

                <div>
                  <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-2">
                    Severity
                  </label>
                  <select
                    id="severity"
                    value={currentSymptom.severity}
                    onChange={(e) =>
                      setCurrentSymptom({
                        ...currentSymptom,
                        severity: e.target.value as 'mild' | 'moderate' | 'severe',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (days)
                  </label>
                  <input
                    id="duration"
                    type="number"
                    min="1"
                    value={currentSymptom.duration}
                    onChange={(e) =>
                      setCurrentSymptom({ ...currentSymptom, duration: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addSymptom}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Symptom</span>
              </button>
            </div>

            {symptoms.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Added Symptoms:</h3>
                {symptoms.map((symptom) => (
                  <div
                    key={symptom.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{symptom.name}</p>
                      <p className="text-sm text-gray-600">
                        Severity: <span className="capitalize">{symptom.severity}</span> • Duration:{' '}
                        {symptom.duration} day{symptom.duration > 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSymptom(symptom.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Case'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
