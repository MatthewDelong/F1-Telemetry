import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaChevronDown } from "react-icons/fa";
import classNames from "classnames";

const Accordion = ({ title, children, className, contentClasses, titleClassName, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
    <div className={classNames(className, "")}>
      {/* Header */}
      <button
        className={classNames("w-full flex justify-between items-center py-4 px-8 tracking-sm uppercase hover:text-brand-blue-300 transition-colors duration-300", titleClassName)}
        style={{ letterSpacing: '0.2rem', color: 'rgba(255, 255, 255, 0.7)' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
        <FaChevronDown
          className={`transform transition-transform duration-300 ${isOpen ? "rotate-180 text-brand-blue-400" : "text-neutral-500"}`}
        />
      </button>

      {/* Collapsible Content */}
      <motion.div
        className="overflow-hidden"
        initial={{ height: 0 }}
        animate={{ height: isOpen ? "auto" : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className={classNames(contentClasses, "px-8 py-4 bg-[rgba(255,255,255,0.02)] rounded-lg mx-4 mt-2 border border-[rgba(255,255,255,0.05)]")}>{children}</div>
      </motion.div>
    </div>
    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent my-4" />
    </>
  );
};

export default Accordion;
