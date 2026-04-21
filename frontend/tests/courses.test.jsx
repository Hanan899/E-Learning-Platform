import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthContext } from '../src/context/auth-context';
import CourseCatalogPage from '../src/pages/student/CourseCatalogPage';
import CourseViewPage from '../src/pages/student/CourseViewPage';
import CourseEditorPage from '../src/pages/teacher/CourseEditorPage';

const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  defaults: {
    baseURL: 'http://localhost:5001/api',
  },
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}));

vi.mock('../src/api/axios', () => ({
  default: mockedAxios,
}));

const createNotificationResponse = () => ({
  data: {
    data: {
      notifications: [],
      unreadCount: 0,
    },
    pagination: {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    },
  },
});

const setViewport = (width) => {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
};

const renderWithProviders = (ui, { role = 'student', route = '/' } = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
    {
      wrapper: ({ children }) => (
        <AuthContext.Provider
          value={{
            user: { id: 'user-1', firstName: 'Test', lastName: 'User', role },
            token: 'token',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            hasRole: (roles) =>
              Array.isArray(roles) ? roles.includes(role) : roles === role,
          }}
        >
          {children}
        </AuthContext.Provider>
      ),
    }
  );

describe('Course pages', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.delete.mockReset();
    setViewport(1280);
  });

  test('CourseCatalogPage renders course cards from API', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/courses') {
        return Promise.resolve({
          data: {
            data: {
              courses: [
                {
                  id: 'course-1',
                  title: 'Math Basics',
                  category: 'Math',
                  teacher: { fullName: 'Grace Teacher' },
                  lessonCount: 4,
                  isEnrolled: false,
                },
              ],
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderWithProviders(<CourseCatalogPage />);

    expect(await screen.findByText('Math Basics')).toBeInTheDocument();
    expect(screen.getAllByTestId('course-card')).toHaveLength(1);
  });

  test('Enroll button calls enroll API and updates UI', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/courses') {
        return Promise.resolve({
          data: {
            data: {
              courses: [
                {
                  id: 'course-1',
                  title: 'Physics',
                  category: 'Science',
                  teacher: { fullName: 'Grace Teacher' },
                  lessonCount: 5,
                  isEnrolled: false,
                },
              ],
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<CourseCatalogPage />);

    await userEvent.click(await screen.findByRole('button', { name: /enroll/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/courses/course-1/enroll');
    });
  });

  test('CourseEditorPage shows lesson list in sidebar', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/courses/course-1') {
        return Promise.resolve({
          data: {
            data: {
              course: {
                id: 'course-1',
                title: 'History',
                isPublished: false,
                sections: [
                  {
                    id: 'section-1',
                    title: 'Origins',
                    lessons: [
                      { id: 'lesson-1', title: 'Lesson A', content: 'Alpha', materials: [] },
                      { id: 'lesson-2', title: 'Lesson B', content: 'Beta', materials: [] },
                    ],
                  },
                ],
              },
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderWithProviders(
      <Routes>
        <Route path="/teacher/courses/:id/edit" element={<CourseEditorPage />} />
      </Routes>,
      { role: 'teacher', route: '/teacher/courses/course-1/edit' }
    );

    expect(await screen.findByText('Lesson A')).toBeInTheDocument();
    expect(screen.getByTestId('course-editor-sidebar')).toBeInTheDocument();
  });

  test('CourseEditorPage save details sends update request', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/courses/course-1') {
        return Promise.resolve({
          data: {
            data: {
              course: {
                id: 'course-1',
                title: 'History',
                description: 'Original description',
                category: 'History',
                isPublished: false,
                sections: [
                  {
                    id: 'section-1',
                    title: 'Origins',
                    lessons: [
                      { id: 'lesson-1', title: 'Lesson A', content: 'Alpha', materials: [] },
                    ],
                  },
                ],
                quizzes: [],
              },
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    mockedAxios.put.mockImplementation((url) => {
      if (url === '/courses/course-1') {
        return Promise.resolve({
          data: {
            data: {
              course: {
                id: 'course-1',
                title: 'Updated History',
                description: 'Original description',
                category: 'History',
                isPublished: false,
                sections: [
                  {
                    id: 'section-1',
                    title: 'Origins',
                    lessons: [
                      { id: 'lesson-1', title: 'Lesson A', content: 'Alpha', materials: [] },
                    ],
                  },
                ],
                quizzes: [],
              },
            },
          },
        });
      }

      return Promise.reject(new Error(`Unhandled PUT ${url}`));
    });

    renderWithProviders(
      <Routes>
        <Route path="/teacher/courses/:id/edit" element={<CourseEditorPage />} />
      </Routes>,
      { role: 'teacher', route: '/teacher/courses/course-1/edit' }
    );

    const titleInput = await screen.findByLabelText('Course title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Updated History');
    await userEvent.click(screen.getByRole('button', { name: /save details/i }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/courses/course-1', expect.any(FormData));
    });
  });

  test('CourseEditorPage can add a lesson when a new section has no lessons array yet', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/courses/course-1') {
        return Promise.resolve({
          data: {
            data: {
              course: {
                id: 'course-1',
                title: 'History',
                description: 'Original description',
                category: 'History',
                isPublished: false,
                sections: [
                  {
                    id: 'section-1',
                    title: 'Origins',
                  },
                ],
                quizzes: [],
              },
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    mockedAxios.post.mockImplementation((url) => {
      if (url === '/sections/section-1/lessons') {
        return Promise.resolve({
          data: {
            data: {
              lesson: {
                id: 'lesson-1',
                title: 'New Lesson 1',
                content: '',
                order: 1,
                sectionId: 'section-1',
                materials: [],
              },
            },
          },
        });
      }

      return Promise.reject(new Error(`Unhandled POST ${url}`));
    });

    renderWithProviders(
      <Routes>
        <Route path="/teacher/courses/:id/edit" element={<CourseEditorPage />} />
      </Routes>,
      { role: 'teacher', route: '/teacher/courses/course-1/edit' }
    );

    await screen.findByTestId('course-editor-sidebar');
    await userEvent.click(screen.getByRole('button', { name: /add lesson/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/sections/section-1/lessons', {
        title: 'New Lesson 1',
        content: '',
        order: 1,
      });
    });

    expect(screen.getByText(/select a lesson from the course outline/i)).toBeInTheDocument();
  });

  test('progress bar shows correct percentage', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/courses/course-1') {
        return Promise.resolve({
          data: {
            data: {
              course: {
                id: 'course-1',
                title: 'Biology',
                category: 'Science',
                teacher: { firstName: 'Grace', lastName: 'Teacher' },
                description: 'Course description',
                sections: [
                  {
                    id: 'section-1',
                    title: 'Cells',
                    lessons: [{ id: 'lesson-1', title: 'Cell Basics', content: 'Content', materials: [] }],
                  },
                ],
                studentProgress: {
                  completionPercentage: 75,
                  completedLessonIds: ['lesson-1'],
                },
              },
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderWithProviders(
      <Routes>
        <Route path="/student/courses/:id" element={<CourseViewPage />} />
      </Routes>,
      { role: 'student', route: '/student/courses/course-1' }
    );

    expect(await screen.findByTestId('progress-percentage')).toHaveTextContent('75%');
  });

  test('mobile course view opens lesson content after tapping a lesson in the outline', async () => {
    setViewport(480);

    mockedAxios.get.mockImplementation((url) => {
      if (url === '/courses/course-1') {
        return Promise.resolve({
          data: {
            data: {
              course: {
                id: 'course-1',
                title: 'Biology',
                category: 'Science',
                teacher: { firstName: 'Grace', lastName: 'Teacher' },
                description: 'Course description',
                sections: [
                  {
                    id: 'section-1',
                    title: 'Cells',
                    lessons: [
                      { id: 'lesson-1', title: 'Cell Basics', content: 'Cell lesson content', materials: [] },
                      { id: 'lesson-2', title: 'Cell Division', content: 'Division lesson content', materials: [] },
                    ],
                  },
                ],
                quizzes: [],
                studentProgress: {
                  completionPercentage: 25,
                  completedLessonIds: [],
                },
              },
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderWithProviders(
      <Routes>
        <Route path="/student/courses/:id" element={<CourseViewPage />} />
      </Routes>,
      { role: 'student', route: '/student/courses/course-1' }
    );

    expect(await screen.findByText(/click a lesson to open its content/i)).toBeInTheDocument();
    expect(screen.queryByText('Cell lesson content')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cell basics/i }));

    expect(await screen.findByRole('button', { name: /back to outline/i })).toBeInTheDocument();
    expect(screen.getByText('Cell lesson content')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /back to outline/i }));

    expect(await screen.findByText(/click a lesson to open its content/i)).toBeInTheDocument();
    expect(screen.queryByText('Cell lesson content')).not.toBeInTheDocument();
  });

  test('desktop course view opens lesson content after clicking a lesson in the outline', async () => {
    setViewport(1280);

    mockedAxios.get.mockImplementation((url) => {
      if (url === '/courses/course-1') {
        return Promise.resolve({
          data: {
            data: {
              course: {
                id: 'course-1',
                title: 'Biology',
                category: 'Science',
                teacher: { firstName: 'Grace', lastName: 'Teacher' },
                description: 'Course description',
                sections: [
                  {
                    id: 'section-1',
                    title: 'Cells',
                    lessons: [
                      { id: 'lesson-1', title: 'Cell Basics', content: 'Cell lesson content', materials: [] },
                      { id: 'lesson-2', title: 'Cell Division', content: 'Division lesson content', materials: [] },
                    ],
                  },
                ],
                quizzes: [],
                studentProgress: {
                  completionPercentage: 25,
                  completedLessonIds: [],
                },
              },
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderWithProviders(
      <Routes>
        <Route path="/student/courses/:id" element={<CourseViewPage />} />
      </Routes>,
      { role: 'student', route: '/student/courses/course-1' }
    );

    expect(await screen.findByText(/click a lesson to open its content/i)).toBeInTheDocument();
    expect(screen.queryByText('Cell lesson content')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cell basics/i }));

    expect(await screen.findByRole('button', { name: /back to outline/i })).toBeInTheDocument();
    expect(screen.getByText('Cell lesson content')).toBeInTheDocument();
  });

  test('CourseViewPage handles sections without lessons arrays safely', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/courses/course-1') {
        return Promise.resolve({
          data: {
            data: {
              course: {
                id: 'course-1',
                title: 'Biology',
                category: 'Science',
                teacher: { firstName: 'Grace', lastName: 'Teacher' },
                description: 'Course description',
                sections: [
                  {
                    id: 'section-1',
                    title: 'Cells',
                  },
                ],
                quizzes: [],
                studentProgress: {
                  completionPercentage: 0,
                  completedLessonIds: [],
                },
              },
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderWithProviders(
      <Routes>
        <Route path="/student/courses/:id" element={<CourseViewPage />} />
      </Routes>,
      { role: 'student', route: '/student/courses/course-1' }
    );

    expect(await screen.findByText(/click a lesson to open its content/i)).toBeInTheDocument();
    expect(screen.getByText('0 lessons')).toBeInTheDocument();
    expect(screen.queryByText('Cell lesson content')).not.toBeInTheDocument();
  });
});
