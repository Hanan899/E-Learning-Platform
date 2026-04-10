import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { HiEllipsisHorizontal, HiOutlineMagnifyingGlass, HiOutlineUsers } from 'react-icons/hi2';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';
import { getInitials, formatDate } from '../../utils/formatters';

const roleBadgeMap = {
  admin: 'bg-fuchsia-100 text-fuchsia-700',
  teacher: 'bg-sky-100 text-sky-700',
  student: 'bg-emerald-100 text-emerald-700',
};

const fetchUsers = async ({ queryKey }) => {
  const [, params] = queryKey;
  const normalizedParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );
  const response = await axiosInstance.get('/admin/users', { params: normalizedParams });
  return response.data;
};

function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-users', { page, limit, role, search: debouncedSearch }],
    queryFn: fetchUsers,
  });

  const users = data?.data.users || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const handleRoleChange = async (userId, nextRole) => {
    await axiosInstance.put(`/admin/users/${userId}/role`, { role: nextRole });
    invalidateUsers();
  };

  const handleToggleStatus = async (userId) => {
    await axiosInstance.put(`/admin/users/${userId}/status`);
    invalidateUsers();
  };

  return (
    <AppLayout title="User Management">
      <section className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HiOutlineUsers className="text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">User Management</h2>
              <p className="mt-1 text-sm text-slate-500">Review roles, status, and sign-up activity.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {pagination.total}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <label className="relative block">
              <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input pl-11"
                placeholder="Search users..."
              />
            </label>
            <select value={role} onChange={(event) => setRole(event.target.value)} className="input">
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-500">Loading users...</div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <HiOutlineUsers className="text-4xl" />
            </div>
            <h3 className="mt-6 text-xl font-bold">We could not load users</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              {error?.response?.data?.message || 'Please refresh the page and try again.'}
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <HiOutlineUsers className="text-4xl" />
            </div>
            <h3 className="mt-6 text-xl font-bold">No users match this filter</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Try changing the search phrase or role filter to widen the results.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-slate-400">
                  <tr>
                    <th className="pb-3 font-medium">Avatar + Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Joined date</th>
                    <th className="pb-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 font-heading font-bold text-slate-700">
                            {getInitials(user.firstName, user.lastName)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {user.firstName} {user.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-slate-600">{user.email}</td>
                      <td className="py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${roleBadgeMap[user.role]}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center gap-2 text-slate-600">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              user.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={user.role}
                            onChange={(event) => handleRoleChange(user.id, event.target.value)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            <option value="admin">Admin</option>
                            <option value="teacher">Teacher</option>
                            <option value="student">Student</option>
                          </select>
                          <button
                            type="button"
                            className="btn-secondary px-4"
                            onClick={() => handleToggleStatus(user.id)}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200"
                          >
                            <HiEllipsisHorizontal className="text-xl text-slate-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary px-4"
                  disabled={page === 1}
                  onClick={() => setPage((value) => Math.max(value - 1, 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-secondary px-4"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </AppLayout>
  );
}

export default UsersPage;
