import { Eye } from "lucide-react";

interface TopBarProps {
  activeFilter: string;
  viewerCount: number;
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

const TopBar = ({ activeFilter, viewerCount, onFilterChange, onOpenFilter }: TopBarProps) => {
  return (
    <div className="w-full gradient-top" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Row 1: Logo + viewer count */}
      <div className="flex items-center justify-between px-4 h-10">
        <img src="/logo.png" alt="SwipeHot" className="h-6" />
        <div className="flex items-center gap-1.5 text-[hsl(var(--text-secondary))]">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse-live" />
          <Eye size={13} strokeWidth={1.5} />
          <span className="text-[11px] tabular-nums font-medium">
            {viewerCount > 1000 ? `${(viewerCount / 1000).toFixed(1)}K` : viewerCount} watching
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
