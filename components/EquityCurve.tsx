"use client";

interface Props {
  history: { t: number; eq: number }[];
  startBalance: number;
  height?: number;
}

export default function EquityCurve({ history, startBalance, height = 80 }: Props) {
  if (history.length < 2) {
    return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontSize: 11 }}>
      Equity geçmişi yok (trade yaptıkça oluşur)
    </div>;
  }
  const w = 600, h = height;
  const eqs = history.map((p) => p.eq);
  const minEq = Math.min(...eqs, startBalance);
  const maxEq = Math.max(...eqs, startBalance);
  const range = maxEq - minEq || 1;
  const pad = 4;
  const points = history.map((p, i) => {
    const x = (i / (history.length - 1)) * (w - pad * 2) + pad;
    const y = h - pad - ((p.eq - minEq) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const startY = h - pad - ((startBalance - minEq) / range) * (h - pad * 2);
  const lastEq = eqs[eqs.length - 1];
  const positive = lastEq >= startBalance;
  const stroke = positive ? "#00ff9d" : "#ff3b6b";
  const fillId = positive ? "eqGradPos" : "eqGradNeg";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id="eqGradPos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00ff9d" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00ff9d" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="eqGradNeg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff3b6b" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ff3b6b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={0} y1={startY} x2={w} y2={startY} stroke="#43505f" strokeDasharray="3,3" strokeWidth="1" />
      <polygon points={`${pad},${h} ${points} ${w-pad},${h}`} fill={`url(#${fillId})`} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
