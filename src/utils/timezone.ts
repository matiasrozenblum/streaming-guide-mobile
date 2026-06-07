const ART_UTC_OFFSET_MINUTES = -180; // UTC-3, fixed — Argentina has no DST

function getLocalUTCOffsetMinutes(): number {
    return -new Date().getTimezoneOffset();
}

export function getLocalToARTOffsetMinutes(): number {
    return getLocalUTCOffsetMinutes() - ART_UTC_OFFSET_MINUTES;
    // Positive → user is ahead of ART (e.g. UTC+2 → +300)
    // Negative → user is behind ART (e.g. UTC-5 → -120)
    // Zero     → user is in Argentina
}

// Returns the current day name in Buenos Aires time using pure UTC arithmetic.
// Avoids Intl.DateTimeFormat timezone dependency for broader JS engine compatibility.
export function getARTDayName(): string {
    const artNow = new Date(Date.now() + ART_UTC_OFFSET_MINUTES * 60 * 1000);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[artNow.getUTCDay()];
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function shiftDay(day: string, shift: number): string {
    const idx = DAY_ORDER.indexOf(day);
    if (idx === -1) return day;
    return DAY_ORDER[((idx + shift) % 7 + 7) % 7];
}

function addMinutesToTimeStr(
    timeStr: string,
    offsetMinutes: number,
): { time: string; dayShift: number } {
    const [h, m] = timeStr.split(':').map(Number);
    let total = h * 60 + m + offsetMinutes;
    let dayShift = 0;
    while (total >= 24 * 60) { total -= 24 * 60; dayShift += 1; }
    while (total < 0)         { total += 24 * 60; dayShift -= 1; }
    const newH = Math.floor(total / 60);
    const newM = total % 60;
    return {
        time: `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`,
        dayShift,
    };
}

export function localizeSchedule<T extends { start_time: string; end_time: string; day_of_week: string }>(
    schedule: T,
    offsetMinutes: number,
): T {
    if (offsetMinutes === 0) return schedule;

    // 24/7 programs (00:00–23:59) are timezone-agnostic: converting them creates
    // visual gaps for users far from ART (e.g. 13:00–12:59 for UTC+13).
    if (schedule.start_time.startsWith('00:00') && schedule.end_time.startsWith('23:59')) {
        return schedule;
    }

    const { time: localStart, dayShift } = addMinutesToTimeStr(schedule.start_time, offsetMinutes);
    const { time: localEnd } = addMinutesToTimeStr(schedule.end_time, offsetMinutes);

    return {
        ...schedule,
        start_time: localStart,
        end_time: localEnd,
        day_of_week: shiftDay(schedule.day_of_week, dayShift),
    };
}
