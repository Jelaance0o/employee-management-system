import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeId = "github-light" | "github-dark" | "dark";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  category: "Light" | "Dark";
  background: string;
  surface: string;
  accent: string;
}

export const themes: ThemeOption[] = [
  {
    id: "github-light",
    name: "GitHub Light",
    category: "Light",
    background: "#F6F8FA",
    surface: "#FFFFFF",
    accent: "#0969DA",
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    category: "Dark",
    background: "#0D1117",
    surface: "#161B22",
    accent: "#4493F8",
  },
  {
    id: "dark",
    name: "Dark",
    category: "Dark",
    background: "#18191F",
    surface: "#202127",
    accent: "#818CF8",
  },
];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const STORAGE_KEY = "teamspace-theme";

function getInitialTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === "light") return "github-light";

    if (themes.some((item) => item.id === saved)) {
      return saved as ThemeId;
    }
  } catch {
    // Continue with the default if browser storage is unavailable.
  }

  return "github-light";
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme =
      themes.find((item) => item.id === theme)?.category === "Dark"
        ? "dark"
        : "light";

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Theme switching still works if storage is unavailable.
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
