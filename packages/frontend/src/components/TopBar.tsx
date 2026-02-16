import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { fetchPoolStats } from "@/services/api";

interface TopBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onOpenFilter: () => void;
}

const filters = [
  { key: "all", label: "All" },
  { key: "women", label: "Girls" },
  { key: "men", label: "Guys" },
  { key: "trans", label: "Trans" },
  { key: "couples", label: "Couples" },
];

const TopBar = ({ activeFilter, onFilterChange, onOpenFilter }: TopBarProps) => {
  const [viewerCount, setViewerCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const stats = await fetchPoolStats();
        if (active) setViewerCount(stats.total_viewers);
      } catch { /* silent */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-30 gradient-top" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Row 1: Logo + LIVE viewer count */}
      <div className="flex items-center justify-between px-4 h-10">
        {/* Left: Logo */}
        <img src="/logo.png" alt="xcam.vip" className="h-6" />

        {/* Right: viewer count with green dot */}
        <div className="flex items-center gap-1.5 text-[hsl(var(--text-secondary))]">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse-live" />
          <Eye size={13} strokeWidth={1.5} />
          <span className="text-[11px] tabular-nums font-medium">
            {viewerCount !== null ? viewerCount.toLocaleString() : "—"}
          </span>
        </div>
      </div>

      {/* Row 2: Gender filter pills */}
      <div className="flex items-center justify-center gap-1 px-4 pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`btn-press h-7 px-3 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all duration-200 ${
              activeFilter === f.key
                ? "bg-foreground text-background"
                : "text-foreground/60 hover:text-foreground/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopBar;
