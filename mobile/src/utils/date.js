export const getLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const todayKey = () => getLocalDateKey(new Date());

export const monthKey = (date) => date.toISOString().slice(0, 7);

export const monthTitle = (date) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

export const buildMonthDays = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = Array.from({ length: firstDay.getDay() }, () => null);

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const dayDate = new Date(year, month, day);
    days.push({
      day,
      dateKey: getLocalDateKey(dayDate),
      isToday: getLocalDateKey(dayDate) === todayKey(),
    });
  }

  while (days.length % 7 !== 0) days.push(null);

  return days;
};
