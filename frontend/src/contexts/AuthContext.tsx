import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import api from "../lib/api";

export interface User {
  id: number;
  workspace_id: number;
  full_name: string;
  email: string;
  role: "admin" | "project_manager" | "employee" | string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item: { msg?: string }) => item.msg ?? "Invalid input")
        .join(", ");
    }

    if (!error.response) {
      return "Cannot connect to the server. Check that the backend is running.";
    }
  }

  return "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionVersion = useRef(0);

  const login = useCallback(async (email: string, password: string) => {
    sessionVersion.current += 1;
    try {
      const response = await api.post<User>("/api/v1/auth/login", {
        email,
        password,
      });

      setUser(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }, []);

  const logout = useCallback(async () => {
    sessionVersion.current += 1;
    try {
      await api.post("/api/v1/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const versionAtStart = sessionVersion.current;
      try {
        const response = await api.get<User>("/api/v1/auth/me");

        if (!cancelled && sessionVersion.current === versionAtStart) {
          setUser(response.data);
        }
      } catch {
        if (!cancelled && sessionVersion.current === versionAtStart) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
