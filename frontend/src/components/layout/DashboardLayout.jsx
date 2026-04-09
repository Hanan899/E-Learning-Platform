import Sidebar from './Sidebar';

function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-mesh-soft">
      <Sidebar />
      <main className="min-h-screen px-4 py-6 lg:ml-64 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

export default DashboardLayout;
