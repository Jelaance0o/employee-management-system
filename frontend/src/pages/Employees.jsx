import Sidebar from "../components/dashboard/Sidebar";
import Navbar from "../components/dashboard/Navbar";

function Employees() {
  const employees = [
    {
      id: 1,
      name: "Rahul Sharma",
      email: "rahul@example.com",
      role: "Frontend Developer",
      status: "Active",
    },
    {
      id: 2,
      name: "Priya Verma",
      email: "priya@example.com",
      role: "Backend Developer",
      status: "Active",
    },
    {
      id: 3,
      name: "Aman Gupta",
      email: "aman@example.com",
      role: "UI/UX Designer",
      status: "Inactive",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#07080a] text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Navbar */}
        <Navbar />

        {/* Content */}
        <section className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Employees</h1>

              <p className="mt-1 text-sm text-white/40">
                Manage employees in your organization.
              </p>
            </div>

            <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90">
              + Add Employee
            </button>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0c0f]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-white/10">
                  <tr className="text-xs text-white/40">
                    <th className="px-5 py-4 font-medium">Employee</th>

                    <th className="px-5 py-4 font-medium">Role</th>

                    <th className="px-5 py-4 font-medium">Status</th>

                    <th className="px-5 py-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="transition hover:bg-white/[0.02]"
                    >
                      {/* Employee */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
                            {employee.name.charAt(0)}
                          </div>

                          <div>
                            <p className="text-sm font-medium">
                              {employee.name}
                            </p>

                            <p className="text-xs text-white/40">
                              {employee.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4 text-sm text-white/60">
                        {employee.role}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            employee.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          {employee.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        <button className="text-sm text-white/50 transition hover:text-white">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Employees;
