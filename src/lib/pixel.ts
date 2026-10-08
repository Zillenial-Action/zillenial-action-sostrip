// Meta & TikTok pixel. Base code + PageView dimuat oleh components/TrackingPixels.astro;
// helper di sini hanya mengirim event, dan diam saja bila pixel tidak aktif (ID env kosong).
// eventID/event_id disamakan dengan portal backend (mis. "purchase-{invoice}") agar tidak dobel.

type PixelParams = Record<string, unknown>;

declare global {
	interface Window {
		fbq?: (...args: unknown[]) => void;
		ttq?: { track: (...args: unknown[]) => void };
	}
}

const send = (metaEvent: string, tiktokEvent: string, params: PixelParams, eventId?: string) => {
	try {
		window.fbq?.('track', metaEvent, params, eventId ? { eventID: eventId } : undefined);
		window.ttq?.track(tiktokEvent, params, eventId ? { event_id: eventId } : undefined);
	} catch {
		// Tracking tidak boleh mengganggu alur pembelian.
	}
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

export const trackViewContent = (item: PixelItem) => send('ViewContent', 'ViewContent', commerceParams(item));

export const trackInitiateCheckout = (item: PixelItem, invoice: string) =>
	send('InitiateCheckout', 'InitiateCheckout', commerceParams(item), `checkout-${invoice}`);

export const trackPurchase = (item: PixelItem, invoice: string) =>
	send('Purchase', 'CompletePayment', commerceParams(item), `purchase-${invoice}`);
