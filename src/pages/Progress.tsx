import { DashboardLayout } from '../components/DashboardLayout';
import { Activity, CheckCircle2, ClipboardList, HeartPulse } from 'lucide-react';

const steps = [
  {
    title: 'Case submitted',
    description: 'Patient or worker enters symptoms and supporting details.',
    icon: ClipboardList,
    complete: true,
  },
  {
    title: 'AI reviewed',
    description: 'Prediction engine evaluates possible conditions and severity.',
    icon: HeartPulse,
    complete: true,
  },
  {
    title: 'Clinician assigned',
    description: 'ASHA worker or doctor receives the case for triage.',
    icon: Activity,
    complete: false,
  },
  {
    title: 'Treatment tracked',
    description: 'Resolution and follow-up milestones are recorded here.',
    icon: CheckCircle2,
    complete: false,
  },
];

export function Progress() {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Progress Tracking</h1>
          <p className="text-gray-600 mt-1">A simple view of the care journey from intake to closure.</p>
        </div>

        <div className="grid gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className={`rounded-xl border p-5 bg-white shadow-sm ${
                  step.complete ? 'border-green-200' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      step.complete ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {index + 1}. {step.title}
                      </h2>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          step.complete
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {step.complete ? 'Complete' : 'In progress'}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-2">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}