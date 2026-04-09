import AppLayout from '../../components/layout/AppLayout';

function ComingSoonPage({ title }) {
  return (
    <AppLayout title={title}>
      <div className="card p-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-slate-500">This section is reserved for the next task.</p>
      </div>
    </AppLayout>
  );
}

export default ComingSoonPage;
