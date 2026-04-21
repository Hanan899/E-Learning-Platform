import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthContext } from '../src/context/auth-context';
import QuizPage from '../src/pages/student/QuizPage';
import QuizBuilderPage from '../src/pages/teacher/QuizBuilderPage';

const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
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

const quizPayload = {
  data: {
    data: {
      quiz: {
        id: 'quiz-1',
        title: 'Chapter Quiz',
        courseId: 'course-1',
        course: { id: 'course-1', title: 'Science' },
        timeLimit: 1,
        questions: [
          {
            id: 'question-1',
            text: 'What is a cell?',
            options: [
              { id: 'a', text: 'A planet' },
              { id: 'b', text: 'The basic unit of life' },
              { id: 'c', text: 'A type of rock' },
              { id: 'd', text: 'A machine' },
            ],
            points: 5,
            order: 1,
          },
          {
            id: 'question-2',
            text: 'Which part controls the cell?',
            options: [
              { id: 'a', text: 'Nucleus' },
              { id: 'b', text: 'Membrane' },
              { id: 'c', text: 'Wall' },
              { id: 'd', text: 'Cytoplasm' },
            ],
            points: 5,
            order: 2,
          },
        ],
      },
      attemptResult: null,
    },
  },
};

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

const renderQuizPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/student/quizzes/quiz-1']}>
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
          <Routes>
            <Route path="/student/quizzes/:id" element={<QuizPage />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('QuizPage', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.put.mockReset();
    vi.useRealTimers();
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/quizzes/quiz-1') {
        return Promise.resolve(quizPayload);
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('QuizPage shows pre-quiz screen initially', async () => {
    renderQuizPage();

    expect(await screen.findByTestId('pre-quiz-screen')).toBeInTheDocument();
    expect(screen.getByText('Chapter Quiz')).toBeInTheDocument();
  });

  test('selecting answer highlights card and enables Next', async () => {
    renderQuizPage();

    await userEvent.click(await screen.findByRole('button', { name: /start quiz/i }));

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();

    await userEvent.click(screen.getByTestId('option-card-b'));

    expect(screen.getByTestId('option-card-b').className).toContain('border-primary');
    expect(nextButton).not.toBeDisabled();
  });

  test('timer counts down and turns red below 60 seconds', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/quizzes/quiz-1') {
        return Promise.resolve({
          data: {
            data: {
              quiz: {
                ...quizPayload.data.data.quiz,
                timeLimit: 0.5,
              },
              attemptResult: null,
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

    renderQuizPage();

    await userEvent.click(await screen.findByRole('button', { name: /start quiz/i }));

    await waitFor(() => {
      expect(screen.getByTestId('quiz-timer').className).toContain('bg-danger');
    });
  });

  test('results screen shows score with correct color (green ≥60)', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: {
          attempt: {
            score: 100,
            correctCount: 2,
            questionCount: 2,
            breakdown: [
              {
                questionId: 'question-1',
                text: 'What is a cell?',
                selectedOption: 'b',
                correctOption: 'b',
                isCorrect: true,
              },
              {
                questionId: 'question-2',
                text: 'Which part controls the cell?',
                selectedOption: 'a',
                correctOption: 'a',
                isCorrect: true,
              },
            ],
          },
        },
      },
    });

    renderQuizPage();

    await userEvent.click(await screen.findByRole('button', { name: /start quiz/i }));
    await userEvent.click(screen.getByTestId('option-card-b'));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByTestId('option-card-a'));
    await userEvent.click(screen.getByRole('button', { name: /submit quiz/i }));

    expect(await screen.findByTestId('score-circle')).toHaveTextContent('100%');
    expect(screen.getByTestId('score-circle').className).toContain('bg-emerald-500');
  });
});

describe('QuizBuilderPage', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/quizzes/quiz-1') {
        return Promise.resolve({
          data: {
            data: {
              quiz: {
                id: 'quiz-1',
                title: 'Teacher Preview Quiz',
                courseId: 'course-1',
                course: { id: 'course-1', title: 'Science' },
                timeLimit: 10,
                questions: [
                  {
                    id: 'question-1',
                    text: 'First question text',
                    options: [
                      { id: 'a', text: 'A1' },
                      { id: 'b', text: 'B1' },
                      { id: 'c', text: 'C1' },
                      { id: 'd', text: 'D1' },
                    ],
                    points: 5,
                    order: 1,
                    correctOption: 'a',
                  },
                  {
                    id: 'question-2',
                    text: 'Second question text',
                    options: [
                      { id: 'a', text: 'A2' },
                      { id: 'b', text: 'B2' },
                      { id: 'c', text: 'C2' },
                      { id: 'd', text: 'D2' },
                    ],
                    points: 5,
                    order: 2,
                    correctOption: 'b',
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
  });

  test('preview shows the full quiz, not only the first question', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/teacher/quizzes/quiz-1/build']}>
          <AuthContext.Provider
            value={{
              user: { id: 'teacher-1', firstName: 'Grace', lastName: 'Teacher', role: 'teacher' },
              token: 'token',
              isAuthenticated: true,
              isLoading: false,
              login: vi.fn(),
              register: vi.fn(),
              logout: vi.fn(),
              hasRole: (roles) => (Array.isArray(roles) ? roles.includes('teacher') : roles === 'teacher'),
            }}
          >
            <Routes>
              <Route path="/teacher/quizzes/:id/build" element={<QuizBuilderPage />} />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await userEvent.click(await screen.findByRole('button', { name: /preview quiz/i }));

    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText('First question text')).toBeInTheDocument();
    expect(within(modal).getByText('Second question text')).toBeInTheDocument();
  });

  test('can add the first question without crashing when the quiz starts empty', async () => {
    let quizFetchCount = 0;

    mockedAxios.get.mockImplementation((url) => {
      if (url === '/quizzes/quiz-1') {
        quizFetchCount += 1;

        return Promise.resolve({
          data: {
            data: {
              quiz: {
                id: 'quiz-1',
                title: 'Empty Quiz',
                courseId: 'course-1',
                course: { id: 'course-1', title: 'Science' },
                timeLimit: 10,
                questions:
                  quizFetchCount === 1
                    ? []
                    : [
                        {
                          id: 'question-1',
                          text: 'New question',
                          options: [
                            { id: 'a', text: 'Option A' },
                            { id: 'b', text: 'Option B' },
                            { id: 'c', text: 'Option C' },
                            { id: 'd', text: 'Option D' },
                          ],
                          correctOption: 'a',
                          points: 1,
                          order: 1,
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

    mockedAxios.post.mockImplementation((url) => {
      if (url === '/quizzes/quiz-1/questions') {
        return Promise.resolve({
          data: {
            data: {
              question: {
                id: 'question-1',
                text: 'New question',
                options: [
                  { id: 'a', text: 'Option A' },
                  { id: 'b', text: 'Option B' },
                  { id: 'c', text: 'Option C' },
                  { id: 'd', text: 'Option D' },
                ],
                correctOption: 'a',
                points: 1,
                order: 1,
              },
            },
          },
        });
      }

      return Promise.reject(new Error(`Unhandled POST ${url}`));
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/teacher/quizzes/quiz-1/build']}>
          <AuthContext.Provider
            value={{
              user: { id: 'teacher-1', firstName: 'Grace', lastName: 'Teacher', role: 'teacher' },
              token: 'token',
              isAuthenticated: true,
              isLoading: false,
              login: vi.fn(),
              register: vi.fn(),
              logout: vi.fn(),
              hasRole: (roles) => (Array.isArray(roles) ? roles.includes('teacher') : roles === 'teacher'),
            }}
          >
            <Routes>
              <Route path="/teacher/quizzes/:id/build" element={<QuizBuilderPage />} />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await userEvent.click(await screen.findByRole('button', { name: /add question/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/quizzes/quiz-1/questions', {
        text: 'New question',
        options: [
          { id: 'a', text: 'Option A' },
          { id: 'b', text: 'Option B' },
          { id: 'c', text: 'Option C' },
          { id: 'd', text: 'Option D' },
        ],
        correctOption: 'a',
        points: 1,
        order: 1,
      });
    });

    expect(await screen.findByDisplayValue('New question')).toBeInTheDocument();
  });
});
