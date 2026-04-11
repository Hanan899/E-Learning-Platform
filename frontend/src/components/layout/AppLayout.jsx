import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { HiChevronDown } from 'react-icons/hi2';
import NotificationBell from './NotificationBell';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/formatters';
import Sidebar from './Sidebar';

function AppLayout({ title, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-mesh-soft">
      <Sidebar />
      <div className="lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">
                EduFlow
              </p>
              <h1 className="mt-1 text-2xl font-bold">{title}</h1>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />

              <Menu as="div" className="relative">
                <MenuButton className="inline-flex min-h-[44px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 font-heading font-bold text-primary">
                    {getInitials(user?.firstName, user?.lastName)}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-sm font-semibold text-slate-900">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="block text-xs capitalize text-slate-500">{user?.role}</span>
                  </span>
                  <HiChevronDown className="text-slate-400" />
                </MenuButton>

                <MenuItems
                  anchor="bottom end"
                  className="mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg focus:outline-none"
                >
                  <MenuItem>
                    <button
                      type="button"
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onClick={logout}
                    >
                      Sign out
                    </button>
                  </MenuItem>
                </MenuItems>
              </Menu>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
