import {
  HiOutlineAcademicCap,
  HiOutlineExclamationTriangle,
  HiOutlineMegaphone,
  HiOutlineSparkles,
  HiOutlineStar,
} from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeTime } from '../../utils/formatters';

const iconMap = {
  enrollment: HiOutlineAcademicCap,
  grade: HiOutlineStar,
  deadline: HiOutlineExclamationTriangle,
  announcement: HiOutlineMegaphone,
};

const getNotificationTarget = (notification, role) => {
  if (notification.type === 'grade' || notification.type === 'deadline') {
    return role === 'teacher' ? '/teacher/assignments' : '/student/assignments';
  }

  if (notification.type === 'enrollment') {
    return role === 'student' ? '/student/courses' : '/teacher/courses';
  }

  if (notification.type === 'announcement') {
    if (role === 'student') {
      return '/student/quizzes';
    }

    if (role === 'teacher') {
      return '/teacher/dashboard';
    }
  }

  return '/notifications';
};

function NotificationPanel({ notifications, onMarkRead, onMarkAllRead, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = async (notification) => {
    if (!notification.isRead) {
      await onMarkRead(notification.id);
    }

    onClose?.();
    navigate(getNotificationTarget(notification, user?.role));
  };

  return (
    <div className="w-[360px] rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <h3 className="text-lg font-bold text-slate-950">Notifications</h3>
        <button
          type="button"
          className="text-sm font-medium text-primary hover:text-primary-hover"
          onClick={() => onMarkAllRead()}
        >
          Mark all read
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HiOutlineSparkles className="text-2xl" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-900">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="mt-3 max-h-[400px] space-y-3 overflow-y-auto pr-1">
          {notifications.map((notification) => {
            const Icon = iconMap[notification.type] || HiOutlineMegaphone;

            return (
              <button
                key={notification.id}
                type="button"
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  notification.isRead
                    ? 'border-slate-100 bg-white hover:bg-slate-50'
                    : 'border-primary/10 bg-primary/5 hover:bg-primary/10'
                }`}
                onClick={() => handleClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                    <Icon className="text-xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm ${notification.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-950'}`}>
                        {notification.title}
                      </p>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
