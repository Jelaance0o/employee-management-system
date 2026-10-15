import { useEffect, useState } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  FolderKanban,
  LogOut,
  Menu,
  Users,
  X,
  CheckSquare,
  LayoutDashboard,
} from "lucide-react";
import ThemeSelector from "../ThemeSelector";
import api, { getApiUrl } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProject {
  id: number;
  name: string;
}
interface SidebarTask {
  id: number;
  project_id: number;
  title: string;
  status: string;
  priority: string;
}

type NavigationItem = {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles: string[];
};

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "project_manager", "employee"],
  },
  {
    label: "Team Members",
    path: "/team",
    icon: Users,
    roles: ["admin"],
  },
  {
    label: "Projects",
    path: "/projects",
    icon: FolderKanban,
    roles: ["admin", "project_manager", "employee"],
  },
  {
    label: "Tasks",
    path: "/tasks",
    icon: CheckSquare,
    roles: ["admin", "project_manager", "employee"],
  },
];

export default function WorkspaceLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarProjects, setSidebarProjects] = useState<SidebarProject[]>([]);
  const [sidebarTasks, setSidebarTasks] = useState<SidebarTask[]>([]);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<number>>(
    new Set(),
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user) {
      setSidebarProjects([]);
      setSidebarTasks([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      api
        .get<SidebarProject[]>("/api/v1/projects", {
          params: { limit: 100, offset: 0 },
        })
        .then((response) => response.data)
        .catch(() => [] as SidebarProject[]),
      api
        .get<SidebarTask[]>("/api/v1/tasks", {
          params: { limit: 100, offset: 0 },
        })
        .then((response) => response.data)
        .catch(() => [] as SidebarTask[]),
    ]).then(([projects, tasks]) => {
      if (!cancelled) {
        setSidebarProjects(projects);
        setSidebarTasks(tasks);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, location.pathname]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(user.role),
  );

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logout();
    } catch {
      // The local session is cleared even if the server request fails.
    } finally {
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  }

  const roleLabel: Record<string, string> = {
    admin: "Administrator",
    project_manager: "Project Manager",
    employee: "Teammate",
  };

  return (
    <div className="ts-page min-h-screen">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`ts-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Branding */}
        <div className="flex h-20 items-center gap-3 border-b px-6">
          <div className="rounded-xl bg-indigo-600 p-2.5 text-white">
            <FolderKanban size={22} />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight">TeamSpace</h1>
            <p className="text-xs text-slate-500">Team workspace</p>
          </div>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="ts-focus ml-auto rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}
        <div className="px-4 pt-6">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </p>

          <nav className="mt-3 space-y-1">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `ts-nav-item ts-focus ${
                      isActive ? "ts-nav-item-active" : ""
                    }`
                  }
                >
                  <Icon size={19} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {sidebarProjects.length > 0 && (
          <div className="ts-sidebar-project-tree">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {user.role === "admin" ? "Workspace projects" : "Your projects"}
            </p>
            <div className="mt-2 space-y-1">
              {sidebarProjects.map((project) => {
                const expanded = expandedProjectIds.has(project.id);
                const projectTasks = sidebarTasks
                  .filter((task) => task.project_id === project.id)
                  .slice(0, 3);
                return (
                  <div className="ts-sidebar-project-node" key={project.id}>
                    <div className="ts-sidebar-project-row">
                      <NavLink
                        to={`/projects?project=${project.id}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="ts-sidebar-project-link"
                        title={project.name}
                      >
                        {project.name}
                      </NavLink>
                      <button
                        type="button"
                        className="ts-sidebar-project-toggle"
                        aria-label={`${expanded ? "Collapse" : "Expand"} tasks for ${project.name}`}
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedProjectIds((current) => {
                            const next = new Set(current);
                            if (next.has(project.id)) next.delete(project.id);
                            else next.add(project.id);
                            return next;
                          })
                        }
                      >
                        {expanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                    </div>
                    {expanded && (
                      <div className="ts-sidebar-project-tasks">
                        {projectTasks.length ? (
                          projectTasks.map((task) => (
                            <NavLink
                              key={task.id}
                              to={`/tasks?task_id=${task.id}&project_id=${project.id}`}
                              onClick={() => setMobileMenuOpen(false)}
                              className="ts-sidebar-task-link"
                              title={task.title}
                            >
                              <span
                                className={`ts-sidebar-task-dot status-${task.status.toLowerCase().replaceAll(" ", "-")}`}
                              />
                              {task.title}
                            </NavLink>
                          ))
                        ) : (
                          <p className="ts-sidebar-no-tasks">
                            No visible tasks
                          </p>
                        )}
                        {sidebarTasks.filter(
                          (task) => task.project_id === project.id,
                        ).length > 3 && (
                          <NavLink
                            className="ts-sidebar-more-tasks"
                            to={`/tasks?project_id=${project.id}`}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            View all tasks
                          </NavLink>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* User profile and logout */}
        <div className="mt-auto border-t p-4">
          <div className="ts-profile-card mb-3 flex items-center gap-3 rounded-xl p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 font-semibold text-indigo-700">
              {user.profile_picture_url ? (
                <img
                  src={getApiUrl(user.profile_picture_url)}
                  alt=""
                  crossOrigin="use-credentials"
                  className="h-full w-full object-cover"
                />
              ) : (
                user.full_name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.full_name}</p>
              <p className="truncate text-xs text-slate-500">
                {roleLabel[user.role] ?? user.role}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            className="ts-logout ts-focus flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:opacity-50"
          >
            <LogOut size={18} />
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main workspace */}
      <div className="min-h-screen lg:pl-64">
        {/* Header */}
        <header className="ts-header sticky top-0 z-30 flex h-20 items-center justify-between border-b px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileMenuOpen(true)}
              className="ts-focus rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <p className="text-sm text-slate-500">Your workspace</p>
              <h2 className="truncate font-semibold">
                Welcome, {user.full_name}
              </h2>
            </div>
          </div>

          {/* Theme selector and role */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeSelector />

            <div className="ts-role-pill hidden items-center gap-2 rounded-full px-3 py-2 text-sm sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {roleLabel[user.role] ?? user.role}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
