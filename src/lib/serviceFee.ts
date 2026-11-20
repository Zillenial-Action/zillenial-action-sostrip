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

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;

/** Label tarif, mis. "0,7%" atau "Rp4.000/tiket"; kosong bila tanpa biaya. */
export function serviceFeeRateLabel(config: ServiceFeeConfig): string {
	if (config.nilai <= 0) return '';
	if (config.tipe === 'percent') return `${config.nilai.toLocaleString('id-ID')}%`;
	if (config.tipe === 'fixed') return `${rupiah(config.nilai)}/tiket`;
	return '';
}

export function readServiceFee(el: HTMLElement | null | undefined): ServiceFeeConfig {
	const tipe = el?.dataset.feeTipe;
	const nilai = Number(el?.dataset.feeNilai ?? 0);
	if ((tipe === 'percent' || tipe === 'fixed') && nilai > 0) return { tipe, nilai };
	return { tipe: 'none', nilai: 0 };
}
