// Tracking UTM: setiap parameter utm_* di URL (bukan hanya 5 standar) disimpan
// di browser lalu dikirim saat checkout. First touch disimpan terpisah dari
// last touch; laporan admin memakai last touch. Berlaku 30 hari sejak kunjungan
// terakhir yang membawa UTM.

export interface UtmTouch {
	params: Record<string, string>;
	landing_page: string;
	referrer: string | null;
	captured_at: string;
}

export interface UtmPayload {
	first: UtmTouch;
	last: UtmTouch;
}

const STORAGE_KEY = 'za_utm';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const KEY_PATTERN = /^utm_[a-z0-9_]{1,40}$/;
const MAX_PARAMS = 20;
const MAX_VALUE = 191;
const MAX_URL = 500;

const read = (): UtmPayload | null => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const data = JSON.parse(raw) as UtmPayload;
		if (!data?.last?.captured_at) return null;
		if (Date.now() - new Date(data.last.captured_at).getTime() > TTL_MS) {
			localStorage.removeItem(STORAGE_KEY);
			return null;
		}
		return data;
	} catch {
		return null;
	}
};

// Referrer internal (pindah halaman di situs sendiri) tidak berguna untuk atribusi.
const externalReferrer = (): string | null => {
	if (!document.referrer) return null;
	try {
		return new URL(document.referrer).origin === window.location.origin ? null : document.referrer.slice(0, MAX_URL);
	} catch {
		return null;
	}
};

/** Dipanggil di setiap halaman: simpan UTM bila URL membawanya. */
export const captureUtm = (): void => {
	const params: Record<string, string> = {};
	new URLSearchParams(window.location.search).forEach((value, rawKey) => {
		const key = rawKey.toLowerCase();
		const trimmed = value.trim();
		if (!KEY_PATTERN.test(key) || !trimmed || Object.keys(params).length >= MAX_PARAMS) return;
		params[key] = trimmed.slice(0, MAX_VALUE);
	});
	if (!Object.keys(params).length) return;

	const touch: UtmTouch = {
		params,
		landing_page: `${window.location.pathname}${window.location.search}`.slice(0, MAX_URL),
		referrer: externalReferrer(),
		captured_at: new Date().toISOString(),
	};
	const stored = read();

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ first: stored?.first ?? touch, last: touch }));
	} catch {
		// Penyimpanan diblokir: UTM tidak tercatat, pembelian tetap jalan.
	}
};

/** UTM yang masih berlaku untuk dikirim bersama checkout. */
export const getUtm = (): UtmPayload | null => read();
