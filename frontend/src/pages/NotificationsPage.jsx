import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineAcademicCap,
  HiOutlineExclamationTriangle,
  HiOutlineMegaphone,
  HiOutlineTrash,
  HiOutlineStar,
} from 'react-icons/hi2';
import AppLayout from '../components/layout/AppLayout';
import { useNotifications } from '../hooks/useNotifications';
import { formatRelativeTime } from '../utils/formatters';

const filterTabs = ['All', 'Unread', 'Grades', 'Assignments'];

const iconMap = {
  enrollment: HiOutlineAcademicCap,
  grade: HiOutlineStar,
  deadline: HiOutlineExclamationTriangle,
  announcement: HiOutlineMegaphone,
};

function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('All');
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotifications({ limit: 100 });

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'Unread') {
      return notifications.filter((notification) => !notification.isRead);
    }

    if (activeTab === 'Grades') {
      return notifications.filter((notification) => notification.type === 'grade');
    }

    if (activeTab === 'Assignments') {
      return notifications.filter((notification) => notification.type === 'deadline');
    }

    return notifications;
  }, [activeTab, notifications]);

  return (
    <AppLayout title="Notifications">
      <div className="space-y-6">
        <section className="card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Notification Center</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review grades, deadlines, announcements, and course activity in one place.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {unreadCount} unread
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={async () => {
                  try {
                    await markAllRead();
                    toast.success('All notifications marked as read');
                  } catch (_error) {
                    toast.error('Unable to mark notifications as read');
                  }
                }}
              >
                Mark all read
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        {isLoading ? (
          <div className="card p-10 text-center text-slate-500">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="card p-10 text-center text-slate-500">You&apos;re all caught up!</div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => {
              const Icon = iconMap[notification.type] || HiOutlineMegaphone;

              return (
                <article
                  key={notification.id}
                  className={`card p-5 ${notification.isRead ? '' : 'border-primary/20 bg-primary/5'}`}
                >
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <Icon className="text-2xl" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className={`text-base ${notification.isRead ? 'font-medium' : 'font-bold'}`}>
                            {notification.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {!notification.isRead ? (
                            <button
                              type="button"
                              className="text-sm font-medium text-primary hover:text-primary-hover"
                              onClick={async () => {
                                try {
                                  await markRead(notification.id);
                                } catch (_error) {
                                  toast.error('Unable to update notification');
                                }
                              }}
                            >
                              Mark read
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            onClick={async () => {
                              try {
                                await deleteNotification(notification.id);
                              } catch (_error) {
                                toast.error('Unable to delete notification');
                              }
                            }}
                          >
                            <HiOutlineTrash className="text-lg" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default NotificationsPage;
