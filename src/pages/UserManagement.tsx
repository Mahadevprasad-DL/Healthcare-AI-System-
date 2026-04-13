import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { apiRequest } from '../lib/api';
import { Users, UserPlus, Shield, X, Clock3, Ban, CheckCircle2, Save } from 'lucide-react';

interface UserRecord {
  id: string;
  full_name: string;
  role: string;
  phone_number: string | null;
  village: string | null;
  created_at: string;
  updated_at: string;
  blocked_until: string | null;
  blocked_reason: string | null;
  blocked_at: string | null;
  is_blocked: boolean;
}

interface UserFormState {
  full_name: string;
  role: string;
  phone_number: string;
  village: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<UserFormState>({
    full_name: '',
    role: 'villager',
    phone_number: '',
    village: '',
  });
  const [blockDays, setBlockDays] = useState('7');
  const [blockReason, setBlockReason] = useState('Your access is blocked by admin. Please contact the administrator.');
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const payload = await apiRequest<{ users: UserRecord[] }>(`/users?role=${filter}`);
      setUsers(payload.users || []);

      if (selectedUser) {
        const refreshedSelected = payload.users?.find((user) => user.id === selectedUser.id) || null;
        if (refreshedSelected) {
          setSelectedUser(refreshedSelected);
          setForm({
            full_name: refreshedSelected.full_name || '',
            role: refreshedSelected.role || 'villager',
            phone_number: refreshedSelected.phone_number || '',
            village: refreshedSelected.village || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      villager: 'bg-blue-100 text-blue-800',
      asha_worker: 'bg-green-100 text-green-800',
      doctor: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const openUserCard = (user: UserRecord) => {
    setSelectedUser(user);
    setForm({
      full_name: user.full_name || '',
      role: user.role || 'villager',
      phone_number: user.phone_number || '',
      village: user.village || '',
    });
    setBlockDays('7');
    setBlockReason(
      user.blocked_reason || 'Your access is blocked by admin. Please contact the administrator.'
    );
    setNotice('');
    setNoticeType('');
  };

  const saveUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    setNotice('');
    try {
      const payload = await apiRequest<{ user: UserRecord }>(`/users/${selectedUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: form.full_name,
          role: form.role,
          phone_number: form.phone_number,
          village: form.village,
        }),
      });

      setNotice('User details updated successfully.');
      setNoticeType('success');
      setSelectedUser(payload.user);
      await fetchUsers();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to update user.');
      setNoticeType('error');
    } finally {
      setActionLoading(false);
    }
  };

  const blockUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    setNotice('');
    try {
      const payload = await apiRequest<{ user: UserRecord; message: string }>(`/users/${selectedUser.id}/block`, {
        method: 'POST',
        body: JSON.stringify({
          days: Number(blockDays),
          reason: blockReason,
        }),
      });

      const message = payload.message || 'User blocked successfully.';
      setNotice(message);
      setNoticeType('success');
      setSelectedUser(payload.user);
      await fetchUsers();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to block user.');
      setNoticeType('error');
    } finally {
      setActionLoading(false);
    }
  };

  const unblockUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    setNotice('');
    try {
      const payload = await apiRequest<{ user: UserRecord; message: string }>(`/users/${selectedUser.id}/unblock`, {
        method: 'POST',
      });

      const message = payload.message || 'User unblocked successfully.';
      setNotice(message);
      setNoticeType('success');
      setSelectedUser(payload.user);
      await fetchUsers();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to unblock user.');
      setNoticeType('error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage system users and their roles</p>
          </div>
          <button type="button" className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto">
          {['all', 'villager', 'asha_worker', 'doctor', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => setFilter(role)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                filter === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {role === 'all' ? 'All Users' : role.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {selectedUser && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Selected User</h2>
                <p className="text-gray-600 mt-1">Edit details or block access from this card.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close selected user card"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                    {(selectedUser.full_name || 'U').trim().charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-gray-900">{selectedUser.full_name}</p>
                    <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(selectedUser.role)}`}>
                      {selectedUser.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">Full Name</span>
                    <input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">Role</span>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="villager">Villager</option>
                      <option value="asha_worker">ASHA Worker</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">Phone</span>
                    <input
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-2">Village</span>
                    <input
                      value={form.village}
                      onChange={(e) => setForm({ ...form, village: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveUser}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={unblockUser}
                    disabled={actionLoading || !selectedUser.is_blocked}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Unblock
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5 rounded-xl border border-red-100 bg-red-50/50">
                <div className="flex items-center gap-2 text-red-700 font-semibold">
                  <Ban className="w-5 h-5" />
                  Block Access
                </div>

                <div className="text-sm text-gray-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock3 className="w-4 h-4 text-gray-500" />
                    <span>
                      Status: <strong>{selectedUser.is_blocked ? 'Blocked' : 'Active'}</strong>
                    </span>
                  </div>
                  <p>
                    Block until:{' '}
                    {selectedUser.blocked_until ? new Date(selectedUser.blocked_until).toLocaleString() : 'Not blocked'}
                  </p>
                  <p>Reason: {selectedUser.blocked_reason || 'No reason set'}</p>
                </div>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Block for days</span>
                  <input
                    type="number"
                    min="1"
                    value={blockDays}
                    onChange={(e) => setBlockDays(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-2">Block reason</span>
                  <textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter a reason the user can see on login"
                  />
                </label>

                <button
                  type="button"
                  onClick={blockUser}
                  disabled={actionLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  Block User
                </button>
              </div>
            </div>

            {notice && (
              <div
                className={`mt-4 rounded-lg border px-4 py-3 text-sm font-medium ${
                  noticeType === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : noticeType === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                {notice}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">There are no users matching your current filter.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Phone</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Village</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Joined</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {(user.full_name || 'U').trim().charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                        >
                          {user.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.phone_number || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.village || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openUserCard(user)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total Users</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{users.length}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-2">
              <Users className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">ASHA Workers</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {users.filter((u) => u.role === 'asha_worker').length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Doctors</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {users.filter((u) => u.role === 'doctor').length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Patients</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {users.filter((u) => u.role === 'villager').length}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
