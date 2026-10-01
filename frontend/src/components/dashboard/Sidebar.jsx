import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-white/10 bg-[#0b0c0f] p-5 text-white">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-bold text-black">
          E
        </div>

        <span className="font-semibold tracking-tight">EmployeeOS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        <NavLink
          to="/admin"
          className="block rounded-lg px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/admin/employees"
          className="block rounded-lg px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
        >
          Employees
        </NavLink>

        <NavLink
          to="/admin/tasks"
          className="block rounded-lg px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
        >
          Tasks
        </NavLink>

        <NavLink
          to="/admin/settings"
          className="block rounded-lg px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
        >
          Settings
        </NavLink>
      </nav>

      {/* User */}
      <div className="border-t border-white/10 pt-4">
        <div className="mb-4">
          <p className="truncate text-sm font-medium">{user?.name}</p>

          <p className="truncate text-xs text-white/40">{user?.email}</p>
        </div>

        <button
          onClick={logout}
          className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
