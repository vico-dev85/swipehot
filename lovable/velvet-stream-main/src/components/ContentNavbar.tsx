import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { models } from "@/data/models";

const navLinks = [
  { label: "Roulette", to: "/", icon: "🎰" },
  { label: "Models", to: "/models", icon: "👤" },
  { label: "Blog", to: "/blog", icon: "📝" },
];

const ContentNavbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const onlineCount = models.filter((m) => m.online).length;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 glass flex items-center justify-between px-4">
        <Link to="/" className="text-sm font-bold text-foreground tracking-tight">
          xcam.vip
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "text-primary"
                  : "text-[hsl(var(--text-secondary))] hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <span className="text-sm font-medium text-primary">Live Now</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-[hsl(var(--text-secondary))]">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse-live" />
          <span className="tabular-nums">{onlineCount} live now</span>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden btn-press p-2 -mr-2"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={22} className="text-foreground" />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] glass flex flex-col"
          >
            <div className="flex items-center justify-between px-4 h-14">
              <span className="text-sm font-bold text-foreground">xcam.vip</span>
              <button className="btn-press p-2 -mr-2" onClick={() => setMenuOpen(false)}>
                <X size={22} className="text-foreground" />
              </button>
            </div>
            <div className="flex flex-col mt-8 px-6 gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 h-14 text-lg font-medium rounded-xl px-4 transition-colors ${
                    location.pathname === link.to
                      ? "text-primary bg-primary/10"
                      : "text-foreground hover:bg-[hsl(var(--bg-elevated))]"
                  }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 h-14 text-lg font-medium rounded-xl px-4 text-primary hover:bg-primary/10"
              >
                <span>🔥</span>
                Live Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ContentNavbar;
