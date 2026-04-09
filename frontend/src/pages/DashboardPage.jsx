import {
  HiArrowTrendingUp,
  HiOutlineBookOpen,
  HiOutlineClipboardDocumentList,
  HiOutlineUsers,
} from 'react-icons/hi2';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { formatDate, formatScore, truncate } from '../utils/formatters';

const stats = [
  {
    label: 'Active Courses',
    value: '12',
    icon: HiOutlineBookOpen,
    accent: 'from-primary/15 to-primary/5 text-primary',
  },
  {
    label: 'Enrolled Students',
    value: '284',
    icon: HiOutlineUsers,
    accent: 'from-accent/15 to-accent/5 text-accent',
  },
  {
    label: 'Assignments Due',
    value: '09',
    icon: HiOutlineClipboardDocumentList,
    accent: 'from-amber-100 to-amber-50 text-amber-600',
  },
];

const announcements = [
  {
    id: 1,
    title: 'Mid-term assessments open next week',
    message:
      'Teachers can now review the schedule window and publish assessment readiness updates for each cohort.',
    date: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Weekly progress snapshots available',
    message:
      'Student progress metrics now include lesson completion trends and assignment quality bands.',
    date: new Date(Date.now() - 86400000).toISOString(),
  },
];

function DashboardPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <section className="card overflow-hidden border-none bg-slate-950 p-8 text-white shadow-gentle">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-slate-200">
              School-focused learning operations
            </p>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-white">
              Welcome back, {user?.firstName || 'Learner'}.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-300">
              Keep courses, lessons, and progress moving with one shared classroom workspace for
              admins, teachers, and students.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Average performance</span>
              <HiArrowTrendingUp className="text-lg text-accent" />
            </div>
            <p className="mt-3 font-heading text-3xl font-bold text-white">{formatScore(91, 100)}</p>
            <p className="mt-2 text-sm text-slate-400">Based on the latest graded coursework.</p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article key={stat.label} className="card p-5">
              <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br p-3 ${stat.accent}`}>
                <Icon className="text-2xl" />
              </div>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-2 font-heading text-3xl font-bold">{stat.value}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Platform Highlights</h2>
              <p className="text-sm text-slate-500">A quick pulse on platform activity and updates.</p>
            </div>
            <button type="button" className="btn-secondary">
              View reports
            </button>
          </div>

          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-heading text-lg font-semibold">{announcement.title}</h3>
                  <span className="text-sm text-slate-400">{formatDate(announcement.date)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {truncate(announcement.message, 120)}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="card p-6">
          <h2 className="text-2xl font-bold">Access Snapshot</h2>
          <p className="mt-2 text-sm text-slate-500">
            The authentication layer is ready to keep role-based access organized from day one.
          </p>

          <dl className="mt-6 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-sm text-slate-500">Current role</dt>
              <dd className="mt-1 font-heading text-xl font-bold capitalize text-slate-900">
                {user?.role || 'Guest'}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-sm text-slate-500">Account email</dt>
              <dd className="mt-1 font-medium text-slate-800">{user?.email || 'Not signed in'}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-sm text-slate-500">Interface state</dt>
              <dd className="mt-1 font-medium text-slate-800">Ready for feature delivery</dd>
            </div>
          </dl>
        </article>
      </section>
    </DashboardLayout>
  );
}

export default DashboardPage;
