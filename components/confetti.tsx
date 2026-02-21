"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

const COLORS = [
  "#820AD1", // coral
  "#4ECDC4", // mint
  "#45B7D1", // sky
  "#B76EF0", // sunshine
  "#C792EA", // lavender
  "#D2248F", // orange
];

export function Confetti({ active = false }: { active?: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
      }));
      setPieces(newPieces);
    } else {
      setPieces([]);
    }
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                x: `${piece.x}vw`,
                y: -20,
                rotate: piece.rotation,
                scale: piece.scale,
              }}
              animate={{
                y: "110vh",
                rotate: piece.rotation + 720,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: piece.delay,
                ease: "linear",
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{ backgroundColor: piece.color }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

export function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Coral blob */}
      <motion.div
        className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-coral/20 blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 20, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Mint blob */}
      <motion.div
        className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-mint/20 blur-3xl"
        animate={{
          scale: [1, 1.15, 1],
          x: [0, -15, 0],
          y: [0, 25, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
      {/* Sky blob */}
      <motion.div
        className="absolute bottom-20 right-1/4 w-72 h-72 rounded-full bg-sky/20 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      {/* Sunshine blob */}
      <motion.div
        className="absolute top-1/2 right-10 w-64 h-64 rounded-full bg-sunshine/15 blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 10, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />
    </div>
  );
}
