import { motion, AnimatePresence } from "framer-motion";
import { Users, User, Heart } from "lucide-react";

interface GenderFilterSheetProps {
  open: boolean;
  active: string;
  onSelect: (filter: string) => void;
  onClose: () => void;
}

const options = [
  { key: "all", label: "Everyone", icon: Users },
  { key: "women", label: "Women", icon: User },
  { key: "men", label: "Men", icon: User },
  { key: "trans", label: "Trans", icon: Heart },
  { key: "couples", label: "Couples", icon: Users },
];

const GenderFilterSheet = ({ open, active, onSelect, onClose }: GenderFilterSheetProps) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 glass grain rounded-t-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="relative z-10 p-6">
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mb-6" />

              <h3 className="text-base font-bold text-foreground mb-4">Filter by</h3>

              <div className="grid grid-cols-2 gap-3">
                {options.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = active === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => {
                        onSelect(opt.key);
                        onClose();
                      }}
                      className={`btn-press flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-foreground/70 hover:border-foreground/20"
                      }`}
                    >
                      <Icon size={20} strokeWidth={1.5} />
                      <span className="text-sm font-semibold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GenderFilterSheet;
