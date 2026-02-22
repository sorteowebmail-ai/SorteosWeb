"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Loader2,
  RectangleVertical,
  Square,
  Play,
  Lock,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Participant } from "@/lib/types";
import type { KitFormat, KitStyle, DrawParams } from "@/lib/canvas-kit/types";
import { FORMAT_DIMS } from "@/lib/canvas-kit/types";
import {
  generateVerificationId,
  formatDate,
} from "@/lib/canvas-kit/helpers";
import { drawStory } from "@/lib/canvas-kit/story";
import { drawPost } from "@/lib/canvas-kit/post";
import { drawVideoFrame, recordVideo, isVideoSupported } from "@/lib/canvas-kit/video";

// ─── Props ───────────────────────────────────────

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

// ─── Format / Style options ──────────────────────

const FORMAT_OPTIONS: {
  id: KitFormat;
  label: string;
  sub: string;
  icon: typeof RectangleVertical;
}[] = [
  { id: "story", label: "Historia", sub: "1080\u00D71920", icon: RectangleVertical },
  { id: "post", label: "Post", sub: "1080\u00D71080", icon: Square },
  { id: "video", label: "Video", sub: "1080\u00D71920", icon: Play },
];

const STYLE_OPTIONS: {
  id: KitStyle;
  label: string;
  desc: string;
  dots: string[];
}[] = [
  {
    id: "minimal",
    label: "Minimal",
    desc: "Limpio y elegante",
    dots: ["#FFFFFF", "#1a1a1a", "#999999"],
  },
  {
    id: "elegante",
    label: "Elegante",
    desc: "Oscuro con acentos dorados",
    dots: ["#1a1a2e", "#D4AF37", "#FFFFFF"],
  },
  {
    id: "corporativo",
    label: "Corporativo",
    desc: "Datos y transparencia",
    dots: ["#F5F5F7", "#333333", "#888888"],
  },
];

// ─── Component ───────────────────────────────────

export function ShareAnimationModal({
  isOpen,
  onClose,
  winners,
  postUrl,
  logoDataUrl,
  accentColor,
  isFreeGiveaway = false,
  backupWinners = [],
  totalComments = 0,
  filteredCount = 0,
}: ShareAnimationModalProps) {
  const [format, setFormat] = useState<KitFormat>("story");
  const [style, setStyle] = useState<KitStyle>("minimal");
  const [giveawayName, setGiveawayName] = useState("SORTEO OFICIAL");
  const [isExporting, setIsExporting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [videoOk, setVideoOk] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);

  const verificationId = useMemo(() => generateVerificationId(postUrl), [postUrl]);
  const dateString = useMemo(() => formatDate(), []);

  // Check video support on mount
  useEffect(() => {
    setVideoOk(isVideoSupported());
  }, []);

  // Load logo image
  useEffect(() => {
    if (!logoDataUrl) {
      logoRef.current = null;
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      logoRef.current = img;
    };
    img.src = logoDataUrl;
  }, [logoDataUrl]);

  // ─── Build DrawParams ────────────────────────

  const buildParams = useCallback(
    (W: number, H: number): DrawParams => ({
      W,
      H,
      winner: { username: winners[0]?.username || "usuario" },
      giveawayName,
      accentColor: accentColor || "#6B3FA0",
      logoImage: logoRef.current,
      isFreeGiveaway,
      totalComments,
      filteredCount,
      verificationId,
      dateString,
    }),
    [
      winners,
      giveawayName,
      accentColor,
      isFreeGiveaway,
      totalComments,
      filteredCount,
      verificationId,
      dateString,
    ],
  );

  // ─── Preview dimensions ──────────────────────

  const previewDims = useMemo(() => {
    const native = FORMAT_DIMS[format === "video" ? "story" : format];
    const maxH = 520;
    const scale = maxH / native.h;
    return { width: Math.round(native.w * scale), height: maxH };
  }, [format]);

  // ─── Canvas render loop ──────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = previewDims.width;
    canvas.height = previewDims.height;

    // Cancel previous animation
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    if (format === "video") {
      // Animated loop for video preview
      const startTime = performance.now();
      const loop = () => {
        const elapsed = ((performance.now() - startTime) / 1000) % 8; // 7s + 1s pause
        const params = buildParams(previewDims.width, previewDims.height);
        drawVideoFrame(ctx, params, style, Math.min(elapsed, 7));
        animRef.current = requestAnimationFrame(loop);
      };
      loop();
      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    } else {
      // Static render for story/post
      const params = buildParams(previewDims.width, previewDims.height);
      if (format === "story") drawStory(ctx, params, style);
      else drawPost(ctx, params, style);
    }
  }, [isOpen, format, style, buildParams, previewDims]);

  // Re-draw static formats when logo loads
  useEffect(() => {
    if (!isOpen || format === "video") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const params = buildParams(previewDims.width, previewDims.height);
    if (format === "story") drawStory(ctx, params, style);
    else drawPost(ctx, params, style);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoDataUrl]);

  // ─── Export handler ──────────────────────────

  const handleExport = async () => {
    if (format === "video") {
      if (isFreeGiveaway || !videoOk) return;
      setIsRecording(true);

      try {
        const exportCanvas = document.createElement("canvas");
        const dims = FORMAT_DIMS.video;
        exportCanvas.width = dims.w;
        exportCanvas.height = dims.h;

        const params = buildParams(dims.w, dims.h);
        const blob = await recordVideo(exportCanvas, params, style);

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sorteo-${style}-video-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      } finally {
        setIsRecording(false);
      }
    } else {
      setIsExporting(true);

      try {
        const exportCanvas = document.createElement("canvas");
        const dims = FORMAT_DIMS[format];
        exportCanvas.width = dims.w;
        exportCanvas.height = dims.h;
        const ctx = exportCanvas.getContext("2d")!;

        const params = buildParams(dims.w, dims.h);
        if (format === "story") drawStory(ctx, params, style);
        else drawPost(ctx, params, style);

        await new Promise<void>((resolve) => {
          exportCanvas.toBlob(
            (blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `sorteo-${style}-${format}-${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);
              }
              resolve();
            },
            "image/png",
            1,
          );
        });
      } finally {
        setIsExporting(false);
      }
    }
  };

  // ─── Derived state ───────────────────────────

  const videoLocked = isFreeGiveaway && format === "video";
  const busy = isExporting || isRecording;

  const exportLabel = (() => {
    if (busy) return "Generando\u2026";
    if (videoLocked) return "Video: solo sorteos pagos";
    const name =
      format === "story" ? "historia" : format === "post" ? "post" : "video";
    return `Descargar ${name}`;
  })();

  const formatInfo = (() => {
    const dims = FORMAT_DIMS[format === "video" ? "story" : format];
    const ext = format === "video" ? "WebM" : "PNG";
    return `${dims.w}\u00D7${dims.h} \u00B7 ${ext}`;
  })();

  // ─── Render ──────────────────────────────────

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-5xl bg-card rounded-xl border border-border/50 shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Kit de anuncio
              </h2>
              <p className="text-xs text-muted-foreground">
                Genera contenido profesional para Instagram
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Body: 2 columns */}
          <div className="flex flex-col lg:flex-row">
            {/* Preview */}
            <div className="flex-1 flex items-center justify-center p-6 bg-secondary/20 min-h-[400px]">
              <div
                className="rounded-lg overflow-hidden shadow-lg border border-border/30"
                style={{
                  width: previewDims.width,
                  height: previewDims.height,
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    width: previewDims.width,
                    height: previewDims.height,
                    display: "block",
                  }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/50 p-5 flex flex-col gap-5">
              {/* Format selector */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Formato
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMAT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = format === opt.id;
                    const isLocked =
                      opt.id === "video" && (!videoOk || isFreeGiveaway);

                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (opt.id === "video" && !videoOk) return;
                          setFormat(opt.id);
                        }}
                        className={`relative flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs transition-colors ${
                          isActive
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                        } ${!videoOk && opt.id === "video" ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {isLocked && (
                          <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-muted-foreground" />
                        )}
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {opt.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style selector */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Estilo
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {STYLE_OPTIONS.map((opt) => {
                    const isActive = style === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setStyle(opt.id)}
                        className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs transition-colors cursor-pointer ${
                          isActive
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                        }`}
                      >
                        {isActive && (
                          <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-primary" />
                        )}
                        <div className="flex gap-1">
                          {opt.dots.map((color, i) => (
                            <span
                              key={i}
                              className="w-3 h-3 rounded-full border border-border/30"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div>
                <Label
                  htmlFor="giveaway-name"
                  className="text-xs text-muted-foreground mb-2 block"
                >
                  Nombre del sorteo
                </Label>
                <Input
                  id="giveaway-name"
                  value={giveawayName}
                  onChange={(e) => setGiveawayName(e.target.value)}
                  placeholder="SORTEO OFICIAL"
                  className="h-9 text-sm"
                />
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Export */}
              <div>
                <Button
                  onClick={handleExport}
                  disabled={busy || (format === "video" && !videoOk)}
                  className={`w-full h-11 rounded-lg gap-2 text-sm font-medium ${
                    videoLocked
                      ? "bg-secondary text-foreground hover:bg-secondary/80"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : videoLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exportLabel}
                </Button>

                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{formatInfo}</span>
                  <span>
                    {isFreeGiveaway
                      ? "Incluye marca de agua"
                      : "Sin marca de agua"}
                  </span>
                </div>

                {format === "video" && !videoOk && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Video no disponible en este navegador
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
