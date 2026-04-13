import { Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';

export function Unauthorized() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-white/8 backdrop-blur-xl p-8 text-center shadow-2xl">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/15 border border-red-300/20 flex items-center justify-center mb-5">
          <Lock className="w-8 h-8 text-red-300" />
        </div>
        <p className="text-sm uppercase tracking-[0.3em] text-red-200/70">Access restricted</p>
        <h1 className="text-3xl font-semibold mt-3">You do not have access to this area.</h1>
        <p className="text-slate-300 mt-4 leading-7">
          Your current account role is not permitted to open this page. Go back to the dashboard
          or contact an administrator if you need additional permissions.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-slate-950 font-semibold hover:bg-cyan-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/15 text-white font-semibold hover:bg-white/8 transition"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}