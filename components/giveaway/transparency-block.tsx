"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Calendar,
  MessageSquare,
  Hash,
  Settings,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GiveawaySettings, Participant } from "@/lib/types";
import { RandomnessModal } from "./randomness-modal";

interface TransparencyBlockProps {
  settings: GiveawaySettings;
  totalComments: number;
  filteredCount: number;
  winners: Participant[];
  backups: Participant[];
  commentBreakdown?: {
    totalDownloaded: number;
    topLevel: number;
    replies: number;
  } | null;
}

function generateSorteoHash(settings: GiveawaySettings, timestamp: string): string {
  const input = `${settings.postUrl}|${timestamp}|${settings.numberOfWinners}|${settings.filterDuplicates}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").toUpperCase();
}

export function TransparencyBlock({
  settings,
  totalComments,
  filteredCount,
  winners,
  backups,
  commentBreakdown,
}: TransparencyBlockProps) {
  const [showRandomnessModal, setShowRandomnessModal] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const timestamp = useMemo(() => new Date().toISOString(), []);
  const sorteoHash = useMemo(
    () => generateSorteoHash(settings, timestamp),
    [settings, timestamp]
  );

  const activeRules: string[] = [];
  if (settings.filterDuplicates) activeRules.push("Sin duplicados");
  if (settings.requireMentions > 0) activeRules.push(`Min. ${settings.requireMentions} mencion${settings.requireMentions > 1 ? "es" : ""}`);
  if (settings.minCommentLength > 0) activeRules.push(`Min. ${settings.minCommentLength} caracteres`);
  if (settings.excludeAccounts.length > 0) activeRules.push(`${settings.excludeAccounts.length} cuenta${settings.excludeAccounts.length > 1 ? "s" : ""} excluida${settings.excludeAccounts.length > 1 ? "s" : ""}`);
  if (settings.keywordFilter?.length > 0) activeRules.push(`Filtro: ${settings.keywordFilter.join(", ")}`);
  if (activeRules.length === 0) activeRules.push("Sin filtros adicionales");

  const handleCopyHash = async () => {
    await navigator.clipboard.writeText(`SRW-${sorteoHash}`);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-card border border-border/50 overflow-hidden"
      >
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Verificación del sorteo
              </h2>
              <p className="text-xs text-muted-foreground">
                Datos verificables del proceso de selección
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRandomnessModal(true)}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Método de selección
          </Button>
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Date */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Fecha y hora</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date().toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* Comments */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Comentarios directos</p>
                <p className="text-sm font-medium text-foreground">
                  {totalComments.toLocaleString()} analizados
                </p>
                <p className="text-xs text-muted-foreground">
                  {filteredCount.toLocaleString()} válidos
                </p>
                {commentBreakdown && commentBreakdown.replies > 0 && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    + {commentBreakdown.replies.toLocaleString()} respuestas excluidas
                  </p>
                )}
              </div>
            </div>

            {/* Rules */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Settings className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reglas aplicadas</p>
                <div className="flex flex-wrap gap-1">
                  {activeRules.map((rule) => (
                    <Badge key={rule} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {rule}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Sort ID */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Hash className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">ID del sorteo</p>
                <div className="flex items-center gap-1.5">
                  <code className="text-sm font-mono font-medium text-foreground">
                    SRW-{sorteoHash}
                  </code>
                  <button
                    onClick={handleCopyHash}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Copiar ID"
                  >
                    {copiedHash ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Method badge */}
          <div className="mt-5 pt-5 border-t border-border/50 flex items-center justify-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-xs text-muted-foreground">
              Selección mediante <span className="font-mono text-foreground/70">crypto.getRandomValues()</span> — algoritmo criptográfico verificable
            </span>
          </div>
        </div>
      </motion.div>

      <RandomnessModal
        isOpen={showRandomnessModal}
        onClose={() => setShowRandomnessModal(false)}
      />
    </>
  );
}
