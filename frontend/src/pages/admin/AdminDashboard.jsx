import { useQuery } from '@tanstack/react-query';
import {
  HiOutlineBookOpen,
  HiOutlineClipboardDocumentList,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageLoader from '../../components/ui/PageLoader';
import { formatDate, getInitials } from '../../utils/formatters';

const fetchStats = async () => {
  const response = await axiosInstance.get('/admin/stats');
  return response.data.data;
};

const cardConfig = [
  {
    key: 'students',
    label: 'Total Students',
    color: 'from-emerald-100 to-emerald-50 text-emerald-600',
    icon: HiOutlineUserGroup,
  },
  {
    key: 'teachers',
    label: 'Total Teachers',
    color: 'from-sky-100 to-sky-50 text-sky-600',
    icon: HiOutlineSparkles,
  },
  {
    key: 'courses',
    label: 'Active Courses',
    color: 'from-primary/15 to-primary/5 text-primary',
    icon: HiOutlineBookOpen,
  },
  {
    key: 'enrollments',
    label: 'Total Enrollments',
    color: 'from-amber-100 to-amber-50 text-amber-600',
    icon: HiOutlineClipboardDocumentList,
  },
];

function AdminDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchStats,
  });

  const totals = {
    students: data?.totals.usersByRole.student ?? 0,
    teachers: data?.totals.usersByRole.teacher ?? 0,
    courses: data?.totals.totalCourses ?? 0,
    enrollments: data?.totals.totalEnrollments ?? 0,
  };

  return (
    <AppLayout title="Admin Dashboard">
      {isLoading ? <PageLoader label="Loading admin dashboard..." /> : null}
      {isError ? (
        <div className="mb-6">
          <ErrorAlert
            title="We could not load admin stats"
            message="Please refresh the page and try again."
          />
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cardConfig.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.key} className="card p-5">
              <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br p-3 ${card.color}`}>
                <Icon className="text-2xl" />
              </div>
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-2 font-heading text-3xl font-bold">
                {isLoading ? '--' : totals[card.key]}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <article className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Recent Signups</h2>
              <p className="mt-1 text-sm text-slate-500">
                New users created in the last 7 days.
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {data?.totals.recentSignups ?? 0} new
            </span>
          </div>

          {(data?.recentUsers || []).length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={HiOutlineUserGroup}
                title="No recent signups"
                description="New users created in the last seven days will appear here."
              />
            </div>
          ) : (
            <>
              <div className="mt-6 hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="pb-3 font-medium">User</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.recentUsers || []).map((user) => (
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
                              <p className="text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 capitalize text-slate-600">{user.role}</td>
                        <td className="py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 space-y-4 md:hidden">
                {(data?.recentUsers || []).map((user) => (
                  <article key={user.id} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 font-heading font-bold text-slate-700">
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="break-all text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                      <span className="capitalize">{user.role}</span>
                      <span>{formatDate(user.createdAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </article>

        <article className="card p-6">
          <h2 className="text-2xl font-bold">Quick Actions</h2>
          <p className="mt-2 text-sm text-slate-500">
            Jump to frequent admin tasks from one place.
          </p>

          <div className="mt-6 grid gap-3">
            <Link to="/admin/users" className="btn-primary">
              Manage users
            </Link>
            <Link to="/admin/reports" className="btn-secondary">
              Review reports
            </Link>
            <Link to="/admin/courses" className="btn-secondary">
              Audit course catalog
            </Link>
          </div>
        </article>
      </section>
    </AppLayout>
  );
}

export default AdminDashboard;
