import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', roles: ['villager', 'asha_worker', 'doctor', 'admin'] },
    { name: 'Create Case', path: '/create-case', roles: ['villager'] },
    { name: 'My Cases', path: '/my-cases', roles: ['villager'] },
    { name: 'All Cases', path: '/cases', roles: ['asha_worker', 'doctor', 'admin'] },
    { name: 'Diagnosis', path: '/ai-prediction', roles: ['villager', 'asha_worker', 'admin'] },
    { name: 'Decision Engine', path: '/decision-engine', roles: ['asha_worker', 'admin'] },
    { name: 'Progress Tracking', path: '/progress', roles: ['villager', 'asha_worker'] },
    { name: 'Alerts', path: '/alerts', roles: ['villager', 'asha_worker', 'doctor', 'admin'] },
    { name: 'Reports', path: '/reports', roles: ['asha_worker', 'doctor', 'admin'] },
    { name: 'User Management', path: '/users', roles: ['admin'] },
    { name: 'Settings', path: '/settings', roles: ['villager', 'asha_worker', 'doctor', 'admin'] },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(profile?.role || 'villager')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-gray-900 sm:text-lg">Healthcare AI System (HealthSetu)</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="hidden lg:flex items-center px-6 py-6 border-b border-gray-200">
            <span className="text-2xl font-bold text-gray-900 leading-tight">Healthcare AI System (HealthSetu)</span>
          </div>

          <div className="flex-1 overflow-y-auto py-6">
            <nav className="space-y-2 px-4">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-4 py-4 rounded-xl text-lg font-semibold transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="mb-4 px-3">
              <p className="text-lg font-semibold text-gray-900">{profile?.full_name}</p>
              <p className="text-base text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-3 rounded-lg text-lg font-semibold text-red-600 hover:bg-red-50 transition"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:pl-80">
        <div className="lg:hidden h-16" />
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
