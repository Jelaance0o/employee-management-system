import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Palette } from "lucide-react";
import { themes, useTheme, type ThemeOption } from "../contexts/ThemeContext";

function ThemePreview({ theme }: { theme: ThemeOption }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-10 shrink-0 overflow-hidden rounded-md border"
      style={{ borderColor: theme.accent }}
    >
      <span
        className="flex w-1/2 flex-col gap-1 p-1"
        style={{ background: theme.background }}
      >
        <span className="h-1 rounded-sm" style={{ background: theme.accent }} />
        <span
          className="h-1 rounded-sm"
          style={{ background: theme.surface }}
        />
        <span
          className="h-1 rounded-sm"
          style={{ background: theme.surface }}
        />
      </span>
      <span className="flex-1 p-1" style={{ background: theme.surface }}>
        <span
          className="block h-full rounded-sm"
          style={{ background: theme.background }}
        />
      </span>
    </span>
  );
}

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeTheme = themes.find((item) => item.id === theme) ?? themes[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Appearance: ${activeTheme.name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="ts-hover ts-focus flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
        style={{
          background: "var(--ts-surface)",
          borderColor: "var(--ts-border)",
          color: "var(--ts-text-secondary)",
        }}
      >
        <Palette size={17} />
        <span className="hidden sm:inline">Appearance</span>
        <ChevronDown
          size={15}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose appearance"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-xl"
          style={{
            background: "var(--ts-surface)",
            borderColor: "var(--ts-border)",
            color: "var(--ts-text)",
            boxShadow: "0 12px 32px rgb(0 0 0 / 14%)",
          }}
        >
          <div
            className="border-b px-4 py-3"
            style={{ borderColor: "var(--ts-border)" }}
          >
            <p className="text-sm font-semibold">Appearance</p>
            <p className="mt-1 text-xs ts-muted">Choose a workspace theme</p>
          </div>

          <div className="max-h-[min(65vh,480px)] overflow-y-auto p-2">
            {(["Light", "Dark"] as const).map((category) => {
              const categoryThemes = themes.filter(
                (item) => item.category === category,
              );

              return (
                <section key={category} className="mb-2 last:mb-0">
                  <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider ts-muted">
                    {category} themes
                  </p>

                  {categoryThemes.map((item) => {
                    const selected = item.id === theme;

                    return (
                      <button
                        type="button"
                        key={item.id}
                        aria-pressed={selected}
                        onClick={() => {
                          setTheme(item.id);
                          setOpen(false);
                        }}
                        className="ts-hover ts-focus flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left"
                        style={{
                          background: selected
                            ? "var(--ts-accent-soft)"
                            : "transparent",
                        }}
                      >
                        <ThemePreview theme={item} />

                        <span className="min-w-0 flex-1">
                          <span
                            className="block text-sm font-medium"
                            style={{
                              color: selected
                                ? "var(--ts-accent)"
                                : "var(--ts-text)",
                            }}
                          >
                            {item.name}
                          </span>
                          <span className="block text-xs ts-muted">
                            {category} appearance
                          </span>
                        </span>

                        {selected && (
                          <Check
                            size={17}
                            aria-label="Selected"
                            style={{ color: "var(--ts-accent)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </section>
              );
            })}
          </div>

          <div
            className="border-t px-4 py-2.5 text-xs ts-muted"
            style={{ borderColor: "var(--ts-border)" }}
          >
            Your choice is saved on this device.
          </div>
        </div>
      )}
    </div>
  );
}
