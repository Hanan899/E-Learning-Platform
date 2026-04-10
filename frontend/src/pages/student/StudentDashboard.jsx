import AppLayout from '../../components/layout/AppLayout';

function StudentDashboard() {
  return (
    <AppLayout title="Student Dashboard">
      <div className="card p-6">
        <h2 className="text-2xl font-bold">Student workspace</h2>
        <p className="mt-2 text-slate-500">
          Browse the catalog, enroll in courses, and keep your lesson progress moving here.
        </p>
      </div>
    </AppLayout>
  );
}

export default StudentDashboard;
