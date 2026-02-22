"use client";

import React from "react";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Check,
  Image,
  Square,
  RectangleVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Participant } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShareAnimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  winners: Participant[];
  postUrl: string;
  logoDataUrl?: string | null;
  accentColor?: string;
  isFreeGiveaway?: boolean;
  backupWinners?: Participant[];
  totalComments?: number;
  filteredCount?: number;
}

type LayoutStyle = "minimal" | "elegante" | "corporativo" | "bold";
type AspectRatio = "story" | "post" | "square";

interface EditableFields {
  title: string;
  subtitle: string;
}

interface ToggleOptions {
  showLogo: boolean;
  showDate: boolean;
  showCommentCount: boolean;
  showVerificationId: boolean;
}

interface DrawParams {
  width: number;
  height: number;
  winners: Participant[];
  backupWinners: Participant[];
  fields: EditableFields;
  toggles: ToggleOptions;
  accentColor: string;
  logoImage: HTMLImageElement | null;
  isFreeGiveaway: boolean;
  totalComments: number;
  filteredCount: number;
  sorteoHash: string;
  dateString: string;
  confetti: ConfettiParticle[];
}

interface ConfettiParticle {
  x: number;
  y: number;
  color: string;
  rotation: number;
  speed: number;
  size: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const aspectRatios: {
  id: AspectRatio;
  name: string;
  icon: React.ElementType;
  dimensions: string;
}[] = [
  { id: "story", name: "Historia", icon: RectangleVertical, dimensions: "1080x1920" },
  { id: "post", name: "Post", icon: Square, dimensions: "1080x1350" },
  { id: "square", name: "Cuadrado", icon: Square, dimensions: "1080x1080" },
];

const layoutStyles: {
  id: LayoutStyle;
  name: string;
  description: string;
  previewColors: string[];
}[] = [
  { id: "minimal", name: "Minimal", description: "Limpio y profesional", previewColors: ["#FFFFFF", "#F5F5F5", "#333333", "#999999"] },
  { id: "elegante", name: "Elegante", description: "Sofisticado y premium", previewColors: ["#1a1a2e", "#D4AF37", "#0f0f23", "#F5E6A3"] },
  { id: "corporativo", name: "Corporativo", description: "Datos y transparencia", previewColors: ["#F5F5F7", "#FFFFFF", "#E0E0E0", "#888888"] },
  { id: "bold", name: "Bold", description: "Impacto maximo", previewColors: ["#6B3FA0", "#FFFFFF", "#000000", "#9B7DC4"] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSorteoHash(postUrl: string): string {
  const input = `${postUrl}|${new Date().toISOString().slice(0, 10)}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").toUpperCase();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}

function drawLogoHelper(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  borderRadius: number,
  borderColor?: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, borderRadius);
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
  if (borderColor) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, borderRadius);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, isLight: boolean) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-30 * Math.PI / 180);
  ctx.font = `bold ${w * 0.14}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.07)";
  ctx.fillText("SorteosWeb", 0, -h * 0.15);
  ctx.fillText("SorteosWeb", 0, h * 0.15);
  ctx.restore();
}

function drawConfettiParticles(ctx: CanvasRenderingContext2D, particles: ConfettiParticle[], w: number, h: number) {
  particles.forEach((p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
    p.y += p.speed;
    p.rotation += 2;
    if (p.y > h + 20) {
      p.y = -20;
      p.x = Math.random() * w;
    }
  });
}

function buildMetadataLine(p: DrawParams): string {
  const parts: string[] = [];
  if (p.toggles.showDate) parts.push(p.dateString);
  if (p.toggles.showCommentCount) parts.push(`${p.totalComments.toLocaleString()} comentarios`);
  if (p.toggles.showVerificationId) parts.push(`SRW-${p.sorteoHash}`);
  return parts.join("  ·  ");
}

// ─── Layout: MINIMAL ──────────────────────────────────────────────────────────

function drawMinimal(ctx: CanvasRenderingContext2D, p: DrawParams) {
  const { width: w, height: h } = p;

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);

  // Logo (top-left)
  if (p.toggles.showLogo && p.logoImage) {
    const logoSize = Math.round(w * 0.10);
    drawLogoHelper(ctx, p.logoImage, w * 0.06, h * 0.04, logoSize, 6);
  }

  // Title
  ctx.textAlign = "center";
  ctx.font = `600 ${w * 0.028}px system-ui`;
  ctx.fillStyle = "#999999";
  ctx.letterSpacing = "3px";
  ctx.fillText(p.fields.title.toUpperCase(), w / 2, h * 0.12);
  ctx.letterSpacing = "0px";

  // Subtitle
  if (p.fields.subtitle) {
    ctx.font = `400 ${w * 0.032}px system-ui`;
    ctx.fillStyle = "#666666";
    ctx.fillText(p.fields.subtitle, w / 2, h * 0.16);
  }

  // Separator line
  ctx.beginPath();
  ctx.moveTo(w * 0.15, h * 0.19);
  ctx.lineTo(w * 0.85, h * 0.19);
  ctx.strokeStyle = "#E5E5E5";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Winner label
  const winnerLabel = p.winners.length > 1 ? "GANADORES" : "GANADOR";
  ctx.font = `300 ${w * 0.022}px system-ui`;
  ctx.fillStyle = "#BBBBBB";
  ctx.fillText(winnerLabel, w / 2, h * 0.25);

  // Winner names
  const singleWinner = p.winners.length === 1;
  const fontSize = singleWinner ? w * 0.075 : w * 0.052;
  const spacing = singleWinner ? 0 : h * 0.065;
  const startY = singleWinner ? h * 0.33 : h * 0.31;
  const maxRendered = Math.min(p.winners.length, 8);

  ctx.font = `700 ${fontSize}px system-ui`;
  ctx.fillStyle = "#1a1a1a";
  for (let i = 0; i < maxRendered; i++) {
    const name = truncateText(ctx, `@${p.winners[i].username}`, w * 0.85);
    ctx.fillText(name, w / 2, startY + i * spacing);
  }
  if (p.winners.length > 8) {
    ctx.font = `400 ${w * 0.025}px system-ui`;
    ctx.fillStyle = "#999999";
    ctx.fillText(`y ${p.winners.length - 8} mas...`, w / 2, startY + 8 * spacing);
  }

  let cursorY = startY + (maxRendered - 1) * spacing + h * 0.06;

  // Backups
  if (p.backupWinners.length > 0) {
    ctx.font = `400 ${w * 0.018}px system-ui`;
    ctx.fillStyle = "#BBBBBB";
    ctx.fillText("SUPLENTES", w / 2, cursorY);
    cursorY += h * 0.035;

    ctx.font = `500 ${w * 0.032}px system-ui`;
    ctx.fillStyle = "#666666";
    for (let i = 0; i < Math.min(p.backupWinners.length, 5); i++) {
      ctx.fillText(`@${p.backupWinners[i].username}`, w / 2, cursorY + i * h * 0.04);
    }
    cursorY += Math.min(p.backupWinners.length, 5) * h * 0.04 + h * 0.03;
  }

  // Separator
  ctx.beginPath();
  ctx.moveTo(w * 0.2, Math.min(cursorY, h * 0.82));
  ctx.lineTo(w * 0.8, Math.min(cursorY, h * 0.82));
  ctx.strokeStyle = "#E5E5E5";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Metadata
  const metaLine = buildMetadataLine(p);
  if (metaLine) {
    ctx.font = `400 ${w * 0.018}px system-ui`;
    ctx.fillStyle = "#BBBBBB";
    ctx.fillText(metaLine, w / 2, Math.min(cursorY + h * 0.03, h * 0.86));
  }

  // Footer
  ctx.font = `400 ${w * 0.02}px system-ui`;
  ctx.fillStyle = "#CCCCCC";
  ctx.fillText("Sorteo realizado con", w / 2, h * 0.92);
  ctx.font = `600 ${w * 0.026}px system-ui`;
  ctx.fillStyle = p.accentColor;
  ctx.fillText("SorteosWeb", w / 2, h * 0.95);

  // Watermark
  if (p.isFreeGiveaway) drawWatermark(ctx, w, h, true);
}

// ─── Layout: ELEGANTE ─────────────────────────────────────────────────────────

function drawElegante(ctx: CanvasRenderingContext2D, p: DrawParams) {
  const { width: w, height: h } = p;
  const gold = "#D4AF37";

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(0.5, "#12122a");
  grad.addColorStop(1, "#0f0f23");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle radial glow
  const glow = ctx.createRadialGradient(w / 2, h * 0.38, 0, w / 2, h * 0.38, w * 0.35);
  glow.addColorStop(0, "rgba(212,175,55,0.07)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Confetti
  if (p.confetti.length > 0) drawConfettiParticles(ctx, p.confetti, w, h);

  // Logo (top-right)
  if (p.toggles.showLogo && p.logoImage) {
    const logoSize = Math.round(w * 0.10);
    drawLogoHelper(ctx, p.logoImage, w - w * 0.06 - logoSize, h * 0.04, logoSize, 8, "rgba(212,175,55,0.3)");
  }

  // Gold ornament line
  ctx.textAlign = "center";
  const ornY = h * 0.09;
  ctx.beginPath();
  ctx.moveTo(w * 0.35, ornY);
  ctx.lineTo(w * 0.65, ornY);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Diamond center
  ctx.save();
  ctx.translate(w / 2, ornY);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = gold;
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();

  // Title
  ctx.font = `400 ${w * 0.026}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = gold;
  ctx.letterSpacing = "4px";
  ctx.fillText(p.fields.title.toUpperCase(), w / 2, h * 0.14);
  ctx.letterSpacing = "0px";

  // Subtitle
  if (p.fields.subtitle) {
    ctx.font = `400 ${w * 0.028}px system-ui`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(p.fields.subtitle, w / 2, h * 0.18);
  }

  // Winner label
  const winnerLabel = p.winners.length > 1 ? "GANADORES" : "GANADOR";
  ctx.font = `400 ${w * 0.020}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText(winnerLabel, w / 2, h * 0.24);

  // Winner names
  const singleWinner = p.winners.length === 1;
  const fontSize = singleWinner ? w * 0.065 : w * 0.048;
  const spacing = singleWinner ? 0 : h * 0.06;
  const startY = singleWinner ? h * 0.33 : h * 0.30;
  const maxRendered = Math.min(p.winners.length, 8);

  ctx.font = `700 ${fontSize}px system-ui`;
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgba(212,175,55,0.3)";
  ctx.shadowBlur = 25;
  for (let i = 0; i < maxRendered; i++) {
    const name = truncateText(ctx, `@${p.winners[i].username}`, w * 0.85);
    ctx.fillText(name, w / 2, startY + i * spacing);
  }
  ctx.shadowBlur = 0;

  if (p.winners.length > 8) {
    ctx.font = `400 ${w * 0.022}px system-ui`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(`y ${p.winners.length - 8} mas...`, w / 2, startY + 8 * spacing);
  }

  let cursorY = startY + (maxRendered - 1) * spacing + h * 0.05;

  // Gold ornament after winners
  ctx.beginPath();
  ctx.moveTo(w * 0.35, cursorY);
  ctx.lineTo(w * 0.65, cursorY);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  ctx.translate(w / 2, cursorY);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = gold;
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
  cursorY += h * 0.04;

  // Backups
  if (p.backupWinners.length > 0) {
    ctx.font = `400 ${w * 0.016}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = "rgba(212,175,55,0.5)";
    ctx.fillText("SUPLENTES", w / 2, cursorY);
    cursorY += h * 0.03;

    ctx.font = `500 ${w * 0.028}px system-ui`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < Math.min(p.backupWinners.length, 5); i++) {
      ctx.fillText(`@${p.backupWinners[i].username}`, w / 2, cursorY + i * h * 0.035);
    }
    cursorY += Math.min(p.backupWinners.length, 5) * h * 0.035;
  }

  // Metadata
  const metaLine = buildMetadataLine(p);
  if (metaLine) {
    ctx.font = `400 ${w * 0.016}px system-ui`;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(metaLine, w / 2, h * 0.84);
  }

  // Footer
  ctx.font = `400 ${w * 0.018}px system-ui`;
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("Sorteo realizado con", w / 2, h * 0.90);
  ctx.font = `600 ${w * 0.024}px system-ui`;
  ctx.fillStyle = gold;
  ctx.fillText("SorteosWeb", w / 2, h * 0.93);

  if (p.isFreeGiveaway) drawWatermark(ctx, w, h, false);
}

// ─── Layout: CORPORATIVO ──────────────────────────────────────────────────────

function drawCorporativo(ctx: CanvasRenderingContext2D, p: DrawParams) {
  const { width: w, height: h } = p;

  // Background
  ctx.fillStyle = "#F5F5F7";
  ctx.fillRect(0, 0, w, h);

  // Top accent bar
  const barH = h * 0.07;
  ctx.fillStyle = p.accentColor;
  ctx.fillRect(0, 0, w, barH);

  // Logo in bar (left)
  if (p.toggles.showLogo && p.logoImage) {
    const logoSize = Math.round(barH * 0.65);
    const logoY = (barH - logoSize) / 2;
    drawLogoHelper(ctx, p.logoImage, w * 0.04, logoY, logoSize, 4);
  }

  // Title in bar (center)
  ctx.textAlign = "center";
  ctx.font = `600 ${w * 0.024}px system-ui`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(p.fields.title.toUpperCase(), w / 2, barH / 2 + w * 0.008);

  // Subtitle
  if (p.fields.subtitle) {
    ctx.font = `400 ${w * 0.022}px system-ui`;
    ctx.fillStyle = "#666666";
    ctx.fillText(p.fields.subtitle, w / 2, barH + h * 0.035);
  }

  // Stats row — 3 boxes
  const statsY = barH + h * 0.055;
  const margin = w * 0.05;
  const gap = w * 0.025;
  const boxW = (w - margin * 2 - gap * 2) / 3;
  const boxH = h * 0.065;

  const stats = [
    { value: p.totalComments.toLocaleString(), label: "Comentarios" },
    { value: p.filteredCount.toLocaleString(), label: "Validos" },
    { value: p.winners.length.toString(), label: "Ganadores" },
  ];

  stats.forEach((stat, i) => {
    const bx = margin + i * (boxW + gap);
    // Box bg
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(bx, statsY, boxW, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = "#E0E0E0";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Value
    ctx.textAlign = "center";
    ctx.font = `600 ${w * 0.035}px system-ui`;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillText(stat.value, bx + boxW / 2, statsY + boxH * 0.48);
    // Label
    ctx.font = `400 ${w * 0.014}px system-ui`;
    ctx.fillStyle = "#888888";
    ctx.fillText(stat.label, bx + boxW / 2, statsY + boxH * 0.78);
  });

  // Winner cards
  let cardY = statsY + boxH + h * 0.03;
  const cardH = h * 0.055;
  const cardGap = h * 0.012;
  const maxRendered = Math.min(p.winners.length, 8);

  for (let i = 0; i < maxRendered; i++) {
    const cy = cardY + i * (cardH + cardGap);
    // Card bg
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(margin, cy, w - margin * 2, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = "#E0E0E0";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Number circle
    const circleR = cardH * 0.32;
    const circleX = margin + cardH * 0.5;
    const circleY = cy + cardH / 2;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.fillStyle = p.accentColor;
    ctx.fill();
    ctx.font = `700 ${circleR * 1.1}px system-ui`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText(`${i + 1}`, circleX, circleY + circleR * 0.38);

    // Username
    ctx.textAlign = "left";
    ctx.font = `600 ${w * 0.03}px system-ui`;
    ctx.fillStyle = "#1a1a1a";
    const nameX = circleX + circleR + w * 0.025;
    ctx.fillText(truncateText(ctx, `@${p.winners[i].username}`, w * 0.55), nameX, circleY + w * 0.01);
    ctx.textAlign = "center";
  }

  if (p.winners.length > 8) {
    const extraY = cardY + maxRendered * (cardH + cardGap);
    ctx.font = `400 ${w * 0.02}px system-ui`;
    ctx.fillStyle = "#888888";
    ctx.fillText(`y ${p.winners.length - 8} ganadores mas`, w / 2, extraY + h * 0.01);
  }

  // Backups
  let backupY = cardY + maxRendered * (cardH + cardGap) + h * 0.025;
  if (p.backupWinners.length > 0) {
    ctx.textAlign = "left";
    ctx.font = `600 ${w * 0.014}px system-ui`;
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText("SUPLENTES", margin, backupY);
    backupY += h * 0.018;

    const smallH = h * 0.04;
    for (let i = 0; i < Math.min(p.backupWinners.length, 5); i++) {
      const cy = backupY + i * (smallH + h * 0.008);
      ctx.fillStyle = "#FAFAFA";
      ctx.beginPath();
      ctx.roundRect(margin, cy, w - margin * 2, smallH, 6);
      ctx.fill();
      ctx.strokeStyle = "#EEEEEE";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = `500 ${w * 0.022}px system-ui`;
      ctx.fillStyle = "#666666";
      ctx.textAlign = "left";
      ctx.fillText(`S${i + 1}  @${p.backupWinners[i].username}`, margin + w * 0.03, cy + smallH * 0.62);
    }
    ctx.textAlign = "center";
    backupY += Math.min(p.backupWinners.length, 5) * (smallH + h * 0.008);
  }

  // Metadata footer block
  const metaBlockY = Math.max(backupY + h * 0.02, h * 0.78);
  const metaBlockH = h * 0.09;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(margin, metaBlockY, w - margin * 2, metaBlockH, 6);
  ctx.fill();
  ctx.strokeStyle = "#E0E0E0";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "center";
  const metaLine = buildMetadataLine(p);
  if (metaLine) {
    ctx.font = `400 ${w * 0.015}px system-ui`;
    ctx.fillStyle = "#888888";
    ctx.fillText(metaLine, w / 2, metaBlockY + metaBlockH * 0.38);
  }
  ctx.font = `400 ${w * 0.013}px system-ui`;
  ctx.fillStyle = "#AAAAAA";
  ctx.fillText("Metodo: crypto.getRandomValues() — algoritmo criptografico", w / 2, metaBlockY + metaBlockH * 0.72);

  // Footer
  ctx.font = `500 ${w * 0.018}px system-ui`;
  ctx.fillStyle = "#AAAAAA";
  ctx.fillText("Verificado por SorteosWeb", w / 2, h * 0.95);

  if (p.isFreeGiveaway) drawWatermark(ctx, w, h, true);
}

// ─── Layout: BOLD ─────────────────────────────────────────────────────────────

function drawBold(ctx: CanvasRenderingContext2D, p: DrawParams) {
  const { width: w, height: h } = p;

  // Solid accent background
  ctx.fillStyle = p.accentColor;
  ctx.fillRect(0, 0, w, h);

  // Depth overlay
  const overlay = ctx.createLinearGradient(0, 0, w, h);
  overlay.addColorStop(0, "rgba(0,0,0,0)");
  overlay.addColorStop(1, "rgba(0,0,0,0.15)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, w, h);

  // Confetti
  if (p.confetti.length > 0) drawConfettiParticles(ctx, p.confetti, w, h);

  // Logo (top-center)
  ctx.textAlign = "center";
  if (p.toggles.showLogo && p.logoImage) {
    const logoSize = Math.round(w * 0.10);
    drawLogoHelper(ctx, p.logoImage, w / 2 - logoSize / 2, h * 0.04, logoSize, 8, "rgba(255,255,255,0.5)");
  }

  // Title
  ctx.font = `800 ${w * 0.035}px system-ui`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(p.fields.title.toUpperCase(), w / 2, h * 0.17);

  // Winner names — the main show
  const singleWinner = p.winners.length === 1;
  if (singleWinner) {
    const name = `@${p.winners[0].username}`;
    const fontSize = name.length > 12 ? w * 0.09 : w * 0.12;
    ctx.font = `900 ${fontSize}px system-ui`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(truncateText(ctx, name, w * 0.9), w / 2, h * 0.45);
  } else {
    const maxRendered = Math.min(p.winners.length, 6);
    const fontSize = w * 0.07;
    const spacing = h * 0.08;
    const startY = h * 0.28;
    ctx.font = `800 ${fontSize}px system-ui`;
    ctx.fillStyle = "#FFFFFF";
    for (let i = 0; i < maxRendered; i++) {
      ctx.fillText(
        truncateText(ctx, `@${p.winners[i].username}`, w * 0.9),
        w / 2,
        startY + i * spacing,
      );
    }
    if (p.winners.length > 6) {
      ctx.font = `400 ${w * 0.03}px system-ui`;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(`y ${p.winners.length - 6} mas...`, w / 2, startY + 6 * spacing);
    }
  }

  // Subtitle
  if (p.fields.subtitle) {
    ctx.font = `400 ${w * 0.028}px system-ui`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(p.fields.subtitle, w / 2, h * 0.58);
  }

  // Backups inline
  if (p.backupWinners.length > 0) {
    const names = p.backupWinners.slice(0, 3).map((b) => `@${b.username}`).join(", ");
    ctx.font = `400 ${w * 0.022}px system-ui`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(`Suplentes: ${names}`, w / 2, h * 0.65);
  }

  // Metadata
  const metaLine = buildMetadataLine(p);
  if (metaLine) {
    ctx.font = `400 ${w * 0.016}px system-ui`;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(metaLine, w / 2, h * 0.85);
  }

  // Footer
  ctx.font = `600 ${w * 0.022}px system-ui`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("SorteosWeb", w / 2, h * 0.93);

  if (p.isFreeGiveaway) drawWatermark(ctx, w, h, false);
}

// ─── Layout registry ──────────────────────────────────────────────────────────

const LAYOUT_DRAW: Record<LayoutStyle, (ctx: CanvasRenderingContext2D, p: DrawParams) => void> = {
  minimal: drawMinimal,
  elegante: drawElegante,
  corporativo: drawCorporativo,
  bold: drawBold,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ShareAnimationModal({
  isOpen,
  onClose,
  winners,
  postUrl,
  logoDataUrl,
  accentColor = "#6B3FA0",
  isFreeGiveaway = false,
  backupWinners = [],
  totalComments = 0,
  filteredCount = 0,
}: ShareAnimationModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<LayoutStyle>("minimal");
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("story");
  const [isExporting, setIsExporting] = useState(false);

  const [editableFields, setEditableFields] = useState<EditableFields>({
    title: "SORTEO OFICIAL",
    subtitle: "",
  });

  const [toggles, setToggles] = useState<ToggleOptions>({
    showLogo: true,
    showDate: true,
    showCommentCount: false,
    showVerificationId: false,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const confettiRef = useRef<ConfettiParticle[]>([]);
  const logoImageRef = useRef<HTMLImageElement | null>(null);

  const sorteoHash = useMemo(() => generateSorteoHash(postUrl), [postUrl]);
  const dateString = useMemo(
    () =>
      new Date().toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  // Preload logo
  useEffect(() => {
    if (logoDataUrl) {
      const img = new window.Image();
      img.onload = () => {
        logoImageRef.current = img;
      };
      img.onerror = () => {
        logoImageRef.current = null;
      };
      img.src = logoDataUrl;
    } else {
      logoImageRef.current = null;
    }
  }, [logoDataUrl]);

  const getCanvasDimensions = useCallback(
    (base = 420) => {
      switch (selectedRatio) {
        case "story":
          return { width: base, height: Math.round(base * (1920 / 1080)) };
        case "post":
          return { width: base, height: Math.round(base * (1350 / 1080)) };
        case "square":
          return { width: base, height: base };
      }
    },
    [selectedRatio],
  );

  const initConfetti = useCallback(() => {
    const dims = getCanvasDimensions();
    if (selectedStyle === "elegante") {
      confettiRef.current = Array.from({ length: 40 }, () => ({
        x: Math.random() * dims.width,
        y: Math.random() * dims.height - dims.height,
        color: ["#D4AF37", "#F5E6A3", "#B8941F"][Math.floor(Math.random() * 3)],
        rotation: Math.random() * 360,
        speed: 0.4 + Math.random() * 0.8,
        size: 3 + Math.random() * 3,
      }));
    } else if (selectedStyle === "bold") {
      confettiRef.current = Array.from({ length: 70 }, () => ({
        x: Math.random() * dims.width,
        y: Math.random() * dims.height - dims.height,
        color: ["#FFFFFF", "rgba(255,255,255,0.7)", "rgba(255,255,255,0.4)"][Math.floor(Math.random() * 3)],
        rotation: Math.random() * 360,
        speed: 0.8 + Math.random() * 1.5,
        size: 4 + Math.random() * 5,
      }));
    } else {
      confettiRef.current = [];
    }
  }, [selectedStyle, getCanvasDimensions]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dims = getCanvasDimensions();
    canvas.width = dims.width;
    canvas.height = dims.height;

    const params: DrawParams = {
      width: dims.width,
      height: dims.height,
      winners,
      backupWinners,
      fields: editableFields,
      toggles,
      accentColor,
      logoImage: logoImageRef.current,
      isFreeGiveaway,
      totalComments,
      filteredCount,
      sorteoHash,
      dateString,
      confetti: confettiRef.current,
    };

    LAYOUT_DRAW[selectedStyle](ctx, params);
  }, [
    selectedStyle,
    winners,
    backupWinners,
    editableFields,
    toggles,
    accentColor,
    isFreeGiveaway,
    totalComments,
    filteredCount,
    sorteoHash,
    dateString,
    getCanvasDimensions,
  ]);

  // Animation loop
  useEffect(() => {
    if (!isOpen) return;
    initConfetti();

    const animate = () => {
      drawFrame();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isOpen, drawFrame, initConfetti]);

  // Re-init confetti on style/ratio change
  useEffect(() => {
    initConfetti();
  }, [selectedStyle, selectedRatio, initConfetti]);

  // Export at native resolution
  const handleExport = async () => {
    setIsExporting(true);

    const exportCanvas = document.createElement("canvas");
    const ratio = aspectRatios.find((r) => r.id === selectedRatio)!;
    const [width, height] = ratio.dimensions.split("x").map(Number);
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) {
      setIsExporting(false);
      return;
    }

    const params: DrawParams = {
      width,
      height,
      winners,
      backupWinners,
      fields: editableFields,
      toggles,
      accentColor,
      logoImage: logoImageRef.current,
      isFreeGiveaway,
      totalComments,
      filteredCount,
      sorteoHash,
      dateString,
      confetti: [], // Clean export without half-fallen particles
    };

    LAYOUT_DRAW[selectedStyle](ctx, params);

    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `sorteo-${selectedStyle}-${selectedRatio}-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setIsExporting(false);
      },
      "image/png",
      1,
    );
  };

  if (!isOpen) return null;

  const dims = getCanvasDimensions();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-card rounded-xl border border-border/50 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-border/50 bg-card/95 backdrop-blur-sm rounded-t-xl">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Image className="w-4 h-4 text-primary" />
                Exportar imagen
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Genera una imagen profesional para compartir
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-lg hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6">
            <div className="grid lg:grid-cols-[1fr,340px] gap-8">
              {/* Preview */}
              <div className="flex flex-col items-center">
                <div
                  className="relative rounded-lg overflow-hidden shadow-lg bg-secondary"
                  style={{ width: dims.width, height: dims.height }}
                >
                  <canvas
                    ref={canvasRef}
                    width={dims.width}
                    height={dims.height}
                    className="w-full h-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Vista previa — exporta en {aspectRatios.find((r) => r.id === selectedRatio)?.dimensions}px
                </p>
              </div>

              {/* Controls */}
              <div className="space-y-5">
                {/* Formato */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
                    Formato
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {aspectRatios.map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => setSelectedRatio(ratio.id)}
                        className={`relative p-3 rounded-lg border transition-all text-center ${
                          selectedRatio === ratio.id
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border bg-secondary/30"
                        }`}
                      >
                        <ratio.icon
                          className={`w-5 h-5 mx-auto mb-1 ${
                            selectedRatio === ratio.id ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <p className="text-xs font-medium text-foreground">{ratio.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estilo */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
                    Estilo
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {layoutStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`relative p-3 rounded-lg border transition-all text-left ${
                          selectedStyle === style.id
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border bg-secondary/30"
                        }`}
                      >
                        {selectedStyle === style.id && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <div className="flex gap-1 mb-1.5">
                          {style.previewColors.map((color, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full border border-border/30"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <p className="text-sm font-medium text-foreground">{style.name}</p>
                        <p className="text-xs text-muted-foreground">{style.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contenido */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
                    Contenido
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Titulo</Label>
                      <Input
                        value={editableFields.title}
                        onChange={(e) =>
                          setEditableFields((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="SORTEO OFICIAL"
                        className="h-9 text-sm bg-secondary/30 border-border/50 rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Subtitulo</Label>
                      <Input
                        value={editableFields.subtitle}
                        onChange={(e) =>
                          setEditableFields((prev) => ({ ...prev, subtitle: e.target.value }))
                        }
                        placeholder="@tu_cuenta"
                        className="h-9 text-sm bg-secondary/30 border-border/50 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Opciones */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
                    Opciones
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between py-1">
                      <Label className="text-sm text-foreground">Mostrar logo</Label>
                      <Switch
                        checked={toggles.showLogo}
                        onCheckedChange={(v) => setToggles((p) => ({ ...p, showLogo: v }))}
                        disabled={!logoDataUrl}
                      />
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <Label className="text-sm text-foreground">Mostrar fecha</Label>
                      <Switch
                        checked={toggles.showDate}
                        onCheckedChange={(v) => setToggles((p) => ({ ...p, showDate: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <Label className="text-sm text-foreground">Comentarios analizados</Label>
                      <Switch
                        checked={toggles.showCommentCount}
                        onCheckedChange={(v) => setToggles((p) => ({ ...p, showCommentCount: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <Label className="text-sm text-foreground">ID de verificacion</Label>
                      <Switch
                        checked={toggles.showVerificationId}
                        onCheckedChange={(v) =>
                          setToggles((p) => ({ ...p, showVerificationId: v }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Export */}
                <div className="pt-2">
                  <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-base font-medium"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar imagen
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    PNG en alta resolucion ({aspectRatios.find((r) => r.id === selectedRatio)?.dimensions}px)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
