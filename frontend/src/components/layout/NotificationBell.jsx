import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { HiOutlineBell } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationPanel from '../notifications/NotificationPanel';

function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
  } = useNotifications({ limit: 8 });

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <PopoverButton
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
            aria-label="Open notifications"
          >
            <HiOutlineBell className="text-xl" />
            {unreadCount > 0 ? (
              <span
                className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-danger px-1.5 py-0.5 text-xs font-semibold text-white"
                data-testid="notification-badge"
              >
                {unreadCount}
              </span>
            ) : null}
          </PopoverButton>

          <PopoverPanel anchor="bottom end" className="z-30 mt-3 focus:outline-none">
            <NotificationPanel
              notifications={notifications}
              onMarkRead={async (notificationId) => {
                try {
                  await markRead(notificationId);
                } catch (_error) {
                  toast.error('Unable to update notification');
                }
              }}
              onMarkAllRead={async () => {
                try {
                  await markAllRead();
                } catch (_error) {
                  toast.error('Unable to mark notifications as read');
                }
              }}
              onClose={close}
            />
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}

export default NotificationBell;
