"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Shield } from "lucide-react";
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
  isFullscreen?: boolean;
}

export function WinnerSlotMachine({
  participants,
  numberOfWinners,
  numberOfBackups = 0,
  onComplete,
  pauseBeforeReveal = false,
  onShuffleReady,
  isFullscreen = false,
}: WinnerSlotMachineProps) {
  const [phase, setPhase] = useState<
    "preparing" | "shuffling" | "paused" | "countdown" | "selecting" | "complete"
  >("preparing");
  const [displayedNames, setDisplayedNames] = useState<string[]>([]);
  const [selectedWinners, setSelectedWinners] = useState<Participant[]>([]);
  const [selectedBackups, setSelectedBackups] = useState<Participant[]>([]);
  const [currentWinnerIndex, setCurrentWinnerIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [progress, setProgress] = useState(0);

  // Preparing phase
  useEffect(() => {
    if (phase !== "preparing") return;

    const { winners, backups } = selectWinnersAndBackups(participants, numberOfWinners, numberOfBackups);
    setSelectedWinners(winners);
    setSelectedBackups(backups);

    const steps = [
      { target: 15, delay: 200 },
      { target: 35, delay: 600 },
      { target: 55, delay: 400 },
      { target: 78, delay: 500 },
      { target: 92, delay: 300 },
      { target: 100, delay: 400 },
    ];

    let timeoutIds: NodeJS.Timeout[] = [];
    let elapsed = 0;

    steps.forEach((step) => {
      elapsed += step.delay;
      const id = setTimeout(() => setProgress(step.target), elapsed);
      timeoutIds.push(id);
    });

    const transitionId = setTimeout(() => {
      setPhase("shuffling");
    }, elapsed + 500);
    timeoutIds.push(transitionId);

    return () => timeoutIds.forEach(clearTimeout);
  }, [phase, participants, numberOfWinners, numberOfBackups]);

  // Shuffle phase
  useEffect(() => {
    if (phase !== "shuffling") return;

    const shuffleInterval = setInterval(() => {
      const randomNames = Array.from(
        { length: 5 },
        () => participants[Math.floor(Math.random() * participants.length)]?.username || ""
      );
      setDisplayedNames(randomNames);
    }, 80);

    const selectionTimeout = setTimeout(() => {
      if (pauseBeforeReveal) {
        setPhase("paused");
        onShuffleReady?.();
      } else {
        clearInterval(shuffleInterval);
        setPhase("countdown");
      }
    }, 2500);

    return () => {
      clearInterval(shuffleInterval);
      clearTimeout(selectionTimeout);
    };
  }, [phase, participants, pauseBeforeReveal, onShuffleReady]);

  // Resume from paused
  useEffect(() => {
    if (phase === "paused" && !pauseBeforeReveal) {
      setPhase("countdown");
    }
  }, [phase, pauseBeforeReveal]);

  // Keep shuffling during paused
  useEffect(() => {
    if (phase !== "paused") return;
    const shuffleInterval = setInterval(() => {
      const randomNames = Array.from(
        { length: 5 },
        () => participants[Math.floor(Math.random() * participants.length)]?.username || ""
      );
      setDisplayedNames(randomNames);
    }, 80);
    return () => clearInterval(shuffleInterval);
  }, [phase, participants]);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdownNumber(3);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        setPhase("selecting");
      } else {
        setCountdownNumber(count);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Selecting winners one by one
  useEffect(() => {
    if (phase !== "selecting") return;

    if (currentWinnerIndex < selectedWinners.length) {
      const shuffleInterval = setInterval(() => {
        const randomNames = Array.from(
          { length: 5 },
          () => participants[Math.floor(Math.random() * participants.length)]?.username || ""
        );
        setDisplayedNames(randomNames);
      }, 50);

      const revealTimeout = setTimeout(() => {
        clearInterval(shuffleInterval);
        setDisplayedNames([selectedWinners[currentWinnerIndex].username]);
        setTimeout(() => setCurrentWinnerIndex((prev) => prev + 1), 2000);
      }, 2000);

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

  const containerClass = isFullscreen
    ? "flex flex-col items-center justify-center min-h-screen relative bg-[#0a0a0f]"
    : "flex flex-col items-center justify-center py-12 relative";

  return (
    <div className={containerClass}>
      <Confetti active={showConfetti} />

      {/* Preparing — dark, progress bar */}
      {phase === "preparing" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-center w-full max-w-md px-4"
        >
          <div className="rounded-2xl bg-[#0a0a0f] border border-white/[0.06] p-10">
            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] mx-auto mb-8 flex items-center justify-center"
            >
              <Shield className="w-6 h-6 text-white/50" />
            </motion.div>

            <h3 className="text-lg font-semibold text-white mb-2">
              Preparando selección
            </h3>
            <p className="text-white/35 text-sm mb-8">
              Algoritmo criptográfico en ejecución
            </p>

            {/* Progress bar */}
            <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-white/30 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-white/25">
              <span>Procesando {participants.length.toLocaleString()} participantes</span>
              <span>{progress}%</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Shuffling / Paused */}
      {(phase === "shuffling" || phase === "paused") && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center w-full max-w-lg"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 rounded-full bg-primary/20 mx-auto mb-6 flex items-center justify-center"
          >
            <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary/70" />
            </div>
          </motion.div>

          <h3 className="text-lg font-semibold text-foreground mb-1">
            Procesando participantes
          </h3>
          <p className="text-sm text-muted-foreground mb-8">
            {participants.length.toLocaleString()} participantes válidos
          </p>

          <div className="relative h-64 w-full overflow-hidden rounded-xl border border-border/50 bg-card">
            <div className="absolute inset-0 bg-gradient-to-b from-card via-transparent to-card z-10 pointer-events-none" />
            <div className="flex h-full flex-col items-center justify-center gap-2.5">
              {displayedNames.map((name, index) => (
                <motion.div
                  key={`${name}-${index}-${Date.now()}`}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{
                    opacity: index === 2 ? 1 : 0.15,
                    y: 0,
                    scale: index === 2 ? 1.05 : 0.9,
                  }}
                  className={`font-mono px-6 py-1.5 rounded-lg ${
                    index === 2
                      ? "text-foreground text-xl font-semibold bg-primary/5"
                      : "text-muted-foreground text-sm"
                  }`}
                >
                  @{name}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Countdown */}
      {phase === "countdown" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center w-full max-w-lg"
        >
          <div className="flex flex-col items-center justify-center h-80">
            <AnimatePresence mode="wait">
              <motion.div
                key={countdownNumber}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center"
              >
                <span className="text-[120px] leading-none font-extralight text-foreground/80 tabular-nums tracking-tighter">
                  {countdownNumber}
                </span>
              </motion.div>
            </AnimatePresence>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground/50 mt-6 text-sm tracking-wide uppercase"
            >
              Seleccionando ganador{numberOfWinners > 1 ? "es" : ""}
            </motion.p>
          </div>
        </motion.div>
      )}

      {/* Selecting — reveal per winner */}
      {phase === "selecting" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center w-full max-w-lg"
        >
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 text-primary text-sm font-medium border border-primary/10">
              <Trophy className="w-3.5 h-3.5" />
              Posición {currentWinnerIndex + 1} de {numberOfWinners}
            </span>
          </div>

          <div className="relative h-44 w-full overflow-hidden rounded-xl border border-primary/15 bg-card">
            <div className="absolute inset-0 bg-gradient-to-b from-card via-transparent to-card z-10 pointer-events-none" />
            <div className="flex h-full flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {displayedNames.length === 1 ? (
                  <motion.div
                    key="winner"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-3xl font-bold text-foreground">
                      @{displayedNames[0]}
                    </span>
                  </motion.div>
                ) : (
                  displayedNames.map((name, index) => (
                    <motion.div
                      key={`${name}-${index}-select`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{
                        opacity: index === 2 ? 1 : 0.15,
                        y: 0,
                        scale: index === 2 ? 1.05 : 0.85,
                      }}
                      className={`font-mono px-4 py-0.5 rounded-lg ${
                        index === 2
                          ? "text-foreground text-xl font-semibold"
                          : "text-muted-foreground text-xs"
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <div className="flex flex-wrap justify-center gap-2">
                {selectedWinners.slice(0, currentWinnerIndex).map((winner, i) => (
                  <motion.div
                    key={winner.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/8 text-primary border border-primary/10"
                  >
                    <Trophy className="h-3 w-3" />@{winner.username}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Complete */}
      {phase === "complete" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center w-full max-w-2xl"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-primary/15 blur-xl" />
              <div className="relative w-16 h-16 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center">
                <Trophy className="h-7 w-7 text-primary" />
              </div>
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-2xl font-bold text-foreground mb-2"
          >
            Selección completada
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-sm text-muted-foreground mb-10"
          >
            Resultado generado con crypto.getRandomValues()
          </motion.p>

          <div className="flex flex-wrap justify-center gap-3">
            {selectedWinners.map((winner, index) => (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-4 rounded-xl px-5 py-4 border border-border/50 bg-card card-hover">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg text-foreground">
                      @{winner.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Posición #{index + 1}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
