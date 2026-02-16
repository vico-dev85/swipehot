import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ThumbnailOverlayProps {
  imageUrl: string | null;
  visible: boolean;
}

const ThumbnailOverlay = ({ imageUrl, visible }: ThumbnailOverlayProps) => {
  const [loaded, setLoaded] = useState(false);

  // Reset loaded state when image URL changes
  useEffect(() => {
    setLoaded(false);
  }, [imageUrl]);

  // Fallback: force loaded after 5s in case image fails
  useEffect(() => {
    if (!visible || loaded) return;
    const timeout = setTimeout(() => setLoaded(true), 5000);
    return () => clearTimeout(timeout);
  }, [visible, loaded]);

  if (!imageUrl) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 z-[3] pointer-events-none"
        >
          <img
            src={imageUrl}
            alt=""
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Subtle loading shimmer while image loads */}
          {!loaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent animate-shimmer" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ThumbnailOverlay;
