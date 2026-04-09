import AppLayout from '../../components/layout/AppLayout';

function TeacherDashboard() {
  return (
    <AppLayout title="Teacher Dashboard">
      <div className="card p-6">
        <h2 className="text-2xl font-bold">Teacher workspace</h2>
        <p className="mt-2 text-slate-500">
          Course authoring, assignments, and grading tools will land here next.
        </p>
      </div>
    </AppLayout>
  );
}

export default TeacherDashboard;
