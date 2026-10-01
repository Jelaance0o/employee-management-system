import Sidebar from "../components/dashboard/Sidebar";
import Navbar from "../components/dashboard/Navbar";
import StatCard from "../components/dashboard/StatCard";
import RecentActivity from "../components/dashboard/RecentActivity";

function AdminDashboard() {
  return (
    <div className="flex min-h-screen bg-[#07080a] text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Navbar */}
        <Navbar />

        {/* Dashboard Content */}
        <section className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Overview</h2>

            <p className="mt-1 text-sm text-white/40">
              Here's what's happening with your organization.
            </p>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Employees"
              value="124"
              description="Employees registered"
            />

            <StatCard
              title="Active Employees"
              value="118"
              description="Currently active"
            />

            <StatCard
              title="Total Tasks"
              value="86"
              description="Tasks created"
            />

            <StatCard
              title="Pending Tasks"
              value="12"
              description="Tasks need attention"
            />
          </div>
          <RecentActivity />    
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
