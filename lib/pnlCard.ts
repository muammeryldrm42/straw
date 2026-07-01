// PnL paylaşım/indirme kartı — bağımlılıksız native canvas ile çizilir, PNG olarak indirilir.
// Kâr = yeşil/altın tema, zarar = kırmızı tema. Açık ve kapanmış pozisyonlar için kullanılır.

export interface PnlCardData {
  symbol: string;       // temiz sembol, örn "BTC-USD"
  side: "long" | "short";
  leverage: number;
  entry: number;
  current: number;      // açıkta canlı fiyat, kapalıda çıkış fiyatı
  pnl: number;          // $ kar/zarar
  roe: number;          // % kaldıraçlı ROI (ROE)
  margin: number;       // açılan margin ($ yatırılan)
  size: number;         // notional pozisyon büyüklüğü ($)
  strategy: string;
  closed?: boolean;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toPrecision(4);
}

export function buildPnlCanvas(d: PnlCardData): HTMLCanvasElement {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const win = d.pnl >= 0;
  // tema paleti
  const theme = win
    ? { bg0: "#04140d", bg1: "#0a2a1a", glow: "rgba(47,226,138,0.22)", accent: "#2fe28a", accentDim: "#1f9d63", line: "rgba(47,226,138,0.18)" }
    : { bg0: "#170505", bg1: "#2a0a0a", glow: "rgba(255,90,90,0.20)", accent: "#ff5a5a", accentDim: "#c23b3b", line: "rgba(255,90,90,0.18)" };

  // arka plan gradient
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, theme.bg0);
  g.addColorStop(1, theme.bg1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  // köşe glow
  const rg = ctx.createRadialGradient(S * 0.78, S * 0.22, 60, S * 0.78, S * 0.22, S * 0.8);
  rg.addColorStop(0, theme.glow);
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, S, S);

  // ince kenarlık çerçevesi
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 2;
  rr(ctx, 40, 40, S - 80, S - 80, 28);
  ctx.stroke();

  const cx = S / 2;
  const PAD = 90;

  // üst marka
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 34px Arial, sans-serif";
  ctx.fillText("STRATEGY DEX", PAD, 130);
  ctx.textAlign = "right";
  ctx.fillStyle = theme.accent;
  ctx.font = "700 24px Arial, sans-serif";
  ctx.fillText(d.closed ? "CLOSED" : "LIVE", S - PAD, 128);

  // sembol
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 76px Arial, sans-serif";
  ctx.fillText(d.symbol, PAD, 240);

  // side + leverage pill
  const sideTxt = d.side.toUpperCase();
  ctx.font = "800 30px Arial, sans-serif";
  const sideW = ctx.measureText(sideTxt).width + 44;
  ctx.fillStyle = win ? "rgba(47,226,138,0.16)" : "rgba(255,90,90,0.16)";
  rr(ctx, PAD, 270, sideW, 56, 12);
  ctx.fill();
  ctx.fillStyle = theme.accent;
  ctx.textAlign = "left";
  ctx.fillText(sideTxt, PAD + 22, 309);
  // leverage
  const lx = PAD + sideW + 16;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  const levTxt = `${d.leverage}x`;
  const levW = ctx.measureText(levTxt).width + 40;
  rr(ctx, lx, 270, levW, 56, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(levTxt, lx + 20, 309);

  // büyük ROE %
  const roeTxt = `${d.roe >= 0 ? "+" : ""}${d.roe.toFixed(1)}%`;
  ctx.textAlign = "center";
  ctx.fillStyle = theme.accent;
  ctx.font = "900 200px Arial, sans-serif";
  ctx.fillText(roeTxt, cx, 560);
  // ROI etiketi
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "700 28px Arial, sans-serif";
  ctx.fillText("ROI (ROE)", cx, 610);

  // PnL $
  const pnlTxt = `${d.pnl >= 0 ? "+" : "-"}$${Math.abs(d.pnl).toFixed(2)}`;
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 72px Arial, sans-serif";
  ctx.fillText(pnlTxt, cx, 710);

  // entry -> current/exit
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 30px Arial, sans-serif";
  ctx.fillText(`${fmtPrice(d.entry)}  →  ${fmtPrice(d.current)}`, cx, 770);

  // alt bilgi kutuları (margin / size / strategy)
  const boxY = 830, boxH = 110, gap = 24;
  const boxW = (S - PAD * 2 - gap * 2) / 3;
  const boxes: [string, string][] = [
    ["OPENED", `$${d.margin.toFixed(2)}`],
    ["POSITION SIZE", `$${d.size.toFixed(0)}`],
    ["STRATEGY", d.strategy.length > 16 ? d.strategy.slice(0, 15) + "…" : d.strategy],
  ];
  boxes.forEach((b, i) => {
    const bx = PAD + i * (boxW + gap);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    rr(ctx, bx, boxY, boxW, boxH, 14);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "700 18px Arial, sans-serif";
    ctx.fillText(b[0], bx + 20, boxY + 38);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 30px Arial, sans-serif";
    ctx.fillText(b[1], bx + 20, boxY + 80);
  });

  // alt watermark
  ctx.textAlign = "center";
  ctx.fillStyle = theme.accentDim;
  ctx.font = "700 26px Arial, sans-serif";
  ctx.fillText("straw-pearl.vercel.app", cx, S - 56);

  return canvas;
}

// Önizleme için PNG data URL (img src ile gösterilebilir)
export function pnlCardDataURL(d: PnlCardData): string {
  return buildPnlCanvas(d).toDataURL("image/png");
}

// Doğrudan indir (data URL'den)
export function downloadPnlCard(d: PnlCardData) {
  const win = d.pnl >= 0;
  const a = document.createElement("a");
  a.href = pnlCardDataURL(d);
  a.download = `strategy-dex-${d.symbol}-${d.side}-${win ? "profit" : "loss"}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
