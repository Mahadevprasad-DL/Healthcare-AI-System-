import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart } from 'lucide-react';
import regImage from '../../images/reg.png';
import { getRoleHomeRoute } from '../lib/roleRoute';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => localStorage.getItem('healthsetu_auth_error') || '');
  const [loading, setLoading] = useState(false);
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const hasError = Boolean(error);

  useEffect(() => {
    const storedError = localStorage.getItem('healthsetu_auth_error');
    if (storedError) {
      setError(storedError);
      localStorage.removeItem('healthsetu_auth_error');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && profile) {
      navigate(getRoleHomeRoute(profile.role), { replace: true });
    }
  }, [authLoading, navigate, profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    localStorage.removeItem('healthsetu_auth_error');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 lg:bg-white">
      <div className="min-h-screen grid lg:grid-cols-2">
        <section className="relative hidden lg:block">
          <img
            src={regImage}
            alt="Healthcare team reviewing patient data"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/75 via-blue-900/40 to-cyan-500/30" />
          <div className="relative z-10 h-full flex items-end p-10">
            <div className="max-w-md text-white">
              <p className="text-xs tracking-[0.32em] uppercase text-cyan-200">HealthSetu</p>
              <h2 className="mt-3 text-4xl font-bold leading-tight">Healthcare AI System</h2>
              <p className="mt-4 text-cyan-50/90 leading-7">
                Intelligent case intake, AI-assisted screening, and coordinated care workflows in one place.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-4 sm:p-8 bg-slate-100">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-7 border border-slate-200">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3">
                <Heart className="w-7 h-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Healthcare AI System (HealthSetu)</h1>
              <p className="text-gray-600 mt-2">Sign in to your account</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    hasError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    hasError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Password"
                />
              </div>

              <button
                type="submit"
                disabled={loading || authLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || authLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  Register here
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
