import {
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineChartBar,
  HiOutlineHome,
} from 'react-icons/hi2';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const navigation = [
  { name: 'Dashboard', to: '/', icon: HiOutlineHome },
  { name: 'Courses', to: '/', icon: HiOutlineBookOpen },
  { name: 'Analytics', to: '/', icon: HiOutlineChartBar },
];

function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-slate-950 px-5 py-6 text-slate-100 lg:flex">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <HiOutlineAcademicCap className="text-2xl" />
        </div>
        <div>
          <p className="font-heading text-lg font-bold">LearnSphere</p>
          <p className="text-sm text-slate-400">School portal</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="text-lg" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="card border-white/5 bg-white/5 p-4 text-sm text-slate-200 shadow-none">
        <p className="font-heading text-base text-white">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="mt-1 capitalize text-slate-400">{user?.role || 'Guest'}</p>
        <button
          type="button"
          className="btn-secondary mt-4 w-full border-white/10 bg-transparent text-white hover:bg-white/10"
          onClick={logout}
        >
          Log out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
