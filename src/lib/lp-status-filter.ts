import type { User } from './types';

/** LP Status values treated as "current tier" for the sidebar/map filter (compare lowercase) */
export const LP_CURRENT_TIER_VALUES = new Set(['current', 'current2', 'current3']);

export function getLpStatus(user: User): string | undefined {
	const direct = user.lp_status ?? user.lpStatus ?? user['LP Status'];
	if (typeof direct !== 'string') return undefined;
	const t = direct.trim();
	return t.length === 0 ? undefined : t;
}

export function isLpCurrentTier(user: User): boolean {
	const normalized = getLpStatus(user)?.toLowerCase();
	return normalized !== undefined && LP_CURRENT_TIER_VALUES.has(normalized);
}

export function userPassesLpCurrentTierFilter(user: User, filterEnabled: boolean): boolean {
	return !filterEnabled || isLpCurrentTier(user);
}
