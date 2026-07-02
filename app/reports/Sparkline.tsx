"use client";
import { MetricPoint } from "@/lib/history";

const SPARK_VW = 200; // SVG viewBox 論理幅（preserveAspectRatio="none" で実幅にストレッチ）

// エディトリアル・スパークライン：1本の細線＋終点の単一ドットのみ（旧 7層装飾を全廃）
export function Sparkline({ points, color, downColor, height = 40 }: {
  points: MetricPoint[];
  color: string;
  downColor: string;
  height?: number;
}) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.numericValue);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const padX = 4, padY = 7;
  const innerW = SPARK_VW - padX * 2;
  const innerH = height - padY * 2;
  const xStep = innerW / (points.length - 1);
  const toX = (i: number) => Math.round((padX + i * xStep) * 10) / 10;
  const toY = (v: number) => Math.round((((max - v) / range) * innerH + padY) * 10) / 10;
  const linePts = points.map((p, i) => `${toX(i)},${toY(p.numericValue)}`);
  const lastIdx = points.length - 1;
  const lx = toX(lastIdx), ly = toY(vals[lastIdx]);
  const trend = vals[lastIdx] >= vals[vals.length - 2] ? color : downColor;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${SPARK_VW} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`直近${points.length}期間の推移（${vals[lastIdx] >= vals[vals.length - 2] ? "上昇" : "下落"}傾向）`}
      style={{ display: "block" }}
    >
      <title>{`直近${points.length}期間の推移（${vals[lastIdx] >= vals[vals.length - 2] ? "上昇" : "下落"}傾向）`}</title>
      <polyline
        points={linePts.join(" ")} fill="none"
        stroke={trend} strokeWidth={1.25}
        strokeLinejoin="round" strokeLinecap="round"
      />
      <circle cx={lx} cy={ly} r={2} fill={trend} />
    </svg>
  );
}
