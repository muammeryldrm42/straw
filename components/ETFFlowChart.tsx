"use client";
import { useEffect, useRef } from "react";
import { createChart, IChartApi, ColorType, LineStyle, Time } from "lightweight-charts";

interface Row { date: string; net: number; cum: number; }

export default function ETFFlowChart({ history }: { history: Row[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#6b7d93", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 },
      localization: {
        priceFormatter: (price: number) => {
          const a = Math.abs(price), s = price < 0 ? "-" : "";
          if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
          if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
          if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)}K`;
          return `${s}$${a.toFixed(0)}`;
        },
      },
      grid: { vertLines: { color: "rgba(28,39,53,0.4)" }, horzLines: { color: "rgba(28,39,53,0.4)" } },
      handleScroll: false,
      handleScale: false,
      rightPriceScale: { borderColor: "#1c2735" },
      leftPriceScale: { borderColor: "#1c2735", visible: true },
      timeScale: { borderColor: "#1c2735", timeVisible: false },
      crosshair: { mode: 1, vertLine: { color: "#2a3a4f", style: LineStyle.Dashed }, horzLine: { color: "#2a3a4f", style: LineStyle.Dashed } },
      width: ref.current.clientWidth, height: 380,
    });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => ref.current && chart.applyOptions({ width: ref.current.clientWidth }));
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !history.length) return;
    // kümülatif çizgi (sol eksen)
    const cumLine = chart.addLineSeries({ color: "#22d3ee", lineWidth: 2, priceScaleId: "left", priceLineVisible: false, lastValueVisible: true, title: "Cumulative" });
    cumLine.setData(history.map((d) => ({ time: d.date as Time, value: d.cum })));
    // günlük net akış (histogram, sağ eksen)
    const netHist = chart.addHistogramSeries({ priceScaleId: "right", priceLineVisible: false, lastValueVisible: false });
    netHist.setData(history.map((d) => ({ time: d.date as Time, value: d.net, color: d.net >= 0 ? "rgba(0,255,157,0.7)" : "rgba(255,59,107,0.7)" })) as any);
    chart.timeScale().fitContent();
    return () => { try { chart.removeSeries(cumLine); chart.removeSeries(netHist); } catch {} };
  }, [history]);

  return <div ref={ref} style={{ width: "100%", height: 380, background: "var(--bg-soft)", borderRadius: 8 }} />;
}
