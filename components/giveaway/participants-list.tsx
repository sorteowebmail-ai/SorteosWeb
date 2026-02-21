"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Users, MessageSquare, Trophy, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Participant } from "@/lib/types";

interface ParticipantsListProps {
  participants: Participant[];
  highlightedIds?: string[];
}

const WINNER_COLORS = ["#FF6B6B", "#4ECDC4", "#FED766", "#C792EA", "#45B7D1", "#FF9F43"];

export function ParticipantsList({
  participants,
  highlightedIds = [],
}: ParticipantsListProps) {
  const [search, setSearch] = useState("");

  const filteredParticipants = participants.filter((p) =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  const getWinnerIndex = (id: string) => highlightedIds.indexOf(id);

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 p-5 bg-secondary/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4ECDC4]/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-[#4ECDC4]" />
            </div>
            <div>
              <span className="font-semibold text-foreground">
                {participants.length.toLocaleString()} participantes
              </span>
              {highlightedIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {highlightedIds.length} ganador
                  {highlightedIds.length > 1 ? "es" : ""} seleccionado
                  {highlightedIds.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar participante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-border/50 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredParticipants.map((participant, index) => {
          const winnerIndex = getWinnerIndex(participant.id);
          const isWinner = winnerIndex !== -1;
          const winnerColor = isWinner
            ? WINNER_COLORS[winnerIndex % WINNER_COLORS.length]
            : null;

          return (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              className={`flex items-start gap-4 border-b border-border/50 last:border-b-0 p-4 transition-colors ${
                isWinner ? "bg-[#FED766]/5" : "hover:bg-secondary/30"
              }`}
              style={{
                borderLeftWidth: isWinner ? "4px" : "0",
                borderLeftColor: winnerColor || "transparent",
              }}
            >
              {/* Avatar */}
              <div className="relative">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: isWinner
                      ? `${winnerColor}20`
                      : "rgba(0,0,0,0.05)",
                    color: isWinner ? winnerColor : undefined,
                  }}
                >
                  {participant.username.slice(0, 2).toUpperCase()}
                </div>
                {isWinner && (
                  <div
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: winnerColor || "#FED766" }}
                  >
                    {winnerIndex + 1}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    @{participant.username}
                  </span>
                  {isWinner && (
                    <Badge
                      className="gap-1 text-white"
                      style={{ backgroundColor: winnerColor || "#FED766" }}
                    >
                      <Crown className="w-3 h-3" />
                      Ganador #{winnerIndex + 1}
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 flex items-start gap-1.5">
                  <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{participant.comment}</span>
                </p>
              </div>

              {/* Winner indicator */}
              {isWinner && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex-shrink-0"
                >
                  <Trophy
                    className="w-6 h-6"
                    style={{ color: winnerColor || "#FED766" }}
                  />
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {filteredParticipants.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              No se encontraron participantes con ese nombre
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
