// API types matching prof backend responses

export interface EventListItem {
	id: number;
	name: string;
	slug: string;
	image: string | null;
	harga: number;
	waktu_mulai: string;
	kota: string | null;
	mitra: string | null;
	status: boolean | number | string | null;
	sisa_tiket: number;
	is_sold_out?: boolean;
}

export interface EventDetailAPI extends EventListItem {
	waktu_berakhir: string | null;
	deskripsi: string | null;
	website: string | null;
	nama_tempat: string | null;
	alamat: string | null;
	direction_url: string | null;
	benefits?: string[];
	agenda?: Array<{
		time_label?: string | null;
		title?: string | null;
		description?: string | null;
	}>;
	jumlah_tiket: number;
}

export interface PaymentMethod {
	id: number;
	name: string;
	image: string | null;
	type: string;
	midtrans_payment_type?: PaymentChannel | null;
}

export interface EventListResponse {
	data: EventListItem[];
	meta: { current_page: number; last_page: number; total: number; per_page: number };
}

export interface VoucherValidateResponse {
	success: boolean;
	message: string;
	discount_per_ticket?: number;
	voucher_id?: number;
	voucher_name?: string;
	is_external?: boolean;
}

export interface CheckoutBody {
	event_slug: string;
	jumlah_tiket: number;
	payment_method_id: number;
	voucher_code?: string;
	pengunjung: Array<{ name: string; email: string; telepon: string; jenis_kelamin: string }>;
}

export interface PaymentInstructions {
	bank?: string;
	va_number?: string;
	bill_key?: string;
	biller_code?: string;
	qr_url?: string;
	deeplink_url?: string;
	expiry_time?: string;
}

export type PaymentChannel = 'bank_transfer' | 'echannel' | 'gopay' | 'shopeepay' | 'qris';

export interface CheckoutResponse {
	success: boolean;
	order_id: string;
	access_token?: string;
	snap_token: string;
	payment_channel?: PaymentChannel | null;
	payment_instructions?: PaymentInstructions | null;
	message?: string;
}

export interface TransaksiStatus {
	invoice: string;
	status_pembayaran: 'Pending' | 'Success' | 'Failed';
	total_pembayaran: number;
	jumlah_tiket: number;
	payment_channel?: PaymentChannel | null;
	payment_instructions?: PaymentInstructions | null;
	event: {
		name: string;
		slug: string;
		waktu_mulai: string;
		nama_tempat: string | null;
		image: string | null;
	};
}

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
	}
}

const base = () => (import.meta.env.PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '');

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${base()}${path}`, {
		headers: { Accept: 'application/json', ...(options?.headers ?? {}) },
		...options,
	});
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as { message?: string };
		throw new ApiError(res.status, err.message ?? 'Terjadi kesalahan.');
	}
	return res.json() as Promise<T>;
}

export const api = {
	events: {
		list: (params?: { search?: string; page?: number; per_page?: number }) => {
			const qs = new URLSearchParams();
			if (params?.search) qs.set('search', params.search);
			if (params?.page) qs.set('page', String(params.page));
			if (params?.per_page) qs.set('per_page', String(params.per_page));
			const query = qs.toString();
			return apiFetch<EventListResponse>(`/api/events${query ? `?${query}` : ''}`);
		},
		show: (slug: string) => apiFetch<{ data: EventDetailAPI }>(`/api/events/${slug}`),
	},
	paymentMethods: {
		list: () => apiFetch<{ data: PaymentMethod[] }>('/api/payment-methods'),
	},
	voucher: {
		validate: (body: { code: string; event_id: number; jumlah_tiket?: number }) =>
			apiFetch<VoucherValidateResponse>('/api/voucher/validate', {
				method: 'POST',
				body: JSON.stringify(body),
				headers: { 'Content-Type': 'application/json' },
			}),
	},
	checkout: {
		create: (body: CheckoutBody) =>
			apiFetch<CheckoutResponse>('/api/checkout', {
				method: 'POST',
				body: JSON.stringify(body),
				headers: { 'Content-Type': 'application/json' },
			}),
	},
	transaksi: {
		status: (invoice: string, token?: string) => {
			const query = token ? `?token=${encodeURIComponent(token)}` : '';
			return apiFetch<{ data: TransaksiStatus }>(`/api/transaksi/${encodeURIComponent(invoice)}${query}`);
		},
	},
};
