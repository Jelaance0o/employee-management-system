import { useAuth } from "../../context/AuthContext";

function Navbar() {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#0b0c0f] px-6 text-white">
      {/* Left */}
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>

        <p className="text-xs text-white/40">Overview of your organization</p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:block">
          <input
            type="text"
            placeholder="Search..."
            className="w-64 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
          />
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-medium">{user?.name}</p>

            <p className="text-xs text-white/40">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
