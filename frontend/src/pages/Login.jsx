import { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {

  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

const handleLogin = async (e) => {
  e.preventDefault();

  try {
    const response = await login(email, password);

    if (response.user.role === "admin") {
      navigate("/admin");
    } else if (response.user.role === "employee") {
      navigate("/employee");
    }
  } catch (error) {
    console.error("Login failed:", error);
  }
};

  const checkMe = async () => {
    try {
      const response = await api.get("/users/me");

      console.log("Current user:", response.data);
    } catch (error) {
      console.error("Authentication failed:", error);
    }
  };

  return (
    <main className="min-h-screen bg-[#08090b] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-37.5 top-[-150px] h-[400px] w-[400px] rounded-full bg-indigo-600/20 blur-[120px]" />

        <div className="absolute bottom-[-150px] right-[-150px] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl lg:grid-cols-2">
          {/* LEFT SIDE */}
          <section className="relative hidden min-h-[650px] overflow-hidden border-r border-white/10 p-12 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-16 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black font-bold">
                  E
                </div>

                <span className="text-lg font-semibold tracking-tight">
                  EmployeeOS
                </span>
              </div>

              <div className="max-w-lg">
                <p className="mb-5 text-sm font-medium uppercase tracking-[0.25em] text-indigo-400">
                  Employee Management
                </p>

                <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight">
                  One workspace.
                  <br />
                  <span className="text-white/40">Everything organized.</span>
                </h1>

                <p className="mt-7 max-w-md text-base leading-7 text-white/50">
                  Manage employees, roles, tasks and workplace operations from
                  one secure and intelligent platform.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xl font-semibold">Secure</p>
                <p className="mt-1 text-xs text-white/40">Protected access</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xl font-semibold">Simple</p>
                <p className="mt-1 text-xs text-white/40">Easy management</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xl font-semibold">Fast</p>
                <p className="mt-1 text-xs text-white/40">Built for teams</p>
              </div>
            </div>
          </section>

          {/* RIGHT SIDE */}
          <section className="flex min-h-[650px] items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-md">
              <div className="mb-10">
                <p className="mb-3 text-sm font-medium text-indigo-400">
                  Welcome back
                </p>

                <h2 className="text-3xl font-semibold tracking-tight">
                  Sign in to your account
                </h2>

                <p className="mt-3 text-sm leading-6 text-white/40">
                  Enter your credentials to access your workspace.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* EMAIL */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Email address
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-indigo-500/70 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                {/* PASSWORD */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-white/70">
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-xs font-medium text-indigo-400 transition hover:text-indigo-300"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-indigo-500/70 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                {/* LOGIN BUTTON */}
                <button
                  type="submit"
                  className="group relative mt-3 w-full overflow-hidden rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.99]"
                >
                  <span className="relative z-10">Sign in</span>
                </button>

                <button
                  type="button"
                  onClick={checkMe}
                  className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70 hover:bg-white/10"
                >
                  Check Authentication
                </button>
              </form>

              {/* SECURITY */}
              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/30">
                <span>🔒</span>
                <span>Your connection is securely protected</span>
              </div>

              <div className="mt-10 border-t border-white/10 pt-6 text-center">
                <p className="text-xs text-white/25">
                  EmployeeOS · Secure employee management
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Login;
