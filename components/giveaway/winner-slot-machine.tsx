"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, PartyPopper } from "lucide-react";
import type { Participant } from "@/lib/types";
import { selectWinnersAndBackups } from "@/lib/giveaway-store";
import { Confetti } from "@/components/confetti";

interface WinnerSlotMachineProps {
  participants: Participant[];
  numberOfWinners: number;
  numberOfBackups?: number;
  onComplete: (winners: Participant[], backups: Participant[]) => void;
  pauseBeforeReveal?: boolean;
  onShuffleReady?: () => void;
}

const COLORS = ["#FF6B6B", "#4ECDC4", "#FED766", "#C792EA", "#45B7D1", "#FF9F43"];

export function WinnerSlotMachine({
  participants,
  numberOfWinners,
  numberOfBackups = 0,
  onComplete,
  pauseBeforeReveal = false,
  onShuffleReady,
}: WinnerSlotMachineProps) {
  const [phase, setPhase] = useState<"shuffling" | "paused" | "selecting" | "complete">(
    "shuffling"
  );
  const [displayedNames, setDisplayedNames] = useState<string[]>([]);
  const [selectedWinners, setSelectedWinners] = useState<Participant[]>([]);
  const [selectedBackups, setSelectedBackups] = useState<Participant[]>([]);
  const [currentWinnerIndex, setCurrentWinnerIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Initial shuffle phase
  useEffect(() => {
    const { winners, backups } = selectWinnersAndBackups(participants, numberOfWinners, numberOfBackups);
    setSelectedWinners(winners);
    setSelectedBackups(backups);

    const shuffleInterval = setInterval(() => {
      const randomNames = Array.from(
        { length: 5 },
        () =>
          participants[Math.floor(Math.random() * participants.length)]
            ?.username || ""
      );
      setDisplayedNames(randomNames);
    }, 80);

    const selectionTimeout = setTimeout(() => {
      if (pauseBeforeReveal) {
        // Keep shuffling visually but mark as paused
        setPhase("paused");
        onShuffleReady?.();
      } else {
        clearInterval(shuffleInterval);
        setPhase("selecting");
      }
    }, 2500);

    return () => {
      clearInterval(shuffleInterval);
      clearTimeout(selectionTimeout);
    };
  }, [participants, numberOfWinners, numberOfBackups]);

  // Resume from paused state when pauseBeforeReveal becomes false
  useEffect(() => {
    if (phase === "paused" && !pauseBeforeReveal) {
      setPhase("selecting");
    }
  }, [phase, pauseBeforeReveal]);

  // Keep shuffling names during paused phase
  useEffect(() => {
    if (phase !== "paused") return;

    const shuffleInterval = setInterval(() => {
      const randomNames = Array.from(
        { length: 5 },
        () =>
          participants[Math.floor(Math.random() * participants.length)]
            ?.username || ""
      );
      setDisplayedNames(randomNames);
    }, 80);

    return () => clearInterval(shuffleInterval);
  }, [phase, participants]);

  useEffect(() => {
    if (phase !== "selecting") return;

    if (currentWinnerIndex < selectedWinners.length) {
      const shuffleInterval = setInterval(() => {
        const randomNames = Array.from(
          { length: 5 },
          () =>
            participants[Math.floor(Math.random() * participants.length)]
              ?.username || ""
        );
        setDisplayedNames(randomNames);
      }, 60);

      const revealTimeout = setTimeout(() => {
        clearInterval(shuffleInterval);
        setDisplayedNames([selectedWinners[currentWinnerIndex].username]);

        setTimeout(() => {
          setCurrentWinnerIndex((prev) => prev + 1);
        }, 1500);
      }, 1500);

      return () => {
        clearInterval(shuffleInterval);
        clearTimeout(revealTimeout);
      };
    } else {
      setPhase("complete");
      setShowConfetti(true);
      onComplete(selectedWinners, selectedBackups);
    }
  }, [phase, currentWinnerIndex, selectedWinners, selectedBackups, participants, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-12 relative">
      <Confetti active={showConfetti} />

      {(phase === "shuffling" || phase === "paused") && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center w-full max-w-lg"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 rounded-full bg-gradient-to-r from-[#FF6B6B] via-[#FED766] to-[#4ECDC4] mx-auto mb-6 flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-[#FED766]" />
            </div>
          </motion.div>

          <h3 className="text-xl font-bold text-foreground mb-2">
            Mezclando participantes...
          </h3>
          <p className="text-muted-foreground mb-8">
            {participants.length.toLocaleString()} participantes en el sorteo
          </p>

          <div className="relative h-72 w-full overflow-hidden rounded-3xl border-2 border-border bg-gradient-to-b from-card to-secondary/30">
            <div className="absolute inset-0 bg-gradient-to-b from-card via-transparent to-card z-10 pointer-events-none" />
            <div className="flex h-full flex-col items-center justify-center gap-3">
              {displayedNames.map((name, index) => (
                <motion.div
                  key={`${name}-${index}-${Date.now()}`}
                  initial={{ opacity: 0, y: -30, scale: 0.8 }}
                  animate={{
                    opacity: index === 2 ? 1 : 0.3,
                    y: 0,
                    scale: index === 2 ? 1.1 : 0.9,
                  }}
                  className={`font-mono px-6 py-2 rounded-xl ${
                    index === 2
                      ? "text-foreground text-2xl font-bold bg-primary/10"
                      : "text-muted-foreground"
                  }`}
                >
                  @{name}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {phase === "selecting" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center w-full max-w-lg"
        >
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FED766]/20 text-[#D4A84B] font-medium">
              <Trophy className="w-4 h-4" />
              Seleccionando ganador {currentWinnerIndex + 1} de {numberOfWinners}
            </span>
          </div>

          <div className="relative h-48 w-full overflow-hidden rounded-3xl border-2 border-[#FED766] bg-gradient-to-b from-[#FED766]/5 to-card shadow-xl shadow-[#FED766]/10">
            <div className="absolute inset-0 bg-gradient-to-b from-card via-transparent to-card z-10 pointer-events-none" />
            <div className="flex h-full flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {displayedNames.length === 1 ? (
                  <motion.div
                    key="winner"
                    initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: 3 }}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FED766] to-[#FF9F43] flex items-center justify-center shadow-lg">
                        <Trophy className="h-8 w-8 text-white" />
                      </div>
                    </motion.div>
                    <span className="text-3xl font-bold bg-gradient-to-r from-[#FED766] to-[#FF9F43] bg-clip-text text-transparent">
                      @{displayedNames[0]}
                    </span>
                  </motion.div>
                ) : (
                  displayedNames.map((name, index) => (
                    <motion.div
                      key={`${name}-${index}-select`}
                      initial={{ opacity: 0, y: -15 }}
                      animate={{
                        opacity: index === 2 ? 1 : 0.2,
                        y: 0,
                        scale: index === 2 ? 1.1 : 0.85,
                      }}
                      className={`font-mono px-4 py-1 rounded-lg ${
                        index === 2
                          ? "text-foreground text-2xl font-bold"
                          : "text-muted-foreground text-sm"
                      }`}
                    >
                      @{name}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {currentWinnerIndex > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <p className="mb-3 text-sm text-muted-foreground">
                Ganadores hasta ahora:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {selectedWinners.slice(0, currentWinnerIndex).map((winner, i) => (
                  <motion.div
                    key={winner.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  >
                    <Trophy className="h-4 w-4" />@{winner.username}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {phase === "complete" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center w-full max-w-2xl"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="mb-8"
          >
            <div className="relative mx-auto w-32 h-32">
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FF6B6B] via-[#FED766] to-[#4ECDC4]"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                <PartyPopper className="h-12 w-12 text-[#FED766]" />
              </div>
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-foreground mb-2"
          >
            {numberOfWinners === 1 ? "Tenemos ganador!" : "Tenemos ganadores!"}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mb-10"
          >
            Felicidades a {numberOfWinners === 1 ? "el ganador" : "los ganadores"} del sorteo
          </motion.p>

          <div className="flex flex-wrap justify-center gap-4">
            {selectedWinners.map((winner, index) => (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.15, type: "spring" }}
                className="relative"
              >
                <div
                  className="absolute inset-0 rounded-2xl blur-xl opacity-30"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div
                  className="relative flex items-center gap-4 rounded-2xl px-6 py-5 border-2"
                  style={{
                    backgroundColor: `${COLORS[index % COLORS.length]}15`,
                    borderColor: `${COLORS[index % COLORS.length]}50`,
                  }}
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-xl text-white font-bold text-xl shadow-lg"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-xl text-foreground">
                      @{winner.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ganador #{index + 1}
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <span className="text-3xl">🎉</span>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
