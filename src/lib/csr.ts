// Helper kecil untuk render data di sisi browser (CSR).
// Komponen .astro menyediakan kerangka + placeholder; fungsi di sini mengisi DOM
// setelah data di-fetch dari API.

type Data = Record<string, unknown>;

// Hanya izinkan skema URL yang aman; tolak javascript:, data:, dll.
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function safeUrl(value: string): string | null {
	try {
		const url = new URL(value, window.location.origin);
		return SAFE_SCHEMES.has(url.protocol) ? value : null;
	} catch {
		return null;
	}
}

/**
 * Isi teks/atribut elemen berdasarkan atribut data-bind* di dalam `root`.
 * - data-bind="field"       -> textContent
 * - data-bind-src="field"   -> atribut src
 * - data-bind-alt="field"   -> atribut alt
 * - data-bind-href="field"  -> atribut href
 */
export function bind(root: ParentNode, data: Data): void {
	// Sertakan root itu sendiri, bukan hanya turunannya (querySelectorAll melewatkan root).
	const select = (sel: string): HTMLElement[] => {
		const els = Array.from(root.querySelectorAll<HTMLElement>(sel));
		if (root instanceof HTMLElement && root.matches(sel)) els.unshift(root);
		return els;
	};

	select('[data-bind]').forEach((el) => {
		const key = el.dataset.bind;
		if (key && data[key] != null) el.textContent = String(data[key]);
	});
	select('[data-bind-src]').forEach((el) => {
		const key = el.dataset.bindSrc;
		if (key && data[key]) {
			const url = safeUrl(String(data[key]));
			if (url) el.setAttribute('src', url);
		}
	});
	select('[data-bind-alt]').forEach((el) => {
		const key = el.dataset.bindAlt;
		if (key && data[key]) el.setAttribute('alt', String(data[key]));
	});
	select('[data-bind-href]').forEach((el) => {
		const key = el.dataset.bindHref;
		if (key && data[key]) {
			const url = safeUrl(String(data[key]));
			if (url) el.setAttribute('href', url);
		}
	});
}

/**
 * Render daftar item dengan meng-clone <template> lalu mengisi tiap clone.
 * `listSelector` menunjuk container, `tplSelector` menunjuk <template> berisi 1 item.
 */
export function renderList<T extends Data>(
	listSelector: string,
	tplSelector: string,
	items: T[],
	fill?: (node: HTMLElement, item: T, index: number) => void,
): void {
	const list = document.querySelector(listSelector);
	const tpl = document.querySelector<HTMLTemplateElement>(tplSelector);
	if (!list || !tpl || !tpl.content.firstElementChild) return;

	list.innerHTML = '';
	items.forEach((item, index) => {
		const node = tpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
		bind(node, item);
		fill?.(node, item, index);
		reveal(node);
		list.appendChild(node);
	});
}

// Node hasil clone ditambahkan setelah IntersectionObserver reveal berjalan,
// jadi langsung tandai terlihat agar tidak tersembunyi (opacity:0 dari data-reveal).
function reveal(node: HTMLElement): void {
	if (node.hasAttribute('data-reveal')) node.classList.add('is-visible');
	node.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
}

// Allowlist ini mengikuti HtmlSanitizer di backend (zillenial-action-profile).
const ALLOWED_TAGS = new Set([
	'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S',
	'OL', 'UL', 'LI', 'BLOCKQUOTE', 'H2', 'H3', 'H4', 'A', 'IMG',
]);
// Elemen yang dibuang beserta isinya (bukan sekadar di-unwrap).
const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH']);

function cleanNode(node: Element): void {
	Array.from(node.children).forEach((child) => {
		// tagName elemen SVG/MathML huruf kecil, jadi dinormalkan dulu.
		const tag = child.tagName.toUpperCase();
		if (DROP_TAGS.has(tag)) {
			child.remove();
			return;
		}

		cleanNode(child);

		if (!ALLOWED_TAGS.has(tag)) {
			child.replaceWith(...Array.from(child.childNodes));
			return;
		}

		const href = child.getAttribute('href');
		const src = child.getAttribute('src');
		const alt = child.getAttribute('alt');
		const width = child.getAttribute('width');
		const height = child.getAttribute('height');
		Array.from(child.attributes).forEach((attr) => child.removeAttribute(attr.name));

		if (tag === 'A') {
			const url = href ? safeUrl(href) : null;
			if (url) {
				child.setAttribute('href', url);
				child.setAttribute('target', '_blank');
				child.setAttribute('rel', 'noopener noreferrer');
			}
		} else if (tag === 'IMG') {
			const url = src ? safeUrl(src) : null;
			if (!url || !/^https?:$/.test(new URL(url, window.location.origin).protocol)) {
				child.remove();
				return;
			}
			child.setAttribute('src', url);
			child.setAttribute('alt', alt ?? '');
			if (width && /^\d+$/.test(width)) child.setAttribute('width', width);
			if (height && /^\d+$/.test(height)) child.setAttribute('height', height);
			child.setAttribute('loading', 'lazy');
			child.setAttribute('decoding', 'async');
		}
	});
}

/**
 * Isi `el` dengan HTML rich text dari admin. Disaring ulang di browser memakai allowlist
 * (tag + atribut + skema URL) sebelum dimasukkan ke DOM.
 */
export function setRichHtml(el: Element, html: string): void {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	cleanNode(doc.body);
	el.replaceChildren(...Array.from(doc.body.childNodes));
}

/** True bila HTML hanya berisi tag kosong (mis. `<p><br></p>`) tanpa teks atau gambar. */
export function isBlankHtml(html: string): boolean {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	return !doc.body.textContent?.trim() && !doc.body.querySelector('img');
}

/** Baca nilai query string dari URL saat ini. */
export function queryParam(name: string): string | null {
	return new URLSearchParams(window.location.search).get(name);
}
