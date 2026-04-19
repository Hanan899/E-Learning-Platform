import {
  HiOutlineAcademicCap,
} from 'react-icons/hi2';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { getInitials } from '../../utils/formatters';
import { navConfig } from './navigation';

function SidebarToggleIcon({ isCollapsed }) {
  return (
    <span className="relative inline-flex h-[18px] w-[22px] items-center justify-center">
      <span className="absolute inset-0 rounded-[4px] border border-white/55" />
      <span
        className={`absolute top-[3px] h-[10px] w-[7px] rounded-[2px] bg-white/70 transition-all duration-200 ${
          isCollapsed ? 'left-[11px]' : 'left-[3px]'
        }`}
      />
      <span className="absolute left-1/2 top-[3px] h-[10px] w-px -translate-x-1/2 bg-white/35" />
    </span>
  );
}

function Sidebar({ isCollapsed = false, onToggle }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications({ limit: 1 });
  const navigation = navConfig[user?.role] || [];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-slate-950 px-4 py-6 text-slate-100 transition-all duration-300 md:flex ${
        isCollapsed ? 'w-24' : 'w-72'
      }`}
      data-testid="desktop-sidebar"
    >
      <div className={`mb-8 flex items-center ${isCollapsed ? 'flex-col gap-5' : 'justify-between gap-3'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <HiOutlineAcademicCap className="text-2xl" />
          </div>
          {isCollapsed ? null : (
            <div>
              <p className="font-heading text-lg font-bold">EduFlow</p>
              <p className="text-sm text-slate-400">School learning OS</p>
            </div>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/5 hover:text-white"
          onClick={onToggle}
          aria-label="Toggle sidebar"
        >
          <SidebarToggleIcon isCollapsed={isCollapsed} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.to}
              end={item.end}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `group relative flex min-h-[48px] items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                } ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  ) : null}
                  <Icon className="text-lg" />
                  {isCollapsed ? null : <span className="flex-1">{item.name}</span>}
                  {item.name === 'Notifications' && unreadCount > 0 ? (
                    isCollapsed ? (
                      <span className="absolute right-3 top-2 h-2.5 w-2.5 rounded-full bg-danger" />
                    ) : (
                      <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
                        {unreadCount}
                      </span>
                    )
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div
        className={`rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 ${
          isCollapsed ? 'px-3 py-4' : ''
        }`}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 font-heading font-bold text-white">
            {getInitials(user?.firstName, user?.lastName)}
          </div>
          {isCollapsed ? null : (
            <div className="min-w-0">
              <p className="truncate font-heading text-base text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="mt-1 capitalize text-slate-400">{user?.role || 'Guest'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
