import { useRef, useEffect, useState, useCallback } from "react";

interface Props {
  images: string[];
  height?: number;
  style?: React.CSSProperties;
}

const R = 24; // border-radius matching the container

// ── Canvas helpers ──────────────────────────────────────────────────────────

function clipRounded(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(R, 0);
  ctx.lineTo(w - R, 0);
  ctx.arcTo(w, 0, w, R, R);
  ctx.lineTo(w, h - R);
  ctx.arcTo(w, h, w - R, h, R);
  ctx.lineTo(R, h);
  ctx.arcTo(0, h, 0, h - R, R);
  ctx.lineTo(0, R);
  ctx.arcTo(0, 0, R, 0, R);
  ctx.closePath();
}

function drawImg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  w: number,
  h: number,
  fallback = "#E4DCCF"
) {
  if (img?.naturalWidth) {
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.fillStyle = fallback;
    ctx.fillRect(0, 0, w, h);
  }
}

// ── Core render ─────────────────────────────────────────────────────────────
//
//  p = 0   → page flat (no curl)
//  p = 1   → page fully turned
//
//  Fold line sweeps from bottom-right corner toward top-left:
//    right edge point : (W,  H·(1-p))
//    bottom edge point: (W·(1-p), H)
//
function renderCurl(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  cur: HTMLImageElement | undefined,
  nxt: HTMLImageElement | undefined,
  p: number
) {
  ctx.clearRect(0, 0, W, H);

  // 1 ── Background: next image ────────────────────────────────
  ctx.save();
  clipRounded(ctx, W, H);
  ctx.clip();
  drawImg(ctx, nxt, W, H);
  ctx.restore();

  // Flat state: draw current image and return
  if (p < 0.003) {
    ctx.save();
    clipRounded(ctx, W, H);
    ctx.clip();
    drawImg(ctx, cur, W, H);
    ctx.restore();
    return;
  }

  // ── Fold geometry ─────────────────────────────────────────────────────────
  const fRX = W,           fRY = H * (1 - p);   // fold meets right edge
  const fBX = W * (1 - p), fBY = H;              // fold meets bottom edge
  const fDX = fBX - fRX,   fDY = fBY - fRY;
  const fLen = Math.hypot(fDX, fDY);
  // Unit normal pointing INTO the unturned area (toward top-left)
  const nx = -fDY / fLen;
  const ny =  fDX / fLen;

  // 2 ── Shadow cast by curling page onto revealed background ──
  ctx.save();
  clipRounded(ctx, W, H);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(fRX, fRY);
  ctx.lineTo(W, H);
  ctx.lineTo(fBX, fBY);
  ctx.closePath();
  ctx.clip();
  const sD = Math.min(fLen * 0.5, 100);
  const sg = ctx.createLinearGradient(
    fRX - nx * sD, fRY - ny * sD,
    fRX, fRY
  );
  sg.addColorStop(0, "rgba(0,0,0,0)");
  sg.addColorStop(0.6, "rgba(0,0,0,0.12)");
  sg.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // 3 ── Current image in unturned area ───────────────────────
  ctx.save();
  clipRounded(ctx, W, H);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(fRX, fRY);
  ctx.lineTo(fBX, fBY);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.clip();
  drawImg(ctx, cur, W, H);
  ctx.restore();

  // 4 ── Fold shadow darkening unturned image near the crease ──
  ctx.save();
  clipRounded(ctx, W, H);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(fRX, fRY);
  ctx.lineTo(fBX, fBY);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.clip();
  const fsD = 60;
  const fsg = ctx.createLinearGradient(
    fRX + nx * fsD, fRY + ny * fsD,
    fRX, fRY
  );
  fsg.addColorStop(0, "rgba(0,0,0,0)");
  fsg.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = fsg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // 5 ── Curl flap: the "back" of the paper ───────────────────
  ctx.save();
  clipRounded(ctx, W, H);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(fRX, fRY);
  ctx.lineTo(W, H);
  ctx.lineTo(fBX, fBY);
  ctx.closePath();
  ctx.clip();
  //  Gradient along the fold direction:
  //    at fold crease → dark shadow (paper is tightly bent)
  //    just past crease → bright specular highlight (light catching the ridge)
  //    midway → lit paper (cream/white)
  //    toward corner → gentle falloff
  const cg = ctx.createLinearGradient(fRX, fRY, W, H);
  cg.addColorStop(0,    "rgba(140,133,126,0.96)"); // dark at crease
  cg.addColorStop(0.06, "rgba(255,253,249,1.00)"); // specular ridge
  cg.addColorStop(0.22, "rgba(246,241,235,0.98)"); // bright paper
  cg.addColorStop(0.60, "rgba(230,224,216,0.97)"); // soft shadow
  cg.addColorStop(1,    "rgba(208,200,192,0.95)"); // dim corner
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // 6 ── Specular highlight line along the fold ───────────────
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(fRX, fRY);
  ctx.lineTo(fBX, fBY);
  ctx.strokeStyle = "rgba(255,255,255,0.82)";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

// ── Component ───────────────────────────────────────────────────────────────

export default function PageCurlCarousel({ images, height = 536, style }: Props) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const idxRef    = useRef(0);
  const [idx, setIdx]   = useState(0);
  const progRef   = useRef(0);  // flip animation progress 0→1
  const hpRef     = useRef(0);  // hover lift progress 0→1
  const rafRef    = useRef<number | null>(null);
  const imgsRef   = useRef<Map<string, HTMLImageElement>>(new Map());

  // ── redraw ────────────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.width  / dpr;
    const H   = canvas.height / dpr;

    const ci  = idxRef.current;
    const ni  = (ci + 1) % images.length;
    const cur = imgsRef.current.get(images[ci]);
    const nxt = imgsRef.current.get(images[ni]);

    // When hovering at rest, show a small lifted corner as affordance
    const p = progRef.current > 0 ? progRef.current : hpRef.current * 0.072;

    ctx.save();
    ctx.scale(dpr, dpr);
    renderCurl(ctx, W, H, cur, nxt, p);
    ctx.restore();
  }, [images]);

  // ── size canvas ───────────────────────────────────────────────────────────
  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = wrap.clientWidth * dpr;
    canvas.height = height * dpr;
    redraw();
  }, [height, redraw]);

  useEffect(() => {
    sizeCanvas();
    const ro = new ResizeObserver(sizeCanvas);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [sizeCanvas]);

  // ── preload images ────────────────────────────────────────────────────────
  useEffect(() => {
    images.forEach(src => {
      if (imgsRef.current.has(src)) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { imgsRef.current.set(src, img); redraw(); };
      img.src = src;
    });
  }, [images, redraw]);

  // ── hover lift ────────────────────────────────────────────────────────────
  const animateHover = useCallback((to: number) => {
    const from = hpRef.current;
    const dur  = to > 0 ? 380 : 460;
    let start: number | null = null;

    const tick = (t: number) => {
      if (!start) start = t;
      const raw  = Math.min((t - start) / dur, 1);
      const ease = raw < 0.5 ? 2 * raw * raw : -1 + (4 - 2 * raw) * raw;
      hpRef.current = from + (to - from) * ease;
      if (progRef.current === 0) redraw();
      if (raw < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [redraw]);

  // ── page flip ─────────────────────────────────────────────────────────────
  const flip = useCallback(() => {
    if (images.length <= 1 || rafRef.current !== null) return;

    const dur = 1150; // ms — deliberately unhurried
    let start: number | null = null;

    const tick = (t: number) => {
      if (!start) start = t;
      const raw  = Math.min((t - start) / dur, 1);

      // Cubic ease-in-out³ — slow lift → sweeping arc → gentle landing
      const ease = raw < 0.5
        ? 4 * raw * raw * raw
        : 1 - Math.pow(-2 * raw + 2, 3) / 2;

      progRef.current = ease;
      redraw();

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        progRef.current = 0;
        idxRef.current  = (idxRef.current + 1) % images.length;
        setIdx(idxRef.current);
        rafRef.current  = null;
        redraw();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [images, redraw]);

  const canFlip = images.length > 1;

  return (
    <div ref={wrapRef} style={{ position: "relative", height, ...style }}>
      <canvas
        ref={canvasRef}
        onClick={canFlip ? flip : undefined}
        onMouseEnter={canFlip ? () => animateHover(1) : undefined}
        onMouseLeave={canFlip ? () => animateHover(0) : undefined}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          cursor: canFlip ? "pointer" : "default",
        }}
      />

      {/* Page indicator dots */}
      {canFlip && (
        <div style={{
          position: "absolute",
          bottom: 14,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 6,
          zIndex: 4,
          pointerEvents: "none",
        }}>
          {images.map((_, i) => (
            <div key={i} style={{
              width: i === idx ? 16 : 6,
              height: 6,
              borderRadius: 3,
              background: i === idx ? "#fff" : "rgba(255,255,255,0.45)",
              transition: "width 0.3s ease",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
