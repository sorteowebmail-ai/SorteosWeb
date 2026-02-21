"use client";

import React from "react"

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Play,
  Pause,
  Check,
  Sparkles,
  Square,
  RectangleVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Participant } from "@/lib/types";

interface ShareAnimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  winners: Participant[];
  postUrl: string;
  logoDataUrl?: string | null;
  accentColor?: string;
  isFreeGiveaway?: boolean;
  backupWinners?: Participant[];
}

type AnimationStyle = "confetti" | "elegant" | "neon" | "minimal" | "party" | "gradient";
type AspectRatio = "story" | "post" | "square";

const animationStyles: {
  id: AnimationStyle;
  name: string;
  description: string;
  colors: string[];
}[] = [
  {
    id: "confetti",
    name: "Confetti",
    description: "Colorido y festivo",
    colors: ["#FF6B6B", "#4ECDC4", "#FED766", "#FF9F43"],
  },
  {
    id: "elegant",
    name: "Elegante",
    description: "Sofisticado y profesional",
    colors: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
  },
  {
    id: "neon",
    name: "Neon",
    description: "Brillante y moderno",
    colors: ["#0a0a0a", "#00ff88", "#00d4ff", "#ff00ff"],
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple y limpio",
    colors: ["#ffffff", "#f5f5f5", "#333333", "#FF6B6B"],
  },
  {
    id: "party",
    name: "Fiesta",
    description: "Alegre y vibrante",
    colors: ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3"],
  },
  {
    id: "gradient",
    name: "Gradiente",
    description: "Suave y atractivo",
    colors: ["#667eea", "#764ba2", "#f093fb", "#f5576c"],
  },
];

const aspectRatios: { id: AspectRatio; name: string; icon: React.ElementType; dimensions: string }[] = [
  { id: "story", name: "Historia", icon: RectangleVertical, dimensions: "1080x1920" },
  { id: "post", name: "Post", icon: Square, dimensions: "1080x1350" },
  { id: "square", name: "Cuadrado", icon: Square, dimensions: "1080x1080" },
];

export function ShareAnimationModal({
  isOpen,
  onClose,
  winners,
  postUrl,
  logoDataUrl,
  accentColor = "#FF6B6B",
  isFreeGiveaway = false,
  backupWinners = [],
}: ShareAnimationModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<AnimationStyle>("confetti");
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("story");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<"intro" | "reveal" | "celebration">("intro");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const confettiRef = useRef<{ x: number; y: number; color: string; rotation: number; speed: number; size: number }[]>([]);
  const logoImageRef = useRef<HTMLImageElement | null>(null);

  // Preload logo image
  useEffect(() => {
    if (logoDataUrl) {
      const img = new Image();
      img.onload = () => { logoImageRef.current = img; };
      img.onerror = () => { logoImageRef.current = null; };
      img.src = logoDataUrl;
    } else {
      logoImageRef.current = null;
    }
  }, [logoDataUrl]);

  const currentStyle = animationStyles.find((s) => s.id === selectedStyle)!;

  const getCanvasDimensions = useCallback(() => {
    const baseWidth = 320;
    switch (selectedRatio) {
      case "story":
        return { width: baseWidth, height: Math.round(baseWidth * (1920 / 1080)) };
      case "post":
        return { width: baseWidth, height: Math.round(baseWidth * (1350 / 1080)) };
      case "square":
        return { width: baseWidth, height: baseWidth };
    }
  }, [selectedRatio]);

  const initConfetti = useCallback(() => {
    const dims = getCanvasDimensions();
    confettiRef.current = Array.from({ length: 100 }, () => ({
      x: Math.random() * dims.width,
      y: Math.random() * dims.height - dims.height,
      color: currentStyle.colors[Math.floor(Math.random() * currentStyle.colors.length)],
      rotation: Math.random() * 360,
      speed: 1 + Math.random() * 3,
      size: 4 + Math.random() * 8,
    }));
  }, [getCanvasDimensions, currentStyle.colors]);

  const drawAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dims = getCanvasDimensions();
    canvas.width = dims.width;
    canvas.height = dims.height;

    // Dynamic colors: use accentColor as first color
    const dynamicColors = [accentColor, "#4ECDC4", "#FED766", "#C792EA", "#45B7D1", "#FF9F43"];

    // Background
    if (selectedStyle === "elegant") {
      const gradient = ctx.createLinearGradient(0, 0, 0, dims.height);
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
      ctx.fillStyle = gradient;
    } else if (selectedStyle === "neon") {
      ctx.fillStyle = "#0a0a0a";
    } else if (selectedStyle === "minimal") {
      ctx.fillStyle = "#ffffff";
    } else if (selectedStyle === "gradient") {
      const gradient = ctx.createLinearGradient(0, 0, dims.width, dims.height);
      gradient.addColorStop(0, "#667eea");
      gradient.addColorStop(0.5, "#764ba2");
      gradient.addColorStop(1, "#f093fb");
      ctx.fillStyle = gradient;
    } else {
      const gradient = ctx.createLinearGradient(0, 0, dims.width, dims.height);
      gradient.addColorStop(0, currentStyle.colors[0]);
      gradient.addColorStop(1, currentStyle.colors[1] || currentStyle.colors[0]);
      ctx.fillStyle = gradient;
    }
    ctx.fillRect(0, 0, dims.width, dims.height);

    // Draw confetti for confetti and party styles
    if ((selectedStyle === "confetti" || selectedStyle === "party") && animationPhase === "celebration") {
      confettiRef.current.forEach((particle) => {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
        ctx.restore();

        // Update position
        particle.y += particle.speed;
        particle.rotation += 2;
        if (particle.y > dims.height + 20) {
          particle.y = -20;
          particle.x = Math.random() * dims.width;
        }
      });
    }

    // Neon glow effect
    if (selectedStyle === "neon") {
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#00ff88";
    }

    // Draw user logo (top-right corner)
    if (logoImageRef.current) {
      const logoSize = Math.round(dims.width * 0.12);
      const logoMargin = 12;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(dims.width - logoSize - logoMargin, logoMargin, logoSize, logoSize, 8);
      ctx.clip();
      ctx.drawImage(logoImageRef.current, dims.width - logoSize - logoMargin, logoMargin, logoSize, logoSize);
      ctx.restore();
    }

    // Header badge
    const badgeY = dims.height * 0.12;
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    
    if (selectedStyle === "minimal") {
      ctx.fillStyle = accentColor;
    } else if (selectedStyle === "neon") {
      ctx.fillStyle = "#00ff88";
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
    }

    const badgeText = "SORTEO OFICIAL";
    const badgeWidth = ctx.measureText(badgeText).width + 24;

    // Badge background
    ctx.beginPath();
    const badgeX = dims.width / 2 - badgeWidth / 2;
    ctx.roundRect(badgeX, badgeY - 10, badgeWidth, 24, 12);
    if (selectedStyle === "minimal") {
      ctx.fillStyle = `${accentColor}15`;
    } else if (selectedStyle === "neon") {
      ctx.fillStyle = "rgba(0,255,136,0.2)";
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
    }
    ctx.fill();

    // Badge text
    if (selectedStyle === "minimal") {
      ctx.fillStyle = accentColor;
    } else if (selectedStyle === "neon") {
      ctx.fillStyle = "#00ff88";
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
    }
    ctx.fillText(badgeText, dims.width / 2, badgeY + 4);

    // Title
    const titleY = dims.height * 0.22;
    ctx.font = `bold ${dims.width * 0.08}px system-ui`;
    if (selectedStyle === "minimal") {
      ctx.fillStyle = "#333333";
    } else if (selectedStyle === "neon") {
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#00d4ff";
    } else {
      ctx.fillStyle = "#ffffff";
    }
    
    const title = winners.length > 1 ? "GANADORES" : "GANADOR";
    ctx.fillText(title, dims.width / 2, titleY);
    ctx.shadowBlur = 0;

    // Trophy/celebration emoji
    const emojiY = dims.height * 0.30;
    ctx.font = `${dims.width * 0.12}px system-ui`;
    ctx.fillText("🏆", dims.width / 2, emojiY);

    // Calculate layout for winners + backups
    const hasBackups = backupWinners.length > 0;
    const totalCards = winners.length + (hasBackups ? backupWinners.length + 1 : 0);
    const availableHeight = dims.height * (hasBackups ? 0.48 : 0.4);
    const winnerSpacing = Math.min(64, availableHeight / Math.max(totalCards, 1));
    const startY = dims.height * 0.38;

    // Main winners
    winners.forEach((winner, index) => {
      const y = startY + index * winnerSpacing;

      const cardWidth = dims.width * 0.85;
      const cardHeight = Math.min(52, winnerSpacing - 4);
      const cardX = (dims.width - cardWidth) / 2;

      ctx.beginPath();
      ctx.roundRect(cardX, y - cardHeight / 2 + 10, cardWidth, cardHeight, 16);

      if (selectedStyle === "minimal") {
        ctx.fillStyle = "#f5f5f5";
      } else if (selectedStyle === "neon") {
        ctx.fillStyle = "rgba(0,255,136,0.1)";
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
      }
      ctx.fill();

      // Winner number circle (uses accent color)
      const numberX = cardX + 28;
      const numberY = y + 16;
      ctx.beginPath();
      ctx.arc(numberX, numberY, 14, 0, Math.PI * 2);
      if (selectedStyle === "neon") {
        ctx.fillStyle = "#00ff88";
      } else {
        ctx.fillStyle = dynamicColors[index % dynamicColors.length];
      }
      ctx.fill();

      ctx.font = "bold 13px system-ui";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${index + 1}`, numberX, numberY + 5);

      // Winner username
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "left";
      if (selectedStyle === "minimal") {
        ctx.fillStyle = "#333333";
      } else {
        ctx.fillStyle = "#ffffff";
      }
      ctx.fillText(`@${winner.username}`, numberX + 26, numberY + 5);
      ctx.textAlign = "center";
    });

    // Backup winners section
    if (hasBackups) {
      const backupStartY = startY + winners.length * winnerSpacing + 14;

      // "SUPLENTES" header
      ctx.font = "bold 11px system-ui";
      if (selectedStyle === "minimal") {
        ctx.fillStyle = "#999999";
      } else if (selectedStyle === "neon") {
        ctx.fillStyle = "#00ff8880";
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
      }
      ctx.fillText("SUPLENTES", dims.width / 2, backupStartY);

      backupWinners.forEach((backup, index) => {
        const y = backupStartY + 10 + (index + 1) * (winnerSpacing * 0.8);

        const cardWidth = dims.width * 0.75;
        const cardHeight = Math.min(42, winnerSpacing * 0.7);
        const cardX = (dims.width - cardWidth) / 2;

        ctx.beginPath();
        ctx.roundRect(cardX, y - cardHeight / 2 + 8, cardWidth, cardHeight, 12);

        if (selectedStyle === "minimal") {
          ctx.fillStyle = "#fafafa";
        } else if (selectedStyle === "neon") {
          ctx.fillStyle = "rgba(0,255,136,0.05)";
          ctx.strokeStyle = "#00ff8840";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.08)";
        }
        ctx.fill();

        const numberX = cardX + 24;
        const numberY = y + 14;
        ctx.beginPath();
        ctx.arc(numberX, numberY, 11, 0, Math.PI * 2);
        ctx.fillStyle = selectedStyle === "minimal" ? "#e0e0e0" : selectedStyle === "neon" ? "#00ff8860" : "rgba(255,255,255,0.2)";
        ctx.fill();

        ctx.font = "bold 10px system-ui";
        ctx.fillStyle = selectedStyle === "minimal" ? "#999999" : "rgba(255,255,255,0.7)";
        ctx.fillText(`S${index + 1}`, numberX, numberY + 4);

        ctx.font = "14px system-ui";
        ctx.textAlign = "left";
        if (selectedStyle === "minimal") {
          ctx.fillStyle = "#666666";
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.7)";
        }
        ctx.fillText(`@${backup.username}`, numberX + 22, numberY + 5);
        ctx.textAlign = "center";
      });
    }

    // Footer
    const footerY = dims.height * 0.88;
    ctx.font = "12px system-ui";
    if (selectedStyle === "minimal") {
      ctx.fillStyle = "#999999";
    } else if (selectedStyle === "neon") {
      ctx.fillStyle = "#00ff8880";
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
    }
    ctx.fillText("Sorteo realizado con", dims.width / 2, footerY);

    // SorteoWeb branding
    ctx.font = "bold 16px system-ui";
    if (selectedStyle === "neon") {
      ctx.fillStyle = "#00ff88";
    } else if (selectedStyle === "minimal") {
      ctx.fillStyle = accentColor;
    } else {
      ctx.fillStyle = "#ffffff";
    }
    ctx.fillText("SorteoWeb", dims.width / 2, footerY + 22);

    ctx.font = "20px system-ui";
    ctx.fillText("✨", dims.width / 2 - 60, footerY + 22);
    ctx.fillText("✨", dims.width / 2 + 60, footerY + 22);

    // Watermark for free tier
    if (isFreeGiveaway) {
      ctx.save();
      ctx.translate(dims.width / 2, dims.height / 2);
      ctx.rotate(-30 * Math.PI / 180);
      ctx.font = `bold ${dims.width * 0.14}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = selectedStyle === "minimal"
        ? "rgba(0,0,0,0.06)"
        : "rgba(255,255,255,0.08)";
      ctx.fillText("SorteoWeb", 0, -dims.height * 0.15);
      ctx.fillText("SorteoWeb", 0, dims.height * 0.15);
      ctx.restore();
    }

  }, [getCanvasDimensions, selectedStyle, currentStyle, winners, animationPhase, accentColor, backupWinners, isFreeGiveaway]);

  // Animation loop
  useEffect(() => {
    if (!isOpen) return;

    initConfetti();

    // Animation phases
    const phaseTimer = setTimeout(() => {
      setAnimationPhase("reveal");
      setTimeout(() => setAnimationPhase("celebration"), 1000);
    }, 500);

    const animate = () => {
      if (isPlaying) {
        drawAnimation();
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      clearTimeout(phaseTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isOpen, isPlaying, drawAnimation, initConfetti]);

  // Redraw when style changes
  useEffect(() => {
    initConfetti();
    setAnimationPhase("intro");
    setTimeout(() => setAnimationPhase("reveal"), 300);
    setTimeout(() => setAnimationPhase("celebration"), 800);
  }, [selectedStyle, selectedRatio, initConfetti]);

  const handleExport = async () => {
    setIsExporting(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create high-res export canvas
    const exportCanvas = document.createElement("canvas");
    const ratio = aspectRatios.find((r) => r.id === selectedRatio)!;
    const [width, height] = ratio.dimensions.split("x").map(Number);
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Draw at high resolution
    ctx.scale(width / canvas.width, height / canvas.height);
    ctx.drawImage(canvas, 0, 0);

    // Convert to blob and download
    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `sorteo-sorteoweb-${selectedRatio}-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setIsExporting(false);
      },
      "image/png",
      1
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
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card rounded-3xl border border-border/50 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border/50 bg-card/95 backdrop-blur-sm rounded-t-3xl">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Compartir Animacion
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Descarga una imagen para compartir en Instagram
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Preview */}
              <div className="flex flex-col items-center">
                <div
                  className="relative rounded-2xl overflow-hidden shadow-2xl bg-secondary"
                  style={{ width: dims.width, height: dims.height }}
                >
                  <canvas
                    ref={canvasRef}
                    width={dims.width}
                    height={dims.height}
                    className="w-full h-full"
                  />

                  {/* Play/Pause overlay */}
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  Vista previa - {aspectRatios.find((r) => r.id === selectedRatio)?.dimensions}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-6">
                {/* Aspect Ratio */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Formato</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {aspectRatios.map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => setSelectedRatio(ratio.id)}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          selectedRatio === ratio.id
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border bg-secondary/30"
                        }`}
                      >
                        {selectedRatio === ratio.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <ratio.icon
                          className={`w-8 h-8 mx-auto mb-2 ${
                            selectedRatio === ratio.id ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <p className="text-sm font-medium text-foreground">{ratio.name}</p>
                        <p className="text-xs text-muted-foreground">{ratio.dimensions}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation Style */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Estilo</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {animationStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                          selectedStyle === style.id
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border bg-secondary/30"
                        }`}
                      >
                        {selectedStyle === style.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="flex gap-1 mb-2">
                          {style.colors.slice(0, 4).map((color, i) => (
                            <div
                              key={i}
                              className="w-5 h-5 rounded-full"
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

                {/* Tips */}
                <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                  <h4 className="text-sm font-medium text-foreground mb-2">Consejos</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Usa "Historia" (9:16) para Instagram Stories</li>
                    <li>• Usa "Post" (4:5) para el feed de Instagram</li>
                    <li>• Tambien puedes grabar la pantalla durante el sorteo</li>
                  </ul>
                </div>

                {/* Export Button */}
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-[#FF8A80] hover:opacity-90 text-lg font-semibold"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Descargar Imagen
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  La imagen se descargara en alta resolucion ({aspectRatios.find((r) => r.id === selectedRatio)?.dimensions}px)
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
