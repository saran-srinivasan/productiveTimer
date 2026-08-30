import { MonthDay } from "../types/ledger";

export const formatYearMonthDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export const todayKey = (): string => formatYearMonthDay(new Date());

export const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const monthTitle = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

export const buildMonthDays = (monthDate: Date): (MonthDay | null)[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = todayKey();
  const cells: (MonthDay | null)[] = [];

  for (let index = 0; index < firstDayIndex; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;
    cells.push({
      dateKey,
      day,
      isCurrentMonth: true,
      isToday: dateKey === today,
    });
  }

  return cells;
};
