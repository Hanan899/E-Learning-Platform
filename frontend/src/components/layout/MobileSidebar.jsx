import { Dialog, DialogPanel } from '@headlessui/react';
import {
  HiOutlineAcademicCap,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { navConfig } from './Sidebar';

function MobileSidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications({ limit: 1 });
  const navigation = navConfig[user?.role] || [];

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50 md:hidden">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="fixed inset-0 flex">
        <DialogPanel
          className="flex h-full w-80 max-w-[88vw] flex-col bg-slate-950 px-5 py-6 text-slate-100 shadow-xl"
          data-testid="mobile-sidebar"
        >
          <div className="mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                <HiOutlineAcademicCap className="text-2xl" />
              </div>
              <div>
                <p className="font-heading text-lg font-bold">EduFlow</p>
                <p className="text-sm text-slate-400">School learning OS</p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Close menu"
            >
              <HiOutlineXMark className="text-2xl" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex min-h-[44px] items-center gap-3 rounded-xl border-l-4 px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'border-primary bg-white/10 text-white'
                        : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className="text-lg" />
                  <span className="flex-1">{item.name}</span>
                  {item.name === 'Notifications' && unreadCount > 0 ? (
                    <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <p className="font-heading text-base text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="mt-1 capitalize text-slate-400">{user?.role || 'Guest'}</p>
            <button
              type="button"
              className="btn-secondary mt-4 w-full border-white/10 bg-transparent text-white hover:bg-white/10"
              onClick={() => {
                onClose();
                logout();
              }}
            >
              Log out
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default MobileSidebar;
