import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import SubmitAssignmentModal from '../src/components/assignments/SubmitAssignmentModal';
import { AuthContext } from '../src/context/AuthContext';
import StudentAssignmentsPage from '../src/pages/student/StudentAssignmentsPage';

const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
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

const renderWithProviders = (ui) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/student/assignments']}>
        <AuthContext.Provider
          value={{
            user: { id: 'student-1', firstName: 'Amina', lastName: 'Student', role: 'student' },
            token: 'token',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            hasRole: (roles) => (Array.isArray(roles) ? roles.includes('student') : roles === 'student'),
          }}
        >
          {ui}
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );

const mockStudentAssignmentRequests = (assignments) => {
  mockedAxios.get.mockImplementation((url) => {
    if (url === '/courses') {
      return Promise.resolve({
        data: {
          data: {
            courses: [
              {
                id: 'course-1',
                title: 'Science',
                category: 'Science',
                isEnrolled: true,
              },
            ],
          },
        },
      });
    }

    if (url === '/courses/course-1/assignments') {
      return Promise.resolve({
        data: {
          data: {
            assignments,
          },
        },
      });
    }

    return Promise.reject(new Error(`Unhandled URL: ${url}`));
  });
};

describe('Assignments UI', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
  });

  test('pending assignments are sorted by due date', async () => {
    mockStudentAssignmentRequests([
      {
        id: 'assignment-1',
        title: 'Later task',
        description: 'Later',
        dueDate: '2026-04-20T10:00:00.000Z',
        maxScore: 100,
        mySubmission: null,
      },
      {
        id: 'assignment-2',
        title: 'Sooner task',
        description: 'Sooner',
        dueDate: '2026-04-12T10:00:00.000Z',
        maxScore: 100,
        mySubmission: null,
      },
    ]);

    renderWithProviders(<StudentAssignmentsPage />);

    const cards = await screen.findAllByTestId('assignment-card');
    expect(cards[0]).toHaveTextContent('Sooner task');
    expect(cards[1]).toHaveTextContent('Later task');
  });

  test('overdue assignments show red styling', async () => {
    mockStudentAssignmentRequests([
      {
        id: 'assignment-1',
        title: 'Missed deadline',
        description: 'Overdue',
        dueDate: '2026-04-01T10:00:00.000Z',
        maxScore: 100,
        mySubmission: null,
      },
    ]);

    renderWithProviders(<StudentAssignmentsPage />);

    const card = await screen.findByTestId('assignment-card');
    expect(card.className).toContain('border-danger');
  });

  test('submit confirmation dialog appears before submission', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());

    render(
      <SubmitAssignmentModal
        isOpen
        onClose={vi.fn()}
        assignment={{
          id: 'assignment-1',
          title: 'Essay',
          description: 'Write your response.',
        }}
        onSubmit={onSubmit}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /submit assignment/i }));

    expect(await screen.findByTestId('submit-confirmation')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('graded tab shows score and feedback', async () => {
    mockStudentAssignmentRequests([
      {
        id: 'assignment-1',
        title: 'Graded work',
        description: 'Done',
        dueDate: '2026-04-20T10:00:00.000Z',
        maxScore: 100,
        mySubmission: {
          id: 'submission-1',
          status: 'graded',
          score: 92,
          feedback: 'Excellent structure and explanation.',
          submittedAt: '2026-04-10T10:00:00.000Z',
        },
      },
    ]);

    renderWithProviders(<StudentAssignmentsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Graded' }));

    expect(await screen.findByTestId('graded-score')).toHaveTextContent('92');
    expect(screen.getByText('Excellent structure and explanation.')).toBeInTheDocument();
  });
});
