import { Eye, Menu } from "lucide-react";

interface TopBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onOpenFilter: () => void;
}

const filters = [
  { key: "all", label: "All" },
  { key: "women", label: "♀" },
  { key: "men", label: "♂" },
  { key: "trans", label: "⚧" },
  { key: "couples", label: "👫" },
];

const TopBar = ({ activeFilter, onFilterChange, onOpenFilter }: TopBarProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-30 gradient-top" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex items-center justify-between px-4 h-12">
        {/* Left: menu */}
        <button className="btn-press w-10 h-10 flex items-center justify-center">
          <Menu size={22} className="text-foreground text-overlay" strokeWidth={1.5} />
        </button>

        {/* Center: filter pills */}
        <div className="flex items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`btn-press h-8 px-3 rounded-full text-xs font-semibold transition-colors ${
                activeFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "glass-light text-foreground/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Right: viewer count */}
        <div className="flex items-center gap-1.5 text-[hsl(var(--text-secondary))]">
          <Eye size={14} strokeWidth={1.5} />
          <span className="text-xs tabular-nums font-medium">4,287</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
