import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CreateCase } from './pages/CreateCase';
import { MyCases } from './pages/MyCases';
import { AllCases } from './pages/AllCases';
import { AIPrediction } from './pages/AIPrediction';
import { DecisionEngine } from './pages/DecisionEngine';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { UserManagement } from './pages/UserManagement';
import { Settings } from './pages/Settings';
import { CaseDetails } from './pages/CaseDetails';
import { Progress } from './pages/Progress';
import { Unauthorized } from './pages/Unauthorized';
import { ArrowRight, Brain, FileText, Heart, Shield, Users } from 'lucide-react';
import { hasSupabaseConfig } from './lib/supabase';

function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.28),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(45,212,191,0.22),_transparent_28%),linear-gradient(180deg,_#08111f_0%,_#0f172a_45%,_#111827_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />

      <div className="relative max-w-7xl mx-auto px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-400/15 border border-cyan-300/20 flex items-center justify-center">
              <Heart className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Healthcare AI System (HealthSetu)</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-full border border-white/15 text-sm text-white/85 hover:bg-white/8 transition"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-full bg-cyan-400 text-slate-950 text-sm font-semibold hover:bg-cyan-300 transition"
            >
              Get started
            </Link>
          </div>
        </header>

        <main className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center pt-16 lg:pt-24">
          <section className="space-y-8 max-w-3xl">
            <div className="space-y-5">
              <h2 className="text-5xl lg:text-7xl font-semibold leading-[0.95] tracking-tight text-balance">
                Healthcare workflows that start cleanly and stay coordinated.
              </h2>
              <p className="text-lg lg:text-xl text-slate-300 max-w-2xl leading-8">
                Submit cases, triage symptoms, generate AI-supported predictions, and track care
                from one dashboard. If Supabase is configured, the app connects to your live data.
                If not, it still boots with a usable interface instead of a blank screen.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-950 font-semibold hover:bg-cyan-100 transition"
              >
                Open dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 text-white font-semibold hover:bg-white/8 transition"
              >
                Create account
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-4">
              {[
                { label: 'Case intake', value: 'Fast submission', icon: FileText },
                { label: 'AI triage', value: 'Decision support', icon: Brain },
                { label: 'Care network', value: 'Role-based access', icon: Users },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-white/6 border border-white/10 p-4 backdrop-blur-sm"
                  >
                    <Icon className="w-5 h-5 text-cyan-300 mb-4" />
                    <p className="text-sm text-slate-300">{item.label}</p>
                    <p className="text-base font-medium text-white mt-1">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="relative">
            <div className="absolute inset-0 blur-3xl bg-cyan-500/15 rounded-full translate-y-10" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/8 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/80">System status</p>
                <h3 className="text-2xl font-semibold mt-2">Operational overview</h3>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-900/60 p-4 border border-white/8">
                    <p className="text-sm text-slate-400">Patient intake</p>
                    <p className="text-3xl font-semibold mt-2 text-white">24/7</p>
                  </div>
                  <div className="rounded-2xl bg-slate-900/60 p-4 border border-white/8">
                    <p className="text-sm text-slate-400">Risk screening</p>
                    <p className="text-3xl font-semibold mt-2 text-white">AI</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    'Role-based dashboards',
                    'Case assignment and review',
                    'Alerts and reporting',
                  ].map((text) => (
                    <div
                      key={text}
                      className="flex items-center gap-3 rounded-2xl bg-slate-900/45 border border-white/8 px-4 py-3"
                    >
                      <Shield className="w-4 h-4 text-cyan-300" />
                      <span className="text-sm text-slate-200">{text}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-gradient-to-r from-cyan-400/20 to-blue-500/20 border border-cyan-200/10 p-5">
                  <p className="text-sm text-cyan-100/90">Supabase configuration</p>
                  <p className="mt-2 text-white font-medium">
                    {hasSupabaseConfig ? 'Connected to live backend' : 'Missing env vars, using safe fallback mode'}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-case"
            element={
              <ProtectedRoute allowedRoles={['villager']}>
                <CreateCase />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-cases"
            element={
              <ProtectedRoute allowedRoles={['villager']}>
                <MyCases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cases"
            element={
              <ProtectedRoute allowedRoles={['asha_worker', 'doctor', 'admin']}>
                <AllCases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/case/:id"
            element={
              <ProtectedRoute>
                <CaseDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-prediction"
            element={
              <ProtectedRoute>
                <AIPrediction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/decision-engine"
            element={
              <ProtectedRoute allowedRoles={['asha_worker', 'doctor', 'admin']}>
                <DecisionEngine />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <Progress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <Alerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['asha_worker', 'doctor', 'admin']}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
