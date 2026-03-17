"use client";
import { motion } from "framer-motion";

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export default function AnimatedCard({ children, index = 0, className = "" }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.06, 0.3),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
