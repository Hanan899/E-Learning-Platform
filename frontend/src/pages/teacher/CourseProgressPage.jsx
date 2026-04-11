import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiOutlineArrowDownTray, HiOutlineChevronUpDown } from 'react-icons/hi2';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageLoader from '../../components/ui/PageLoader';

const fetchCourseProgress = async (id) => {
  const response = await axiosInstance.get(`/courses/${id}/progress`);
  return response.data.data;
};

const sortRows = (rows, sortKey, sortDirection) => {
  const sorted = [...rows].sort((first, second) => {
    const firstValue =
      sortKey === 'student' ? first.student.fullName.toLowerCase() : Number(first[sortKey] || 0);
    const secondValue =
      sortKey === 'student' ? second.student.fullName.toLowerCase() : Number(second[sortKey] || 0);

    if (firstValue < secondValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }

    if (firstValue > secondValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }

    return 0;
  });

  return sorted;
};

const downloadCsv = (courseTitle, rows) => {
  const header = [
    'Student Name',
    'Completion Percentage',
    'Assignments Submitted',
    'Assignments Graded',
    'Assignment Average Score',
    'Quiz Average Score',
  ];

  const lines = rows.map((row) => [
    row.student.fullName,
    row.completionPercentage,
    row.assignmentsSubmitted,
    row.assignmentsGraded,
    row.assignmentAverageScore,
    row.quizAverageScore,
  ]);

  const csv = [header, ...lines]
    .map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${courseTitle.toLowerCase().replace(/\s+/g, '-')}-progress.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

function CourseProgressPage() {
  const { id } = useParams();
  const [sortKey, setSortKey] = useState('completionPercentage');
  const [sortDirection, setSortDirection] = useState('desc');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['teacher-course-progress', id],
    queryFn: () => fetchCourseProgress(id),
  });

  const rows = useMemo(
    () => sortRows(data?.students || [], sortKey, sortDirection),
    [data?.students, sortDirection, sortKey]
  );

  const handleSort = (nextKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === 'student' ? 'asc' : 'desc');
  };

  if (isLoading) {
    return (
      <AppLayout title="Course Progress">
        <PageLoader label="Loading course progress..." />
      </AppLayout>
    );
  }

  if (isError || !data) {
    return (
      <AppLayout title="Course Progress">
        <ErrorAlert
          title="We could not load course progress"
          message="Please refresh the page and try again."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Course Progress">
      <div className="space-y-6">
        <section className="card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-primary">Progress Overview</p>
              <h2 className="mt-2 text-3xl font-bold">{data.course.title}</h2>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => downloadCsv(data.course.title, rows)}
            >
              <HiOutlineArrowDownTray className="mr-2 text-lg" />
              Export CSV
            </button>
          </div>
        </section>

        <section className="card p-6">
          <h3 className="text-2xl font-bold">Student Progress Table</h3>
          {rows.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={HiOutlineChevronUpDown}
                title="No enrolled students yet"
                description="Student progress will appear here after enrollments begin."
              />
            </div>
          ) : (
            <>
              <div className="mt-6 hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 text-slate-400">
                    <tr>
                      {[
                        ['student', 'Student'],
                        ['completionPercentage', 'Completion'],
                        ['assignmentsSubmitted', 'Submitted'],
                        ['assignmentsGraded', 'Graded'],
                        ['assignmentAverageScore', 'Assignment Avg'],
                        ['quizAverageScore', 'Quiz Avg'],
                      ].map(([key, label]) => (
                        <th key={key} className="pb-3 font-medium">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-left"
                            onClick={() => handleSort(key)}
                          >
                            {label}
                            <HiOutlineChevronUpDown className="text-base" />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.student.id}>
                        <td className="py-4 font-medium text-slate-900">{row.student.fullName}</td>
                        <td className="py-4">
                          <div className="w-44">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{Math.round(row.completionPercentage)}%</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-slate-200">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${Math.min(row.completionPercentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-slate-600">{row.assignmentsSubmitted}</td>
                        <td className="py-4 text-slate-600">{row.assignmentsGraded}</td>
                        <td className="py-4 text-slate-600">{Math.round(row.assignmentAverageScore)}%</td>
                        <td className="py-4 text-slate-600">{Math.round(row.quizAverageScore)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 space-y-4 md:hidden">
                {rows.map((row) => (
                  <article key={row.student.id} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">{row.student.fullName}</p>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {Math.round(row.completionPercentage)}%
                      </span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.min(row.completionPercentage, 100)}%` }}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-500">
                      <span>Submitted: {row.assignmentsSubmitted}</span>
                      <span>Graded: {row.assignmentsGraded}</span>
                      <span>Assignment Avg: {Math.round(row.assignmentAverageScore)}%</span>
                      <span>Quiz Avg: {Math.round(row.quizAverageScore)}%</span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card p-6">
          <h3 className="text-2xl font-bold">Lesson Completion Rates</h3>
          {data.lessonCompletionRates.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={HiOutlineArrowDownTray}
                title="No lesson data yet"
                description="Completion rates will appear after students begin progressing through lessons."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {data.lessonCompletionRates.map((lesson) => (
                <article key={lesson.lessonId} className="rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-950">{lesson.title}</h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {lesson.completedCount} students completed this lesson
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      {Math.round(lesson.completionRate)}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${Math.min(lesson.completionRate, 100)}%` }}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

export default CourseProgressPage;
