import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  Text as SvgText,
  G,
} from "react-native-svg";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, type } from "../theme";

const BRAND = "#096136";
const PALETTE = [
  "#096136",
  "#237e56",
  "#349e6f",
  "#5bbd90",
  "#91d7b3",
  "#c2ead2",
];

interface SalesTrendChartProps {
  data: Array<{ date: string; amountCents: number }>;
  title?: string;
  total?: string;
  height?: number;
}

export function SalesTrendChart({
  data,
  title,
  total,
  height = 220,
}: SalesTrendChartProps) {
  const { colors } = useTheme();
  const chartW = 340;
  const chartH = height - 50;
  const padL = 36;
  const padR = 8;
  const padT = 8;
  const padB = 24;
  const drawW = chartW - padL - padR;
  const drawH = chartH - padT - padB;

  if (!data.length) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
        {title && (
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <TrendingUpIcon />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          </View>
        )}
        <View style={[styles.empty, { height: chartH }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data</Text>
        </View>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.amountCents), 1);
  const padVal = drawH * 0.05;
  const usableH = drawH - padVal * 2;

  const points = data.map((d, i) => {
    const x = padL + (i / Math.max(data.length - 1, 1)) * drawW;
    const y = padT + padVal + usableH - (d.amountCents / maxVal) * usableH;
    return { x, y };
  });

  const areaPath = buildAreaPath(points, padL, padT + padVal + usableH);
  const linePath = buildLinePath(points);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
      {title && (
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <TrendingUpIcon />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {total && (
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{total}</Text>
          )}
        </View>
      )}

      <View style={[styles.chartWrap, { height: chartH }]}>
        <Svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
          <Defs>
            <LinearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="5%" stopColor={BRAND} stopOpacity={0.2} />
              <Stop offset="95%" stopColor={BRAND} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {yTicks.map((tick) => {
            const y = padT + padVal + usableH - tick * usableH;
            const val = Math.round(maxVal * tick);
            return (
              <G key={tick}>
                <Line
                  x1={padL}
                  y1={y}
                  x2={padL + drawW}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <SvgText
                  x={padL - 6}
                  y={y + 4}
                  fontSize={9}
                  fill={colors.textMuted.toString()}
                  textAnchor="end"
                >
                  {formatYLabel(val)}
                </SvgText>
              </G>
            );
          })}

          {areaPath && <Path d={areaPath} fill="url(#salesGrad)" />}
          {linePath && (
            <Path
              d={linePath}
              stroke={BRAND}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {data.length <= 14 &&
            points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3} fill={BRAND} />)}

          {data.length > 0 && (
            <>
              <SvgText
                x={padL}
                y={chartH - 2}
                fontSize={9}
                fill={colors.textMuted.toString()}
                textAnchor="start"
              >
                {fmtAxisLabel(data[0].date)}
              </SvgText>
              <SvgText
                x={padL + drawW}
                y={chartH - 2}
                fontSize={9}
                fill={colors.textMuted.toString()}
                textAnchor="end"
              >
                {fmtAxisLabel(data[data.length - 1].date)}
              </SvgText>
            </>
          )}
        </Svg>
      </View>
    </View>
  );
}

function formatYLabel(val: number): string {
  const birr = val / 100;
  if (birr >= 1000) return `${(birr / 1000).toFixed(0)}k`;
  return String(Math.round(birr));
}

function fmtAxisLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function buildLinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
}

function buildAreaPath(
  points: Array<{ x: number; y: number }>,
  left: number,
  bottom: number,
): string {
  if (points.length < 2) return "";
  const top = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  return `${top} L${last.x},${bottom} L${first.x},${bottom} Z`;
}

// ── Donut Chart ───────────────────────────────────────────────────────────────

interface TopBeveragesDonutProps {
  data: Array<{ id: string; name: string; totalBoxes: number }>;
  title?: string;
}

export function TopBeveragesDonut({ data, title }: TopBeveragesDonutProps) {
  const { colors } = useTheme();
  const total = data.reduce((s, b) => s + (b.totalBoxes ?? 0), 0);

  if (!data.length) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <PackageIcon />
          </View>
          {title && <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>}
        </View>
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data</Text>
        </View>
      </View>
    );
  }

  const segments = computeDonutSegments(data.map((d) => d.totalBoxes ?? 0));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <PackageIcon />
        </View>
        {title && <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>}
      </View>

      <View style={styles.donutRow}>
        <Svg width={140} height={140} viewBox="0 0 160 160">
          {segments.map((seg, i) => (
            <Path
              key={i}
              d={describeArc(80, 80, 44, 70, seg.startAngle, seg.endAngle)}
              fill={PALETTE[i % PALETTE.length]}
            />
          ))}
        </Svg>

        <View style={styles.legend}>
          {data.map((d, i) => (
            <View key={d.id} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: PALETTE[i % PALETTE.length] }]} />
              <Text
                style={[styles.legendName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {d.name}
              </Text>
              <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                {d.totalBoxes.toLocaleString()}
                {total > 0 && (
                  <Text style={styles.legendPct}>
                    {" "}
                    ({Math.round((d.totalBoxes / total) * 100)}%)
                  </Text>
                )}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function computeDonutSegments(values: number[]) {
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return [];
  let currentAngle = -90;
  return values.map((v) => {
    const angle = (v / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    return { startAngle, endAngle };
  });
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
) {
  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const startInner = polarToCartesian(cx, cy, innerR, startAngle);
  const endInner = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

// ── Tiny SVG icons ────────────────────────────────────────────────────────────

function TrendingUpIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 20L8.25 14.75L12.25 18.75L18.75 12.25L21 14.5V4"
        stroke={BRAND}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 12V4H13"
        stroke={BRAND}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PackageIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.5 3.5H7.5C6.39543 3.5 5.5 4.39543 5.5 5.5V20.5C5.5 21.6046 6.39543 22.5 7.5 22.5H16.5C17.6046 22.5 18.5 21.6046 18.5 20.5V5.5C18.5 4.39543 17.6046 3.5 16.5 3.5Z"
        stroke={BRAND}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 8H15" stroke={BRAND} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9 12H15" stroke={BRAND} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[5],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...type.bodyBold,
    fontSize: 14,
  },
  totalLabel: {
    ...type.caption,
    marginLeft: "auto",
  },
  chartWrap: {
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...type.body,
    fontSize: 13,
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  legend: {
    flex: 1,
    gap: 8,
    marginLeft: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    ...type.caption,
    flex: 1,
  },
  legendValue: {
    ...type.caption,
    fontSize: 11,
  },
  legendPct: {
    opacity: 0.6,
  },
});
