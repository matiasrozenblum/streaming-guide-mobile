/**
 * Where a recap sits in its publication calendar, derived from the range the
 * API already sends.
 *
 * The rule is days and nothing else. A week opens on Friday at 18 with Monday
 * to Friday in it, grows on Saturday at 18, and closes on Sunday at 22; a month
 * opens on its second-to-last day at 18 and closes on the last one at 22.
 * Before the first instalment there is no recap for the period in progress, so
 * the reader is shown the one before it.
 *
 * None of that is asked of the server a second time: the range it returns is
 * enough to tell which instalment is on screen, and deriving it here keeps the
 * phrase and the dates from ever disagreeing.
 */

const TIMEZONE = "America/Argentina/Buenos_Aires";

/**
 * Today in Buenos Aires, as a Date whose UTC fields hold the local wall clock.
 * A device in another timezone would otherwise name the wrong day — and the
 * whole point of this file is naming days.
 */
function buenosAiresToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return new Date(
    Date.UTC(get("year"), get("month") - 1, get("day")),
  );
}

/** A `YYYY-MM-DD` from the API as a Date, read as UTC so it does not shift. */
function fromIso(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday of the week that contains `date`. */
function weekStart(date: Date): Date {
  const monday = new Date(date);
  const dayOfWeek = (monday.getUTCDay() + 6) % 7; // 0 = Monday
  monday.setUTCDate(monday.getUTCDate() - dayOfWeek);
  return monday;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function lastDayOfMonth(date: Date): number {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * The periods that have a calendar. `year` exists in the API's union and has
 * no instalments, so it is not one of these.
 */
export type RecapPeriodType = "week" | "month";

export interface RecapRange {
  type: RecapPeriodType | string;
  from: string;
  to: string;
}

/**
 * The pill above the carousel: a bold lead naming what is on screen, and the
 * rest saying what happens next.
 */
export interface RecapStatus {
  lead: string;
  rest: string;
}

export function recapStatus(range: RecapRange, now?: Date): RecapStatus {
  const today = now ?? buenosAiresToday();
  const from = fromIso(range.from);
  const to = fromIso(range.to);

  if (range.type === "week") {
    const live = toIso(weekStart(today)) === toIso(from);
    if (!live) {
      return { lead: "Semana pasada", rest: "Nuevo resumen el viernes a las 18 hs" };
    }
    const dayOfWeek = (to.getUTCDay() + 6) % 7; // 0 = Monday
    if (dayOfWeek <= 4) {
      return { lead: "Lunes a viernes", rest: "Mañana se suma el sábado" };
    }
    if (dayOfWeek === 5) {
      return { lead: "Lunes a sábado", rest: "Cierra mañana a las 22 hs" };
    }
    return { lead: "Semana completa", rest: "Nuevo resumen el viernes a las 18 hs" };
  }

  const live =
    from.getUTCFullYear() === today.getUTCFullYear() &&
    from.getUTCMonth() === today.getUTCMonth();

  if (!live) {
    return {
      lead: "Mes pasado",
      rest: `Nuevo resumen el ${lastDayOfMonth(today) - 1} a las 18 hs`,
    };
  }

  if (to.getUTCDate() === lastDayOfMonth(to) - 1) {
    return { lead: "Mes hasta hoy", rest: "Cierra mañana a las 22 hs" };
  }

  /**
   * The month closed, so the next one belongs to the month after this one. The
   * other two rows say a number alone because it falls in the month you are
   * living in; this one would be read as today's date, so it names its month.
   */
  const nextMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1),
  );
  return {
    lead: "Mes completo",
    rest: `Nuevo resumen el ${lastDayOfMonth(nextMonth) - 1} de ${
      MONTHS[nextMonth.getUTCMonth()]
    } a las 18 hs`,
  };
}

/**
 * What to say when there is no recap to show: when the next one lands, and the
 * days it will be made of.
 *
 * Two cases, and they need different words. Before the first instalment there
 * is nothing yet and nothing wrong — the recap is simply not due. Once the
 * period is published and still empty, pointing at a delivery that already
 * happened would be a lie, so it says what is actually missing.
 */
export interface RecapWaiting {
  /** The days the next recap will cover, for the header. */
  rangeLabel: string;
  title: string;
  body: string;
}

export function recapWaiting(type: RecapPeriodType, now?: Date): RecapWaiting {
  const today = now ?? buenosAiresToday();

  if (type === "week") {
    const monday = weekStart(today);
    const friday = addDays(monday, 4);
    const dayOfWeek = (today.getUTCDay() + 6) % 7;
    const published = dayOfWeek >= 4; // Friday onwards

    return {
      rangeLabel: rangeLabel(monday, friday),
      title: published
        ? "Todavía no hay nada que resumir"
        : "Tu primer resumen llega el viernes",
      body: published
        ? "Mirá programas y streamers en La Guía y tu resumen se arma solo. Se completa el domingo a las 22 hs."
        : "Va a estar listo el viernes a las 18 hs con lo que veas de lunes a viernes. Mirá programas y streamers en La Guía y lo armamos.",
    };
  }

  const first = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );
  const penultimate = lastDayOfMonth(today) - 1;
  const closing = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), penultimate),
  );
  const published = today.getUTCDate() >= penultimate;

  return {
    rangeLabel: rangeLabel(first, closing),
    title: published
      ? "Todavía no hay nada que resumir"
      : `Tu resumen llega el ${penultimate}`,
    body: published
      ? "Mirá programas y streamers en La Guía y tu resumen se arma solo."
      : `Va a estar listo el ${penultimate} a las 18 hs con lo que veas del 1 al ${penultimate}. Mirá programas y streamers en La Guía y lo armamos.`,
  };
}

/** "2 — 6 de noviembre", or "26 oct — 1 nov" when the months differ. */
function rangeLabel(from: Date, to: Date): string {
  if (from.getUTCMonth() === to.getUTCMonth()) {
    return `${from.getUTCDate()} — ${to.getUTCDate()} de ${
      MONTHS[to.getUTCMonth()]
    }`;
  }
  const short = (date: Date) =>
    `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()].slice(0, 3)}`;
  return `${short(from)} — ${short(to)}`;
}
