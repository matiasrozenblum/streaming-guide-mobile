import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Checks if the current time in Buenos Aires is strictly before the given date.
 * Ex: isBeforeInBuenosAires('2026-01-02') -> true if today is Jan 1st or earlier.
 */
export const isBeforeInBuenosAires = (dateString: string): boolean => {
    // Current time in Buenos Aires
    const nowBA = dayjs().tz('America/Argentina/Buenos_Aires');
    // Target date in Buenos Aires at midnight
    const targetBA = dayjs.tz(dateString, 'YYYY-MM-DD', 'America/Argentina/Buenos_Aires');

    return nowBA.isBefore(targetBA);
};
