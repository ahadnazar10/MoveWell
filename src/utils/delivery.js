export const DELIVERY_WORKING_DAYS = 3;

/** Adds working days (Monday to Friday), skipping weekends. Returns a new Date. */
export function addWorkingDays(from, days) {
  const date = new Date(from);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return date;
}

const deliveryDateFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "Delivers to 400001 by Wed, 30 Sept" — 3 working days from `now`. */
export function deliveryPromise(pin, now = new Date()) {
  return `Delivers to ${pin} by ${deliveryDateFormat.format(addWorkingDays(now, DELIVERY_WORKING_DAYS))}`;
}
