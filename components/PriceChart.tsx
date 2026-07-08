"use client";
import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, ColorType, LineStyle, LineData } from "lightweight-charts";
import { Candle } from "@/lib/indicators";
import { Position } from "@/lib/wallet";
import * as TA from "@/lib/chartIndicators";

interface Props {
  candles: Candle[];
  positions: Position[];
  symbol: string;
  indicators?: string[];
}

const toLine = (candles: Candle[], vals: number[]): LineData[] =>
  candles.map((c, i) => ({ time: c.time as Time, value: vals[i] })).filter((d) => isFinite(d.value as number)) as LineData[];

const baseChartOpts = (h: number) => ({
  layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#6b7d93", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 },
  grid: { vertLines: { color: "rgba(28, 39, 53, 0.5)" }, horzLines: { color: "rgba(28, 39, 53, 0.5)" } },
  rightPriceScale: { borderColor: "#1c2735" },
  timeScale: { borderColor: "#1c2735", timeVisible: true, secondsVisible: false },
  crosshair: { mode: 1 as const, vertLine: { color: "#2a3a4f", style: LineStyle.Dashed }, horzLine: { color: "#2a3a4f", style: LineStyle.Dashed } },
  height: h,
});

export default function PriceChart({ candles, positions, symbol, indicators = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const oscWrap = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const posLinesRef = useRef<any[]>([]);
  const lvlLinesRef = useRef<any[]>([]);
  const overlaysRef = useRef<ISeriesApi<any>[]>([]);
  const oscRef = useRef<{ chart: IChartApi; el: HTMLDivElement }[]>([]);
  const indKey = indicators.slice().sort().join(",");

  // ana chart (1 kez)
  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, { ...baseChartOpts(460), width: ref.current.clientWidth });
    const series = chart.addCandlestickSeries({
      upColor: "#00ff9d", downColor: "#ff3b6b", borderUpColor: "#00ff9d", borderDownColor: "#ff3b6b",
      wickUpColor: "#00b873", wickDownColor: "#c41f4a",
    });
    chartRef.current = chart; seriesRef.current = series;
    const ro = new ResizeObserver(() => {
      if (ref.current) { chart.applyOptions({ width: ref.current.clientWidth }); oscRef.current.forEach(({ chart: c, el }) => c.applyOptions({ width: el.clientWidth })); }
    });
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; seriesRef.current = null; };
  }, []);

  // mum verisi
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;
    const last = candles[candles.length - 1].close;
    const p = last >= 1000 ? 2 : last >= 1 ? 3 : last >= 0.1 ? 4 : last >= 0.01 ? 5 : last >= 0.001 ? 6 : last >= 0.0001 ? 7 : last >= 0.00001 ? 8 : last >= 0.000001 ? 9 : 10;
    seriesRef.current.applyOptions({ priceFormat: { type: "price", precision: p, minMove: Math.pow(10, -p) } });
    seriesRef.current.setData(candles.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })) as CandlestickData[]);
    chartRef.current?.timeScale().fitContent();
  }, [candles, symbol]);

  // overlay'ler + seviye çizgileri (indicators)
  useEffect(() => {
    const chart = chartRef.current, series = seriesRef.current;
    if (!chart || !series || candles.length === 0) return;
    overlaysRef.current.forEach((s) => { try { chart.removeSeries(s); } catch {} });
    overlaysRef.current = [];
    lvlLinesRef.current.forEach((pl) => { try { series.removePriceLine(pl); } catch {} });
    lvlLinesRef.current = [];

    const closes = candles.map((c) => c.close);
    const addLine = (vals: number[], color: string, w = 1, style = LineStyle.Solid) => {
      const s = chart.addLineSeries({ color, lineWidth: w as any, lineStyle: style, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      s.setData(toLine(candles, vals)); overlaysRef.current.push(s);
    };
    const addLvl = (price: number, color: string, title: string, style = LineStyle.Dashed) => {
      lvlLinesRef.current.push(series.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title }));
    };
    const has = (k: string) => indicators.includes(k);

    if (has("ema20")) addLine(TA.ema(closes, 20), "#f0b90b");
    if (has("ema50")) addLine(TA.ema(closes, 50), "#3b82f6");
    if (has("ema200")) addLine(TA.ema(closes, 200), "#a855f7", 2);
    if (has("sma20")) addLine(TA.sma(closes, 20), "#facc15", 1, LineStyle.Dotted);
    if (has("sma50")) addLine(TA.sma(closes, 50), "#60a5fa", 1, LineStyle.Dotted);
    if (has("sma200")) addLine(TA.sma(closes, 200), "#c084fc", 2, LineStyle.Dotted);
    if (has("vwap")) addLine(TA.vwap(candles), "#22d3ee", 2);
    if (has("bb")) { const b = TA.bollingerBands(closes, 20, 2); addLine(b.upper, "#787b86"); addLine(b.middle, "#787b86", 1, LineStyle.Dashed); addLine(b.lower, "#787b86"); }
    if (has("ichimoku")) { const ic = TA.ichimoku(candles); addLine(ic.tenkan, "#2196f3"); addLine(ic.kijun, "#e91e63"); addLine(ic.senkouA, "#26a69a", 1, LineStyle.Dotted); addLine(ic.senkouB, "#ef5350", 1, LineStyle.Dotted); }
    if (has("supertrend")) { const st = TA.superTrend(candles, 10, 3); addLine(st.line, "#00e5ff", 2); }
    if (has("donchian")) { const d = TA.donchian(candles, 20); addLine(d.upper, "#26a69a"); addLine(d.mid, "#787b86", 1, LineStyle.Dashed); addLine(d.lower, "#ef5350"); }
    if (has("psar")) { const s = chart.addLineSeries({ color: "#e0e0e0", lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, pointMarkersVisible: true }); s.setData(toLine(candles, TA.psar(candles))); overlaysRef.current.push(s); }

    if (has("volume")) {
      const vs = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol", priceLineVisible: false, lastValueVisible: false });
      vs.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      vs.setData(candles.map((c) => ({ time: c.time as Time, value: c.volume, color: c.close >= c.open ? "rgba(0,255,157,0.4)" : "rgba(255,59,107,0.4)" })) as any);
      overlaysRef.current.push(vs);
    }
    if (has("fib")) { const f = TA.fibLevels(candles); f?.forEach((l) => addLvl(l.price, "#f0b90b", `Fib ${l.ratio}`)); }
    if (has("sr")) { TA.supportResistance(candles, 8, 6).forEach((l) => addLvl(l.price, l.type === "res" ? "#ff3b6b" : "#00ff9d", l.type === "res" ? "R" : "S", LineStyle.Dotted)); }
    if (has("pivot")) { const p = TA.pivotPoints(candles); if (p) { addLvl(p.pp, "#f0b90b", "PP", LineStyle.Solid); addLvl(p.r1, "#ff3b6b", "R1"); addLvl(p.r2, "#ff3b6b", "R2"); addLvl(p.r3, "#ff3b6b", "R3"); addLvl(p.s1, "#00ff9d", "S1"); addLvl(p.s2, "#00ff9d", "S2"); addLvl(p.s3, "#00ff9d", "S3"); } }
  }, [indKey, candles, symbol]);

  // oscillator panelleri (alt, senkronize)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !oscWrap.current || candles.length === 0) return;
    oscRef.current.forEach(({ chart: c, el }) => { try { c.remove(); } catch {}; el.remove(); });
    oscRef.current = [];

    const closes = candles.map((c) => c.close);
    const oscDefs = ["rsi", "macd", "stochastic", "cci", "mfi", "obv", "atr", "williamsR", "adx"];
    const active = oscDefs.filter((o) => indicators.includes(o));

    active.forEach((name) => {
      const el = document.createElement("div");
      el.style.cssText = "width:100%;height:120px;margin-top:6px;position:relative;border-top:1px solid rgba(28,39,53,0.6);";
      const label = document.createElement("div");
      label.textContent = name.toUpperCase();
      label.style.cssText = "position:absolute;top:4px;left:8px;z-index:3;font:700 10px 'JetBrains Mono',monospace;color:#6b7d93;";
      el.appendChild(label);
      oscWrap.current!.appendChild(el);
      const oc = createChart(el, { ...baseChartOpts(120), width: el.clientWidth, timeScale: { borderColor: "#1c2735", visible: false } });
      const line = (vals: number[], color: string, w = 1) => { const s = oc.addLineSeries({ color, lineWidth: w as any, priceLineVisible: false, lastValueVisible: true }); s.setData(toLine(candles, vals)); };
      const hline = (val: number, color: string) => { const s = oc.addLineSeries({ color, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }); s.setData(candles.map((c) => ({ time: c.time as Time, value: val }))); };

      if (name === "rsi") { hline(70, "#3a4a5f"); hline(30, "#3a4a5f"); line(TA.rsi(closes, 14), "#a855f7", 2); }
      else if (name === "macd") { const m = TA.macd(closes); const hs = oc.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false }); hs.setData(candles.map((c, i) => ({ time: c.time as Time, value: m.histogram[i], color: m.histogram[i] >= 0 ? "rgba(0,255,157,0.5)" : "rgba(255,59,107,0.5)" })).filter((d) => isFinite(d.value)) as any); line(m.macd, "#3b82f6"); line(m.signal, "#f0b90b"); }
      else if (name === "stochastic") { const s = TA.stochastic(candles); hline(80, "#3a4a5f"); hline(20, "#3a4a5f"); line(s.k, "#3b82f6"); line(s.d, "#ff3b6b"); }
      else if (name === "cci") { hline(100, "#3a4a5f"); hline(-100, "#3a4a5f"); line(TA.cci(candles, 20), "#22d3ee", 2); }
      else if (name === "mfi") { hline(80, "#3a4a5f"); hline(20, "#3a4a5f"); line(TA.mfi(candles, 14), "#f0b90b", 2); }
      else if (name === "obv") { line(TA.obv(candles), "#00ff9d", 2); }
      else if (name === "atr") { line(TA.atr(candles, 14), "#facc15", 2); }
      else if (name === "williamsR") { hline(-20, "#3a4a5f"); hline(-80, "#3a4a5f"); line(TA.williamsR(candles, 14), "#e91e63", 2); }
      else if (name === "adx") { const a = TA.adx(candles, 14); hline(25, "#3a4a5f"); line(a.adx, "#f0b90b", 2); line(a.plusDI, "#00ff9d"); line(a.minusDI, "#ff3b6b"); }

      const r = chart.timeScale().getVisibleLogicalRange();
      if (r) oc.timeScale().setVisibleLogicalRange(r);
      oscRef.current.push({ chart: oc, el });
    });

    const sync = () => { const r = chart.timeScale().getVisibleLogicalRange(); if (r) oscRef.current.forEach(({ chart: c }) => { try { c.timeScale().setVisibleLogicalRange(r); } catch {} }); };
    chart.timeScale().subscribeVisibleLogicalRangeChange(sync);
    return () => { try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(sync); } catch {} };
  }, [indKey, candles, symbol]);

  // pozisyon çizgileri
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    posLinesRef.current.forEach((pl) => { try { series.removePriceLine(pl); } catch {} });
    posLinesRef.current = [];
    positions.filter((p) => p.symbol === symbol).forEach((pos) => {
      const clr = pos.side === "long" ? "#00ff9d" : "#ff3b6b";
      posLinesRef.current.push(series.createPriceLine({ price: pos.entry, color: clr, lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: `${pos.side.toUpperCase()} ${pos.leverage}x` }));
      if (pos.stop_loss > 0) posLinesRef.current.push(series.createPriceLine({ price: pos.stop_loss, color: "#ff3b6b", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "SL" }));
      pos.take_profit.forEach((tp, i) => posLinesRef.current.push(series.createPriceLine({ price: tp, color: "#00ff9d", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `TP${i + 1}` })));
      posLinesRef.current.push(series.createPriceLine({ price: pos.liquidation, color: "#a855f7", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "LIQ" }));
    });
  }, [positions, symbol, candles.length, indKey]);

  return (
    <div>
      <div ref={ref} style={{ width: "100%", height: 460, background: "var(--bg-soft)", borderRadius: 8 }} />
      <div ref={oscWrap} />
    </div>
  );
}
