import { useMemo, useState } from "react";
import type { DailyRevenueReport } from "@cmc/shared-types";

export type ChartGranularity = "day" | "week" | "month";

export interface RevenueChartProps {
  dailyRevenue: DailyRevenueReport[];
  from?: string;
  to?: string;
  granularity?: ChartGranularity;
  onGranularityChange?: (granularity: ChartGranularity) => void;
}

export interface ProcessedItem {
  id: string;
  label: string;
  subLabel?: string;
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
): { date: string; displayDate: string; revenue: number; orderCount: number }[] {
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
    return [...data]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        date: item.date,
        displayDate: formatDisplayDate(item.date),
        revenue: item.revenue,
        orderCount: item.orderCount,
      }));
  }

  const days: { date: string; displayDate: string; revenue: number; orderCount: number }[] = [];
  const current = new Date(start);

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

export function aggregateRevenue(
  days: { date: string; displayDate: string; revenue: number; orderCount: number }[],
  granularity: ChartGranularity,
): ProcessedItem[] {
  if (days.length === 0) return [];
  if (granularity === "day") {
    return days.map((d) => ({
      id: d.date,
      label: d.displayDate,
      subLabel: d.date,
      revenue: d.revenue,
      orderCount: d.orderCount,
    }));
  }

  if (granularity === "week") {
    const weeks: ProcessedItem[] = [];
    let currentWeekDays: typeof days = [];
    let weekIndex = 1;

    for (let i = 0; i < days.length; i++) {
      currentWeekDays.push(days[i]);
      const dateObj = parseDateUtc(days[i].date);
      // Kết thúc tuần vào Chủ Nhật (day 0) hoặc phần tử cuối cùng
      const isWeekEnd = (dateObj && dateObj.getUTCDay() === 0) || i === days.length - 1;

      if (isWeekEnd && currentWeekDays.length > 0) {
        const startDay = currentWeekDays[0];
        const endDay = currentWeekDays[currentWeekDays.length - 1];
        const totalRev = currentWeekDays.reduce((acc, cur) => acc + cur.revenue, 0);
        const totalOrders = currentWeekDays.reduce((acc, cur) => acc + cur.orderCount, 0);

        weeks.push({
          id: `w-${startDay.date}`,
          label: `T${weekIndex}`,
          subLabel: `${startDay.displayDate} - ${endDay.displayDate}`,
          revenue: totalRev,
          orderCount: totalOrders,
        });

        weekIndex++;
        currentWeekDays = [];
      }
    }
    return weeks;
  }

  // granularity === "month"
  const monthMap = new Map<string, { label: string; subLabel: string; revenue: number; orderCount: number }>();
  for (const day of days) {
    const monthKey = day.date.slice(0, 7); // YYYY-MM
    const [year, month] = monthKey.split("-");
    const existing = monthMap.get(monthKey);
    if (existing) {
      existing.revenue += day.revenue;
      existing.orderCount += day.orderCount;
    } else {
      monthMap.set(monthKey, {
        label: `Th${Number(month)}`,
        subLabel: `Tháng ${Number(month)}/${year}`,
        revenue: day.revenue,
        orderCount: day.orderCount,
      });
    }
  }

  return Array.from(monthMap.entries()).map(([monthKey, val]) => ({
    id: monthKey,
    label: val.label,
    subLabel: val.subLabel,
    revenue: val.revenue,
    orderCount: val.orderCount,
  }));
}

export function RevenueChart({
  dailyRevenue,
  from,
  to,
  granularity = "day",
  onGranularityChange,
}: RevenueChartProps) {
  const continuousDays = useMemo(() => generateContinuousDays(from, to, dailyRevenue), [from, to, dailyRevenue]);
  const items = useMemo(() => aggregateRevenue(continuousDays, granularity), [continuousDays, granularity]);
  const [activeItem, setActiveItem] = useState<ProcessedItem | null>(null);

  if (items.length === 0) {
    return <div className="ops-empty">Chưa có dữ liệu doanh thu trong khoảng thời gian này</div>;
  }

  const maxRevenue = Math.max(...items.map((d) => d.revenue), 0);
  const effectiveMax = maxRevenue > 0 ? maxRevenue : 100_000;

  // Kích thước biểu đồ
  const yAxisWidth = 60;
  const paddingRight = 24;
  const paddingTop = 24;
  const paddingBottom = 36;
  const height = 240;
  const chartHeight = height - paddingTop - paddingBottom;
  const baselineY = height - paddingBottom;

  // Chiều rộng viewBox mặc định chuẩn để hiển thị toàn màn hình mà không bị ép về góc trái
  const baseChartWidth = 720;
  const availableWidth = baseChartWidth - yAxisWidth - paddingRight;

  // Tính slotWidth: nếu số cột ít, dàn đều trên chiều rộng baseChartWidth; nếu số cột nhiều, cho phép cuộn ngang
  const minSlotWidth = granularity === "month" ? 56 : granularity === "week" ? 44 : 32;
  const calculatedSlotWidth = Math.floor(availableWidth / Math.max(1, items.length));
  const slotWidth = Math.max(minSlotWidth, calculatedSlotWidth);

  // Tổng chiều rộng thực tế của biểu đồ
  const chartWidth = Math.max(baseChartWidth, yAxisWidth + items.length * slotWidth + paddingRight);

  // Giới hạn chiều rộng cột (barWidth) thanh thoát, tối đa 32px để cột không bao giờ bị quá to hoặc quá thô
  const barWidth = Math.min(32, Math.max(12, Math.floor(slotWidth * 0.45)));

  // Bước nhảy nhãn X
  const labelInterval =
    granularity === "month"
      ? 1
      : granularity === "week"
      ? items.length > 20
        ? 2
        : 1
      : items.length > 60
      ? 7
      : items.length > 28
      ? 4
      : items.length > 14
      ? 2
      : 1;

  // Các mốc trục Y
  const yTicks = [
    { ratio: 1.0, value: effectiveMax },
    { ratio: 0.66, value: Math.round(effectiveMax * 0.66) },
    { ratio: 0.33, value: Math.round(effectiveMax * 0.33) },
    { ratio: 0, value: 0 },
  ];

  return (
    <div className="ops-reports-chart" aria-label="Biểu đồ doanh thu">
      {/* Thanh điều khiển phụ (TradingView Granularity Selector) */}
      <div className="ops-reports-chart-header">
        <div className="ops-reports-chart-detail" aria-live="polite">
          {activeItem ? (
            <>
              <span className="ops-reports-detail-date">
                <strong>{activeItem.subLabel || activeItem.label}</strong>:
              </span>
              <span className="ops-reports-detail-value">
                Doanh thu: <strong>{formatVnd(activeItem.revenue)}</strong>
              </span>
              <span className="ops-reports-detail-orders">
                ({activeItem.orderCount} đơn)
              </span>
            </>
          ) : (
            <span className="ops-reports-detail-hint">
              Chạm hoặc rê chuột vào cột để xem chi tiết
            </span>
          )}
        </div>

        {onGranularityChange ? (
          <div className="ops-chart-granularity-wrapper">
            <span className="ops-chart-granularity-label">Xem theo:</span>
            <div className="ops-chart-granularity-toggle" role="group" aria-label="Chế độ gom nhóm cột">
              {(
                [
                  ["day", "Ngày"],
                  ["week", "Tuần"],
                  ["month", "Tháng"],
                ] as Array<[ChartGranularity, string]>
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`ops-chart-tab ${granularity === mode ? "ops-chart-tab--active" : ""}`}
                  onClick={() => onGranularityChange(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
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

          {/* Item Bars */}
          {items.map((item, index) => {
            const slotX = yAxisWidth + index * slotWidth;
            const barX = slotX + (slotWidth - barWidth) / 2;
            const barHeight = maxRevenue > 0 ? (item.revenue / maxRevenue) * chartHeight : 0;
            const barY = baselineY - barHeight;
            const isSelected = activeItem?.id === item.id;
            const showLabel = index % labelInterval === 0 || index === items.length - 1;

            return (
              <g
                key={item.id}
                className="ops-chart-bar-group"
                onMouseEnter={() => setActiveItem(item)}
                onFocus={() => setActiveItem(item)}
                onClick={() => setActiveItem(item)}
                tabIndex={0}
                role="button"
                aria-label={`${item.subLabel || item.label}: ${formatVnd(item.revenue)}, ${item.orderCount} đơn`}
              >
                {/* Invisible hit area for touch/click */}
                <rect
                  x={slotX}
                  y={paddingTop}
                  width={slotWidth}
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                  className="ops-chart-hitbox"
                />

                {/* Actual Bar (or zero baseline tick if revenue is 0) */}
                {item.revenue > 0 ? (
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={Math.max(3, barHeight)}
                    rx="4"
                    className={`ops-chart-bar ${isSelected ? "ops-chart-bar--active" : ""}`}
                    fill={isSelected ? "var(--color-primary-hover, #1d4ed8)" : "var(--color-primary, #2563eb)"}
                  >
                    <title>{`${item.subLabel || item.label}: ${formatVnd(item.revenue)} (${item.orderCount} đơn)`}</title>
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
                    <title>{`${item.subLabel || item.label}: 0đ (0 đơn)`}</title>
                  </rect>
                )}

                {/* X-axis Label */}
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
                    {item.label}
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
