import {
  HiOutlineBell,
  HiOutlineBookOpen,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineHome,
  HiOutlineQuestionMarkCircle,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from 'react-icons/hi2';

export const navConfig = {
  admin: [
    { name: 'Dashboard', to: '/admin', icon: HiOutlineHome, end: true },
    { name: 'Notifications', to: '/notifications', icon: HiOutlineBell },
    { name: 'Users', to: '/admin/users', icon: HiOutlineUserGroup },
    { name: 'All Courses', to: '/admin/courses', icon: HiOutlineBookOpen },
    { name: 'Reports', to: '/admin/reports', icon: HiOutlineChartBar },
  ],
  teacher: [
    { name: 'Dashboard', to: '/teacher/dashboard', icon: HiOutlineHome, end: true },
    { name: 'Notifications', to: '/notifications', icon: HiOutlineBell },
    { name: 'My Courses', to: '/teacher/courses', icon: HiOutlineBookOpen },
    { name: 'Assignments', to: '/teacher/assignments', icon: HiOutlineClipboardDocumentList },
    { name: 'Quizzes', to: '/teacher/quizzes', icon: HiOutlineQuestionMarkCircle },
    { name: 'Grades', to: '/teacher/grading', icon: HiOutlineChartBar },
  ],
  student: [
    { name: 'Dashboard', to: '/student/dashboard', icon: HiOutlineHome, end: true },
    { name: 'Notifications', to: '/notifications', icon: HiOutlineBell },
    { name: 'My Courses', to: '/student/courses', icon: HiOutlineBookOpen },
    { name: 'Assignments', to: '/student/assignments', icon: HiOutlineClipboardDocumentList },
    { name: 'Quizzes', to: '/student/quizzes', icon: HiOutlineSparkles },
    { name: 'Progress', to: '/student/progress', icon: HiOutlineChartBar },
  ],
};
