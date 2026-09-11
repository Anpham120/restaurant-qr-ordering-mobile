import { useMemo, useState } from "react";
import type { DailyRevenueReport } from "@cmc/shared-types";

export interface RevenueChartProps {
  dailyRevenue: DailyRevenueReport[];
  from?: string;
  to?: string;
}

interface ProcessedDay {
  date: string;
  displayDate: string;
  revenue: number;
  orderCount: number;
}

export function formatVnd(value: number): string {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export function formatCompactVnd(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")} tr`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return `${value}`;
}

export function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

function parseDateUtc(dateStr: string): Date | null {
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  }
  return null;
}

export function generateContinuousDays(
  from: string | undefined,
  to: string | undefined,
  data: DailyRevenueReport[],
): ProcessedDay[] {
  const dataMap = new Map<string, DailyRevenueReport>();
  for (const item of data) {
    dataMap.set(item.date, item);
  }

  let startDateStr = from;
  let endDateStr = to;

  if (!startDateStr || !endDateStr) {
    if (data.length === 0) return [];
    const sortedDates = [...data].map((d) => d.date).sort();
    startDateStr = sortedDates[0];
    endDateStr = sortedDates[sortedDates.length - 1];
  }

  const start = parseDateUtc(startDateStr);
  const end = parseDateUtc(endDateStr);

  if (!start || !end || start.getTime() > end.getTime()) {
    // Fallback directly to provided data sorted by date
    return [...data]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        date: item.date,
        displayDate: formatDisplayDate(item.date),
        revenue: item.revenue,
        orderCount: item.orderCount,
      }));
  }

  const days: ProcessedDay[] = [];
  const current = new Date(start);

  // Safety cap at 366 days to avoid browser hang on extreme ranges
  let count = 0;
  while (current.getTime() <= end.getTime() && count < 366) {
    const isoDate = current.toISOString().slice(0, 10);
    const existing = dataMap.get(isoDate);
    days.push({
      date: isoDate,
      displayDate: formatDisplayDate(isoDate),
      revenue: existing ? existing.revenue : 0,
      orderCount: existing ? existing.orderCount : 0,
    });
    current.setUTCDate(current.getUTCDate() + 1);
    count++;
  }

  return days;
}

export function RevenueChart({ dailyRevenue, from, to }: RevenueChartProps) {
  const days = useMemo(() => generateContinuousDays(from, to, dailyRevenue), [from, to, dailyRevenue]);
  const [activeDay, setActiveDay] = useState<ProcessedDay | null>(null);

  if (days.length === 0) {
    return <div className="ops-empty">Chưa có dữ liệu doanh thu theo ngày</div>;
  }

  const maxRevenue = Math.max(...days.map((d) => d.revenue), 0);
  const effectiveMax = maxRevenue > 0 ? maxRevenue : 100_000;

  // Chart dimensions
  const yAxisWidth = 60;
  const paddingRight = 24;
  const paddingTop = 24;
  const paddingBottom = 36;
  const height = 240;
  const chartHeight = height - paddingTop - paddingBottom;
  const baselineY = height - paddingBottom;

  // Compute dynamic width per slot
  const slotWidth = Math.max(32, Math.min(64, Math.floor(640 / days.length)));
  const totalContentWidth = yAxisWidth + days.length * slotWidth + paddingRight;
  const chartWidth = Math.max(640, totalContentWidth);
  const barWidth = Math.max(12, Math.min(28, slotWidth - 10));

  // Determine tick label interval for X axis (prevent text overlap)
  const labelInterval = days.length > 28 ? 4 : days.length > 14 ? 2 : 1;

  // Y-axis grid levels (0, 33%, 66%, 100%)
  const yTicks = [
    { ratio: 1.0, value: effectiveMax },
    { ratio: 0.66, value: Math.round(effectiveMax * 0.66) },
    { ratio: 0.33, value: Math.round(effectiveMax * 0.33) },
    { ratio: 0, value: 0 },
  ];

  return (
    <div className="ops-reports-chart" aria-label="Biểu đồ doanh thu theo ngày">
      {/* Detail bar preview for touch and click */}
      <div className="ops-reports-chart-detail" aria-live="polite">
        {activeDay ? (
          <>
            <span className="ops-reports-detail-date">
              Ngày <strong>{activeDay.date}</strong>:
            </span>
            <span className="ops-reports-detail-value">
              Doanh thu: <strong>{formatVnd(activeDay.revenue)}</strong>
            </span>
            <span className="ops-reports-detail-orders">
              ({activeDay.orderCount} đơn)
            </span>
          </>
        ) : (
          <span className="ops-reports-detail-hint">
            Chạm hoặc rê chuột vào cột để xem chi tiết từng ngày
          </span>
        )}
      </div>

      <div className="ops-reports-chart-scroll">
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          role="img"
          className="ops-reports-chart-svg"
          style={{ "--chart-min-width": `${chartWidth}px` } as React.CSSProperties}
        >
          {/* Background Grid Lines & Y-axis labels */}
          {yTicks.map(({ ratio, value }) => {
            const y = baselineY - ratio * chartHeight;
            return (
              <g key={ratio} className="ops-chart-grid-group">
                <line
                  x1={yAxisWidth}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  className="ops-chart-grid-line"
                  stroke="var(--color-border-light, #e2e8f0)"
                  strokeDasharray={ratio === 0 ? "none" : "3 3"}
                  strokeWidth="1"
                />
                <text
                  x={yAxisWidth - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="ops-chart-axis-text ops-chart-y-text"
                  fill="var(--color-muted, #64748b)"
                  fontSize="11"
                >
                  {formatCompactVnd(value)}
                </text>
              </g>
            );
          })}

          {/* X Axis Baseline */}
          <line
            x1={yAxisWidth}
            y1={baselineY}
            x2={chartWidth - paddingRight}
            y2={baselineY}
            stroke="var(--color-border, #cbd5e1)"
            strokeWidth="1.5"
          />

          {/* Day Bars */}
          {days.map((day, index) => {
            const slotX = yAxisWidth + index * slotWidth;
            const barX = slotX + (slotWidth - barWidth) / 2;
            const barHeight = maxRevenue > 0 ? (day.revenue / maxRevenue) * chartHeight : 0;
            const barY = baselineY - barHeight;
            const isSelected = activeDay?.date === day.date;
            const showLabel = index % labelInterval === 0 || index === days.length - 1;

            return (
              <g
                key={day.date}
                className="ops-chart-bar-group"
                onMouseEnter={() => setActiveDay(day)}
                onFocus={() => setActiveDay(day)}
                onClick={() => setActiveDay(day)}
                tabIndex={0}
                role="button"
                aria-label={`${day.date}: ${formatVnd(day.revenue)}, ${day.orderCount} đơn`}
              >
                {/* Invisible larger hit area for easy touch selection */}
                <rect
                  x={slotX}
                  y={paddingTop}
                  width={slotWidth}
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                  className="ops-chart-hitbox"
                />

                {/* Actual Bar (or zero baseline tick if revenue is 0) */}
                {day.revenue > 0 ? (
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={Math.max(3, barHeight)}
                    rx="4"
                    className={`ops-chart-bar ${isSelected ? "ops-chart-bar--active" : ""}`}
                    fill={isSelected ? "var(--color-primary-hover, #1d4ed8)" : "var(--color-primary, #2563eb)"}
                  >
                    <title>{`${day.date}: ${formatVnd(day.revenue)} (${day.orderCount} đơn)`}</title>
                  </rect>
                ) : (
                  <rect
                    x={barX}
                    y={baselineY - 2}
                    width={barWidth}
                    height={2}
                    rx="1"
                    className="ops-chart-bar ops-chart-bar--zero"
                    fill="var(--color-border, #cbd5e1)"
                  >
                    <title>{`${day.date}: 0đ (0 đơn)`}</title>
                  </rect>
                )}

                {/* X-axis Date Label */}
                {showLabel ? (
                  <text
                    x={slotX + slotWidth / 2}
                    y={baselineY + 16}
                    textAnchor="middle"
                    className={`ops-chart-axis-text ops-chart-x-text ${isSelected ? "ops-chart-axis-text--active" : ""}`}
                    fill={isSelected ? "var(--color-primary, #2563eb)" : "var(--color-muted, #64748b)"}
                    fontWeight={isSelected ? "600" : "normal"}
                    fontSize="11"
                  >
                    {day.displayDate}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
