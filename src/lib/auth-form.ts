export type AuthFieldErrors = Record<string, string>;

export const setNotice = (node: Element | null, message = '') => {
	if (!(node instanceof HTMLElement)) return;
	const messageNode = node.querySelector('[data-notice-message]');
	if (messageNode) messageNode.textContent = message;
	node.hidden = !message;
};

export const setFieldError = (form: HTMLFormElement | null, field: string, message = '') => {
	const errorNode = form?.querySelector(`[data-field-error="${field}"]`);
	const input = form?.querySelector(`[name="${field}"]`);
	if (errorNode) errorNode.textContent = message;
	if (input instanceof HTMLInputElement) {
		if (message) input.setAttribute('aria-invalid', 'true');
		else input.removeAttribute('aria-invalid');
	}
};

export const clearFieldErrors = (form: HTMLFormElement | null) => {
	form?.querySelectorAll('[data-field-error]').forEach((node) => { node.textContent = ''; });
	form?.querySelectorAll('input[aria-invalid]').forEach((node) => node.removeAttribute('aria-invalid'));
};

export const focusFirstInvalid = (form: HTMLFormElement | null) => {
	const firstInvalid = form?.querySelector('input[aria-invalid="true"]');
	if (firstInvalid instanceof HTMLInputElement) firstInvalid.focus();
};

export const setButtonLoading = (button: HTMLButtonElement | null, loading: boolean) => {
	if (!button) return;
	button.disabled = loading;
	button.setAttribute('aria-busy', String(loading));
	const icon = button.querySelector<HTMLElement>('[data-action-icon]');
	const spinner = button.querySelector<HTMLElement>('[data-action-spinner]');
	const label = button.querySelector('[data-action-label]');
	if (icon) icon.hidden = loading;
	if (spinner) spinner.hidden = !loading;
	if (label) label.textContent = loading ? (button.dataset.loadingLabel ?? 'Memproses...') : (button.dataset.defaultLabel ?? 'Lanjutkan');
};

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Sama persis dengan aturan di backend (CustomerAuthController::strongPasswordRule):
 * 15-72 karakter, ada huruf besar, huruf kecil, angka, dan simbol. Dicek di frontend
 * supaya user dapat feedback instan, tapi backend tetap validasi ulang sebagai sumber kebenaran.
 */
export const validateStrongPassword = (value: string): string => {
	if (value.length < 15 || value.length > 72) return 'Password harus 15 sampai 72 karakter.';
	if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) return 'Password harus mengandung huruf besar dan huruf kecil.';
	if (!/\d/.test(value)) return 'Password harus mengandung angka.';
	if (!/[^A-Za-z0-9]/.test(value)) return 'Password harus mengandung simbol, misalnya ! # $ % &.';
	return '';
};

export interface PasswordStrength {
	score: 0 | 1 | 2 | 3 | 4;
	label: string;
	percent: number;
}

export interface PasswordRuleStatus {
	length: boolean;
	mixedCase: boolean;
	number: boolean;
	symbol: boolean;
}

const STRENGTH_LABELS = ['Sangat lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat kuat'] as const;

/** Rincian per-kondisi dari aturan strong password, dipakai untuk checklist di bawah input. */
export const getPasswordRuleStatus = (value: string): PasswordRuleStatus => ({
	length: value.length >= 15 && value.length <= 72,
	mixedCase: /[a-z]/.test(value) && /[A-Z]/.test(value),
	number: /\d/.test(value),
	symbol: /[^A-Za-z0-9]/.test(value),
});

export const evaluatePasswordStrength = (value: string): PasswordStrength => {
	const rules = getPasswordRuleStatus(value);
	const score = Number(rules.length) + Number(rules.mixedCase) + Number(rules.number) + Number(rules.symbol);
	const capped = Math.min(score, 4) as PasswordStrength['score'];
	return { score: capped, label: value ? STRENGTH_LABELS[capped] : '', percent: (capped / 4) * 100 };
};
