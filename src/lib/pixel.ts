// Meta & TikTok pixel. Base code + PageView dimuat oleh components/TrackingPixels.astro;
// helper di sini hanya mengirim event, dan diam saja bila pixel tidak aktif (ID env kosong).
//
// Setiap event Meta juga punya pasangan dari server (Conversions API di backend). Keduanya
// memakai event_id yang sama supaya Meta menghitungnya sekali:
// - InitiateCheckout ("checkout-{invoice}") dan Purchase ("purchase-{invoice}") dikirim backend
//   sendiri saat checkout dan saat pembayaran lunas.
// - PageView, ViewContent, AddToCart, CompleteRegistration diteruskan lewat POST /api/meta/events.

import { customerAuthHeader } from './api';

type PixelParams = Record<string, unknown>;

declare global {
	interface Window {
		fbq?: (...args: unknown[]) => void;
		ttq?: { track: (...args: unknown[]) => void };
		/** event_id PageView halaman ini, dibuat TrackingPixels.astro. */
		__zaPageViewId?: string;
	}
}

const metaEnabled = Boolean(import.meta.env.PUBLIC_META_PIXEL_ID);
const backendUrl = (import.meta.env.PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '');

const FBC_KEY = 'za_fbc';
// Sama dengan masa berlaku cookie _fbc milik Meta.
const FBC_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const FBCLID_PATTERN = /^[A-Za-z0-9_-]{1,450}$/;
const MAX_URL = 500;

const cookie = (name: string): string => {
	const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : '';
};

const storedFbc = (): string => {
	try {
		const data = JSON.parse(localStorage.getItem(FBC_KEY) ?? 'null') as { value?: string; at?: number } | null;
		if (!data?.value || !data.at || Date.now() - data.at > FBC_TTL_MS) return '';
		return data.value;
	} catch {
		return '';
	}
};

/**
 * Dipanggil di setiap halaman: simpan click ID iklan (?fbclid=) dalam format fbc.
 * Parameter itu hilang begitu pengunjung pindah halaman, sementara cookie _fbc baru ada
 * setelah pixel selesai dimuat (dan tidak pernah ada bila pixel diblokir).
 */
export const captureFbclid = (): void => {
	const fbclid = new URLSearchParams(window.location.search).get('fbclid') ?? '';
	if (!FBCLID_PATTERN.test(fbclid)) return;
	try {
		const now = Date.now();
		localStorage.setItem(FBC_KEY, JSON.stringify({ value: `fb.1.${now}.${fbclid}`, at: now }));
	} catch {
		// Penyimpanan diblokir: atribusi klik iklan melemah, pembelian tetap jalan.
	}
};

export interface MetaIds {
	fbp?: string;
	fbc?: string;
	source_url: string;
}

/** Data pencocokan Meta untuk dikirim ke backend (cookie pixel tidak ikut lintas origin). */
export const getMetaIds = (): MetaIds => {
	const fbp = cookie('_fbp');
	const fbc = cookie('_fbc') || storedFbc();
	return {
		...(fbp ? { fbp } : {}),
		...(fbc ? { fbc } : {}),
		// Tanpa hash: halaman bayar menaruh token akses transaksi di sana.
		source_url: `${window.location.origin}${window.location.pathname}${window.location.search}`.slice(0, MAX_URL),
	};
};

const newEventId = (prefix: string): string => {
	const random =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID()
			: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
	return `${prefix}-${random}`;
};

const send = (metaEvent: string, tiktokEvent: string, params: PixelParams, eventId?: string) => {
	try {
		window.fbq?.('track', metaEvent, params, eventId ? { eventID: eventId } : undefined);
		window.ttq?.track(tiktokEvent, params, eventId ? { event_id: eventId } : undefined);
	} catch {
		// Tracking tidak boleh mengganggu alur pembelian.
	}
};

/** Teruskan event halaman ke backend untuk Conversions API. Kegagalan diabaikan. */
const sendServer = (eventName: string, eventId: string, extra: Record<string, unknown> = {}) => {
	if (!metaEnabled || !backendUrl) return;
	try {
		void fetch(`${backendUrl}/api/meta/events`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...customerAuthHeader() },
			body: JSON.stringify({ event_name: eventName, event_id: eventId, ...extra, meta: getMetaIds() }),
			// Tetap terkirim walau halaman langsung berpindah (mis. setelah daftar).
			keepalive: true,
		}).catch(() => {});
	} catch {
		// Tracking tidak boleh mengganggu halaman.
	}
};

/**
 * Pasangan server dari PageView yang dikirim TrackingPixels.astro. Pada kunjungan pertama
 * cookie _fbp baru dibuat setelah pixel dimuat, jadi pengiriman ditunda sebentar.
 */
export const trackPageViewServer = (): void => {
	if (!metaEnabled) return;
	const eventId = window.__zaPageViewId ?? newEventId('pv');
	const fire = () => sendServer('PageView', eventId);
	if (cookie('_fbp')) fire();
	else setTimeout(fire, 1500);
};

interface PixelItem {
	id: string;
	name: string;
	value: number;
}

const commerceParams = (item: PixelItem): PixelParams => ({
	content_id: item.id,
	content_ids: [item.id],
	content_name: item.name,
	content_type: 'product',
	value: item.value,
	currency: 'IDR',
});

// Backend mengambil id/nama/harga event dari database berdasarkan slug, bukan dari browser.
export const trackViewContent = (item: PixelItem, slug: string) => {
	const eventId = newEventId('vc');
	send('ViewContent', 'ViewContent', commerceParams(item), eventId);
	sendServer('ViewContent', eventId, { event_slug: slug });
};

/** Pengunjung membuka form checkout sebuah event. */
export const trackAddToCart = (item: PixelItem, slug: string) => {
	const eventId = newEventId('atc');
	send('AddToCart', 'AddToCart', commerceParams(item), eventId);
	sendServer('AddToCart', eventId, { event_slug: slug });
};

/** Akun customer baru. Dipanggil setelah token disimpan: backend butuh token untuk mengenali akunnya. */
export const trackCompleteRegistration = (customerId: number) => {
	const eventId = `register-${customerId}`;
	send('CompleteRegistration', 'CompleteRegistration', { status: true }, eventId);
	sendServer('CompleteRegistration', eventId);
};

export const trackInitiateCheckout = (item: PixelItem, invoice: string) =>
	send('InitiateCheckout', 'InitiateCheckout', commerceParams(item), `checkout-${invoice}`);

export const trackPurchase = (item: PixelItem, invoice: string) =>
	send('Purchase', 'CompletePayment', commerceParams(item), `purchase-${invoice}`);
