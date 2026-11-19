import type { ServiceFeeConfig } from './api';

/**
 * Preview biaya layanan di checkout. Harus sama dengan
 * zillenial-action-profile/app/Services/ServiceFeeSettings::calculate().
 */
export function calculateServiceFee(config: ServiceFeeConfig, subtotal: number, qty: number): number {
	if (subtotal <= 0 || qty <= 0 || config.nilai <= 0) return 0;

	if (config.tipe === 'percent') {
		// Bulatkan dulu supaya galat float (mis. 100000 * 1.1 / 100) tidak menambah Rp1.
		return Math.ceil(Math.round((subtotal * config.nilai) / 100 * 1e6) / 1e6);
	}

	if (config.tipe === 'fixed') {
		return Math.round(config.nilai) * qty;
	}

	return 0;
}
