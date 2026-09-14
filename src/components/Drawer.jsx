import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Drawer = ({ isOpen, onClose, children }) => {
  // Disable scrolling when the drawer is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add("overflow-hidden");
    } else {
      document.documentElement.classList.remove("overflow-hidden");
    }

    return () => {
      document.documentElement.classList.remove("overflow-hidden");
    };
  }, [isOpen]);

  // Handle Escape key to close drawer
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Background Overlay */}
          <motion.div
            className="fixed inset-[0] bg-neutral-900/80 backdrop-blur-md z-[9000]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Drawer */}
          <motion.div
            className={classNames(
              "fixed bottom-[0] left-0 w-full max-h-[95dvh] shadow-xl rounded-t-3xl z-[9001] pt-24 flex flex-col",
            )}
            style={{
              background: "rgba(10, 12, 20, 0.85)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.6)"
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Close Button */}
            <button
              className="absolute top-16 right-16 z-10 w-32 h-32 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              onClick={onClose}
            >
              <FontAwesomeIcon icon="xmark" className="fa-lg text-white" />
            </button>

            {/* Drawer Content */}
            <div 
              className="overflow-y-auto px-16 w-full"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 2rem)" }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
