/**
 * Version of the terms and the privacy policy currently published.
 *
 * Deliberately a copy of the website's `src/constants/legal.ts`: acceptance is
 * stored once per account in the backend's `seen_features` list, so an entry
 * written by the app has to be the one the website reads back, and the other
 * way round. Bump both together whenever either document changes.
 */
export const LEGAL_VERSION = '2026-10-02';

/**
 * Acceptance is recorded as one entry in the user's `seen_features` array,
 * shaped `legal_accepted:<version>:<ISO timestamp>` — the version so a new
 * document re-prompts everyone, and the timestamp so we can answer "when did
 * this person accept, and to what" without a separate audit table.
 */
const CONSENT_PREFIX = 'legal_accepted';

/** The entry to store for an acceptance happening now. */
export function buildLegalConsentEntry(at: Date = new Date()): string {
    return `${CONSENT_PREFIX}:${LEGAL_VERSION}:${at.toISOString()}`;
}

/** Whether these `seen_features` contain an acceptance of the current version. */
export function hasAcceptedCurrentLegal(features: string[] | undefined): boolean {
    if (!features) return false;
    return features.some((f) => f.startsWith(`${CONSENT_PREFIX}:${LEGAL_VERSION}:`));
}
