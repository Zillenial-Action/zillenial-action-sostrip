// API types matching prof backend responses

import type { UtmPayload } from './utm';

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
	utm?: UtmPayload;
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

export interface Customer {
	id: number;
	name: string;
	email: string;
	email_verified: boolean;
	has_google: boolean;
	initials: string;
}

export interface CustomerAuthResponse {
	message: string;
	token: string;
	data: Customer;
}

export interface CustomerOrder {
	invoice: string;
	status: 'Pending' | 'Success' | 'Failed';
	total_pembayaran: number;
	jumlah_tiket: number;
	tanggal_register: string | null;
	event: {
		name: string;
		slug: string;
		waktu_mulai: string | null;
		nama_tempat: string | null;
	} | null;
	action: { type: 'view_ticket' | 'continue_payment'; url: string } | null;
}

export interface CustomerOrderResponse {
	data: CustomerOrder[];
	meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface FundraiserCode {
	kode: string;
	kuota: number;
	digunakan: number;
	tiket_terjual: number;
	komisi_didapat: number;
	komisi_pending: number;
	share_url: string | null;
}

export interface FundraiserProgram {
	id: number;
	nilai_diskon: number;
	nilai_komisi: number;
	kuota_per_kode: number;
	tanggal_berakhir: string;
	is_open: boolean;
	event: {
		name: string;
		slug: string;
		waktu_mulai: string | null;
		harga: number;
		image: string | null;
	} | null;
	kode: FundraiserCode | null;
}

export interface FundraiserDashboardResponse {
	data: FundraiserProgram[];
	summary: { tiket_terjual: number; komisi_didapat: number; komisi_pending: number };
}

export interface TransaksiStatus {
	invoice: string;
	status_pembayaran: 'Pending' | 'Success' | 'Failed';
	total_pembayaran: number;
	jumlah_tiket: number;
	payment_channel?: PaymentChannel | null;
	payment_instructions?: PaymentInstructions | null;
	event: {
		id: number;
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
		public errors?: Record<string, string[]>,
	) {
		super(message);
	}
}

const base = () => (import.meta.env.PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '');

// Sesi customer berupa Bearer token (bukan cookie), jadi tidak bersinggungan
// dengan session login admin di backend.
const TOKEN_KEY = 'za_customer_token';

export const customerToken = {
	get(): string {
		try {
			return localStorage.getItem(TOKEN_KEY) ?? '';
		} catch {
			return '';
		}
	},
	set(token: string) {
		try {
			localStorage.setItem(TOKEN_KEY, token);
		} catch {
			// Mode privat/penyimpanan diblokir: login hanya berlaku selama halaman terbuka.
		}
	},
	clear() {
		try {
			localStorage.removeItem(TOKEN_KEY);
		} catch {
			// abaikan
		}
	},
};

/** Header Authorization untuk request yang perlu tahu customer yang sedang login. */
export const customerAuthHeader = (): Record<string, string> => {
	const token = customerToken.get();
	return token ? { Authorization: `Bearer ${token}` } : {};
};

async function apiFetch<T>(path: string, options?: RequestInit, withCustomer = false): Promise<T> {
	const res = await fetch(`${base()}${path}`, {
		...options,
		headers: {
			Accept: 'application/json',
			...(withCustomer ? customerAuthHeader() : {}),
			...(options?.headers ?? {}),
		},
	});
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as { message?: string; errors?: Record<string, string[]> };
		if (withCustomer && res.status === 401) customerToken.clear();
		throw new ApiError(res.status, err.message ?? 'Terjadi kesalahan.', err.errors);
	}
	return res.json() as Promise<T>;
}

const postJson = <T>(path: string, body: unknown, withCustomer = false) =>
	apiFetch<T>(path, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	}, withCustomer);

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
	auth: {
		register: (body: { name: string; email: string; password: string; password_confirmation: string }) =>
			postJson<CustomerAuthResponse>('/api/auth/register', body),
		login: (body: { email: string; password: string }) =>
			postJson<CustomerAuthResponse>('/api/auth/login', body),
		exchangeGoogleCode: (code: string) =>
			postJson<CustomerAuthResponse>('/api/auth/google/exchange', { code }),
		logout: () => postJson<{ message: string }>('/api/auth/logout', {}, true),
		me: () => apiFetch<{ data: Customer }>('/api/auth/me', undefined, true),
		orders: () => apiFetch<CustomerOrderResponse>('/api/account/orders', undefined, true),
	},
	fundraiser: {
		dashboard: () => apiFetch<FundraiserDashboardResponse>('/api/fundraiser', undefined, true),
		generateCode: (programId: number) =>
			postJson<{ message: string; data: FundraiserProgram }>(`/api/fundraiser/${programId}/kode`, {}, true),
	},
};
