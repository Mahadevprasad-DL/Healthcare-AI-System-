import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart } from 'lucide-react';
import { UserRole } from '../lib/supabase';
import regImage from '../../images/reg.png';
import { getRoleHomeRoute } from '../lib/roleRoute';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [village, setVillage] = useState('');
  const [role, setRole] = useState<UserRole>('villager');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const hasError = Boolean(error);

  useEffect(() => {
    if (!authLoading && user && profile) {
      navigate(getRoleHomeRoute(profile.role), { replace: true });
    }
  }, [authLoading, navigate, profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const { error } = await signUp(email, password, {
      full_name: fullName,
      role,
      phone_number: phoneNumber,
      village,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccessMessage('Registered successfully. Redirecting to login...');
      setLoading(false);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
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
              <p className="text-gray-600 mt-2">Create your account</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    hasError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Name"
                />
              </div>

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
                  minLength={6}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    hasError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Password"
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    hasError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label htmlFor="village" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Village/Location
                </label>
                <input
                  id="village"
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    hasError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Village"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    hasError ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="villager">Villager (Patient)</option>
                  <option value="asha_worker">ASHA Worker</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || authLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || authLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
