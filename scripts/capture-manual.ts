/**
 * capture-manual.ts — annotated-screenshot capture for the CMS editor manual.
 *
 * Run via: npx tsx scripts/capture-manual.ts <mode> [--check-readonly]
 *
 * Modes:
 *   --admin      capture annotated screenshots of the Strapi admin
 *                (requires STRAPI_ADMIN_EMAIL + STRAPI_ADMIN_PASSWORD)
 *   --frontend   capture annotated screenshots of the public site
 *                (no credentials required)
 *   --all        capture both admin and frontend screenshots
 *   --help       print usage and exit 0
 *
 * The script is STRICTLY READ-ONLY: interactions are limited to navigate,
 * hover, type-without-submit and screenshot (plus the login form submit —
 * authentication only, never a CMS mutation; see ALLOWED_INTERACTIONS). It
 * never clicks Save/Publish/Delete/Create/Upload and never opens the Member
 * collection (PII). --check-readonly proves read-only-ness by asserting
 * homePage.updatedAt (public GraphQL) is unchanged before/after capture.
 *
 * Env contract (asserted up front, values never logged):
 *   STRAPI_ADMIN_EMAIL / STRAPI_ADMIN_PASSWORD  required for --admin / --all
 *   NEXT_PUBLIC_APP_BACKEND_URL                 required for --check-readonly
 *   STRAPI_API_TOKEN                            optional; sent with GraphQL
 *                                                reads when present (this
 *                                                instance forbids anonymous
 *                                                reads), public retry on auth
 *                                                failure
 *   CAPTURE_ADMIN_BASE / CAPTURE_FRONTEND_BASE  optional base URL overrides
 *                                                (used by the failure QA runs)
 *
 * Screenshots are written to public/captures/.
 */

import { mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from 'playwright';

// ---------------------------------------------------------------------------
// (b) Centralized selectors.
// Admin selectors are class-name-based and version-fragile (Strapi SPA); keep
// them in ONE place. Finalized in the T1 spike (.omo/evidence/spike-cms-manual.md).
// ---------------------------------------------------------------------------
export const SELECTORS = {
	admin: {
		/** Login page is a JS SPA — raw HTML has no inputs; wait after hydration. */
		loginEmail: 'input[name="email"]',
		loginPassword: 'input[name="password"]',
		loginSubmit: 'button[type="submit"]',
		/** Not present on the current account; kept for robustness. */
		twoFactorCode:
			'input[name="code"], input[autocomplete="one-time-code"], input[placeholder*="code" i]',
		/** Must filter loading placeholders ("Loading widget content") — require the
		 *  same error text on 2 consecutive polls before trusting it. */
		authError: '[role="alert"], .form-error, [data-testid="error"], .error',
		sidebarNav: 'aside a[href], nav a[href]',
		contentTypes: 'a[href*="collection-types"], a[href*="single-types"]',
	},
} as const;

// ---------------------------------------------------------------------------
// (d) Output directory.
// ---------------------------------------------------------------------------
export const OUTPUT_DIR = path.join('public', 'captures');

// ---------------------------------------------------------------------------
// (c) CLI modes.
// ---------------------------------------------------------------------------
type Mode = 'admin' | 'frontend' | 'all';

interface ParsedArgs {
	mode: Mode | null;
	checkReadonly: boolean;
	help: boolean;
}

const USAGE = `Usage: npx tsx scripts/capture-manual.ts <mode> [--check-readonly]

Modes:
  --admin      Capture annotated screenshots of the Strapi admin
               (requires STRAPI_ADMIN_EMAIL + STRAPI_ADMIN_PASSWORD)
  --frontend   Capture annotated screenshots of the public site
               (no credentials required)
  --all        Capture both admin and frontend screenshots
  --help       Show this help and exit

Options:
  --check-readonly   Read homePage.updatedAt via public GraphQL before and
                     after capture and assert it is unchanged (proves the
                     run never mutated the CMS)

Environment (values are never printed):
  STRAPI_ADMIN_EMAIL          Strapi admin login email (--admin / --all)
  STRAPI_ADMIN_PASSWORD       Strapi admin login password (--admin / --all)
  NEXT_PUBLIC_APP_BACKEND_URL Backend GraphQL base URL (--check-readonly)
  STRAPI_API_TOKEN            Optional; sent with the readonly GraphQL read
                              when present (this instance forbids anonymous
                              reads), with a public retry on auth failure
  CAPTURE_ADMIN_BASE          Optional override for the admin base URL
                              (default https://admin.scoutinglommel.be)
  CAPTURE_FRONTEND_BASE       Optional override for the frontend base URL
                              (default https://www.scoutinglommel.be)

Screenshots are written to ${OUTPUT_DIR}. The script is strictly read-only:
interactions are limited to navigate, hover, type-without-submit, screenshot
and the login form submit (authentication only).`;

function parseArgs(argv: string[]): ParsedArgs {
	const parsed: ParsedArgs = { mode: null, checkReadonly: false, help: false };
	for (const arg of argv.slice(2)) {
		switch (arg) {
			case '--help':
				parsed.help = true;
				break;
			case '--admin':
			case '--frontend':
			case '--all': {
				const mode = arg.slice(2) as Mode;
				if (parsed.mode && parsed.mode !== mode) {
					throw new Error(`conflicting modes: --${parsed.mode} and --${mode}`);
				}
				parsed.mode = mode;
				break;
			}
			case '--check-readonly':
				parsed.checkReadonly = true;
				break;
			default:
				throw new Error(`unknown argument: ${arg}`);
		}
	}
	return parsed;
}

// ---------------------------------------------------------------------------
// (a) Env contract — assert presence up front, exit 1 naming the missing
// variables. Never print values.
// ---------------------------------------------------------------------------
function requiredEnvVars(mode: Mode, checkReadonly: boolean): string[] {
	const required: string[] = [];
	if (mode === 'admin' || mode === 'all') {
		required.push('STRAPI_ADMIN_EMAIL', 'STRAPI_ADMIN_PASSWORD');
	}
	if (checkReadonly) {
		required.push('NEXT_PUBLIC_APP_BACKEND_URL');
	}
	return required;
}

function assertEnv(mode: Mode, checkReadonly: boolean): void {
	const missing = requiredEnvVars(mode, checkReadonly).filter((name) => !process.env[name]);
	if (missing.length > 0) {
		console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
		console.error(`Required for this run: ${requiredEnvVars(mode, checkReadonly).join(', ')}`);
		console.error('Set them in your shell or in .env (see .env.example). Never commit .env.');
		process.exit(1);
	}
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

// ---------------------------------------------------------------------------
// (e) Shared browser context.
// ---------------------------------------------------------------------------
export async function createBrowserContext(): Promise<{
	browser: Browser;
	context: BrowserContext;
}> {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		locale: 'nl-BE',
		deviceScaleFactor: 1,
	});
	return { browser, context };
}

// ---------------------------------------------------------------------------
// (f) Interaction allowlist — the script may ONLY navigate, hover and
// type-without-submit (plus screenshot). The single exception is the login
// form submit ('login-submit'): it authenticates against the admin and never
// mutates CMS content. Any other click throws.
// ---------------------------------------------------------------------------
export const ALLOWED_INTERACTIONS = new Set([
	'navigate',
	'hover',
	'type-without-submit',
	'screenshot',
	'login-submit',
] as const);

export function assertAllowedInteraction(action: string): void {
	if (
		!ALLOWED_INTERACTIONS.has(
			action as typeof ALLOWED_INTERACTIONS extends Set<infer T> ? T : never,
		)
	) {
		throw new Error(
			`Interaction "${action}" is not in the read-only allowlist (${[...ALLOWED_INTERACTIONS].join(', ')}). ` +
				'The capture script must never click, submit, save, publish, delete, create or upload.',
		);
	}
}

export async function navigate(page: Page, url: string): Promise<void> {
	assertAllowedInteraction('navigate');
	await page.goto(url, { waitUntil: 'domcontentloaded' });
}

export async function hover(locator: Locator): Promise<void> {
	assertAllowedInteraction('hover');
	await locator.hover();
}

/** Fill a field without submitting (fill() sets the value directly — no Enter, no form submit). */
export async function typeWithoutSubmit(locator: Locator, value: string): Promise<void> {
	assertAllowedInteraction('type-without-submit');
	await locator.fill(value);
}

/** The ONLY click the script ever performs: the admin login form submit (authentication, not a CMS mutation). */
export async function loginSubmit(page: Page): Promise<void> {
	assertAllowedInteraction('login-submit');
	await page.locator(SELECTORS.admin.loginSubmit).click();
}

// ---------------------------------------------------------------------------
// (g) injectSvgOverlay — full implementation (T3).
// Injects an absolutely-positioned `pointer-events: none` SVG overlay
// (arrow + rounded label box + highlight ring) anchored to the target
// element's bounding box, sized to the full scrollable document so it stays
// aligned in fullPage screenshots. Never intercepts clicks.
// Brand colors (pinned from the site repo's src/assets/styles/settings/colors.pcss):
//   highlight ring #edb942 (--color-secondary-600)
//   label box      #364d3f (--color-primary-700), white text
//   arrow          #4d6e5a (--color-primary-600)
// ---------------------------------------------------------------------------
export type CalloutPosition = 'top' | 'bottom' | 'left' | 'right';

const BRAND = {
	ring: '#edb942',
	labelBg: '#364d3f',
	arrow: '#4d6e5a',
} as const;

function escapeXml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function buildOverlaySvg(
	box: { x: number; y: number; width: number; height: number },
	label: string,
	position: CalloutPosition,
	docWidth: number,
	docHeight: number,
): string {
	const fontSize = 16;
	const padX = 14;
	const padY = 10;
	const gap = 28;
	const labelW = Math.min(label.length * 8.6 + padX * 2, docWidth - 16);
	const labelH = fontSize + padY * 2;
	const cx = box.x + box.width / 2;
	const cy = box.y + box.height / 2;

	// Prefer the requested side, but fall back to whichever side has room so
	// the label never lands outside the canvas (rough placements came from
	// fixed positions clipping at the viewport edge).
	const sides: CalloutPosition[] = [position, 'right', 'left', 'top', 'bottom'].filter(
		(side, i, arr) => arr.indexOf(side) === i,
	) as CalloutPosition[];
	let chosen: CalloutPosition = sides[0];
	for (const side of sides) {
		let sx: number;
		let sy: number;
		switch (side) {
			case 'top':
				sx = cx - labelW / 2;
				sy = box.y - labelH - gap;
				break;
			case 'bottom':
				sx = cx - labelW / 2;
				sy = box.y + box.height + gap;
				break;
			case 'left':
				sx = box.x - labelW - gap;
				sy = cy - labelH / 2;
				break;
			case 'right':
				sx = box.x + box.width + gap;
				sy = cy - labelH / 2;
				break;
			default:
				continue;
		}
		if (sx >= 4 && sx + labelW <= docWidth - 4 && sy >= 4 && sy + labelH <= docHeight - 4) {
			chosen = side;
			break;
		}
	}
	position = chosen;

	// Label box placement relative to the target.
	let lx: number;
	let ly: number;
	switch (position) {
		case 'top':
			lx = cx - labelW / 2;
			ly = box.y - labelH - gap;
			break;
		case 'bottom':
			lx = cx - labelW / 2;
			ly = box.y + box.height + gap;
			break;
		case 'left':
			lx = box.x - labelW - gap;
			ly = cy - labelH / 2;
			break;
		case 'right':
			lx = box.x + box.width + gap;
			ly = cy - labelH / 2;
			break;
	}
	// Clamp into the document so the label is never clipped.
	lx = Math.max(4, Math.min(lx, docWidth - labelW - 4));
	ly = Math.max(4, Math.min(ly, docHeight - labelH - 4));

	// Arrow endpoints: label box edge -> target edge.
	let ax1: number;
	let ay1: number;
	let ax2: number;
	let ay2: number;
	switch (position) {
		case 'top':
			ax1 = lx + labelW / 2;
			ay1 = ly + labelH;
			ax2 = cx;
			ay2 = box.y;
			break;
		case 'bottom':
			ax1 = lx + labelW / 2;
			ay1 = ly;
			ax2 = cx;
			ay2 = box.y + box.height;
			break;
		case 'left':
			ax1 = lx + labelW;
			ay1 = ly + labelH / 2;
			ax2 = box.x;
			ay2 = cy;
			break;
		case 'right':
			ax1 = lx;
			ay1 = ly + labelH / 2;
			ax2 = box.x + box.width;
			ay2 = cy;
			break;
	}

	const ringPad = 5;
	const rw = box.width + ringPad * 2;
	const rh = box.height + ringPad * 2;
	// Safety net (Deviation D-D): keep the ring inside the captured canvas even
	// when the target sits at the very edge of the document — scrollIntoViewIfNeeded
	// scrolls minimally, so a bottom-edge target can still clip the ring pad.
	const rx = Math.max(0, Math.min(box.x - ringPad, docWidth - rw));
	const ry = Math.max(0, Math.min(box.y - ringPad, docHeight - rh));

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${docWidth}" height="${docHeight}" viewBox="0 0 ${docWidth} ${docHeight}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
  <defs>
    <marker id="cm-arrowhead" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L12,6 L0,12 z" fill="${BRAND.arrow}"/>
    </marker>
  </defs>
  <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="8" fill="none" stroke="${BRAND.ring}" stroke-width="3"/>
  <line x1="${ax1}" y1="${ay1}" x2="${ax2}" y2="${ay2}" stroke="${BRAND.arrow}" stroke-width="3" marker-end="url(#cm-arrowhead)"/>
  <rect x="${lx}" y="${ly}" width="${labelW}" height="${labelH}" rx="10" fill="${BRAND.labelBg}"/>
  <text x="${lx + labelW / 2}" y="${ly + labelH / 2}" fill="#ffffff" font-size="${fontSize}" font-weight="600" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>
</svg>`;
}

export async function injectSvgOverlay(
	page: Page,
	targetSelector: string,
	label: string,
	position: CalloutPosition = 'top',
): Promise<void> {
	const target = page.locator(targetSelector).first();
	await target.waitFor({ state: 'visible', timeout: 5000 });
	// Deviation D-D fix: the admin app scrolls inside a container (the document
	// height stays at the viewport), so a below-the-fold target's boundingBox().y
	// can exceed the captured canvas and the ring gets clipped. Scroll the target
	// into view first so the annotation lands inside the captured area.
	await target.scrollIntoViewIfNeeded().catch(() => undefined);
	const rawBox = await target.boundingBox();
	if (!rawBox) {
		throw new Error(`injectSvgOverlay: no bounding box for "${targetSelector}"`);
	}

	// The overlay must cover the full scrollable document so the annotation
	// stays aligned when the page is taller than the viewport (fullPage shots).
	const dims = await page.evaluate(() => ({
		width: Math.max(document.documentElement.scrollWidth, document.documentElement.clientWidth),
		height: Math.max(document.documentElement.scrollHeight, document.documentElement.clientHeight),
		scrollX: window.scrollX,
		scrollY: window.scrollY,
	}));

	// boundingBox() is viewport-relative; the fullPage canvas is the document at
	// scroll position 0, so translate by the current scroll offset.
	const box = {
		x: rawBox.x + dims.scrollX,
		y: rawBox.y + dims.scrollY,
		width: rawBox.width,
		height: rawBox.height,
	};

	const svg = buildOverlaySvg(box, label, position, dims.width, dims.height);
	await page.evaluate((html) => {
		const host = document.createElement('div');
		host.id = 'capture-manual-overlay';
		host.style.cssText = 'position:absolute;top:0;left:0;z-index:2147483647;pointer-events:none;';
		host.innerHTML = html;
		document.documentElement.appendChild(host);
	}, svg);
}

// ---------------------------------------------------------------------------
// (h) --check-readonly: homePage.updatedAt via GraphQL, before and after
// capture, must be unchanged. Mirrors the site repo's src/api/strapi.ts fetch
// pattern: POST + JSON body + no-store; sends STRAPI_API_TOKEN when present
// (this instance forbids unauthenticated reads) and retries as public on auth
// failure; errors are thrown with messages.
// ---------------------------------------------------------------------------
interface GraphQLError {
	message?: string;
	extensions?: { code?: string };
}

async function graphqlQuery<T>(backendUrl: string, query: string): Promise<T> {
	const token = process.env.STRAPI_API_TOKEN;
	const request = async (withAuth: boolean) => {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (withAuth) {
			headers.Authorization = `Bearer ${token}`;
		}
		return fetch(`${backendUrl}/graphql`, {
			method: 'POST',
			headers,
			body: JSON.stringify({ query }),
			cache: 'no-store',
		});
	};

	let res = await request(Boolean(token));
	let json = (await res.json()) as { data?: T; errors?: GraphQLError[] };

	const isAuthFailure =
		res.status === 401 ||
		res.status === 403 ||
		(json.errors ?? []).some(
			(error) =>
				error.extensions?.code === 'FORBIDDEN' ||
				error.message?.includes('Forbidden access') ||
				error.message?.includes('Unauthorized'),
		);

	if (isAuthFailure && token) {
		console.warn('GraphQL auth error, retrying as public request');
		res = await request(false);
		json = (await res.json()) as typeof json;
	}

	if (json.errors && json.errors.length > 0) {
		throw new Error(
			`GraphQL read failed: ${json.errors.map((e) => e.message ?? 'unknown error').join(', ')}`,
		);
	}

	if (!res.ok) {
		throw new Error(`GraphQL read failed: HTTP ${res.status} ${res.statusText}`);
	}

	return json.data as T;
}

export async function readHomePageUpdatedAt(backendUrl: string): Promise<string | null> {
	const data = await graphqlQuery<{ homePage?: { updatedAt?: string | null } | null }>(
		backendUrl,
		'query HomePageUpdatedAt { homePage { updatedAt } }',
	);
	return data.homePage?.updatedAt ?? null;
}

/** generalData.maintenanceMode — used to warn (but still capture) when the site is in maintenance mode. */
async function readMaintenanceMode(backendUrl: string): Promise<boolean | null> {
	const data = await graphqlQuery<{ generalData?: { maintenanceMode?: boolean | null } | null }>(
		backendUrl,
		'query GeneralDataMaintenanceMode { generalData { maintenanceMode } }',
	);
	return data.generalData?.maintenanceMode ?? null;
}

// ---------------------------------------------------------------------------
// Screenshot definitions (T3).
// Each definition: navigate → waitForLoadState('networkidle') → wait for
// waitSelector (first match of waitSelector + waitFallbacks) → if highlight +
// label are set, injectSvgOverlay (best-effort: annotation is skipped with a
// warning when the highlight selector is missing) → fullPage screenshot →
// public/captures/<id>.png. Fixed viewport 1440×900.
// ---------------------------------------------------------------------------
interface ScreenshotDefinition {
	id: string;
	url: string;
	waitSelector: string;
	/** Tried after waitSelector when it never becomes visible. */
	waitFallbacks?: string[];
	/** Element the highlight ring + arrow point at. */
	highlight?: string;
	/** Dutch label shown in the rounded rect. */
	label?: string;
	callout?: CalloutPosition;
	/** Resolves a dynamic URL (e.g. first group edit view, first tak slug). */
	resolve?: (page: Page) => Promise<string>;
	/** When true, a page that never renders its wait selector is skipped with a
	 *  warning instead of failing the run (used for screenshots blocked by a
	 *  production outage — never for admin screens). */
	optional?: boolean;
}

interface ManifestEntry {
	id: string;
	path: string;
	bytes: number;
}
type Manifest = ManifestEntry[];

function adminBase(): string {
	return process.env.CAPTURE_ADMIN_BASE ?? 'https://admin.scoutinglommel.be';
}

function frontendBase(): string {
	return process.env.CAPTURE_FRONTEND_BASE ?? 'https://www.scoutinglommel.be';
}

/** Wait for the first selector that becomes visible (all share one timeout). */
async function waitForAny(page: Page, selectors: string[], timeout = 15000): Promise<void> {
	await Promise.race(
		selectors.map((selector) =>
			page.waitForSelector(selector, { state: 'visible', timeout }).then(() => undefined),
		),
	).catch(() => {
		throw new Error(`none of the wait selectors became visible: ${selectors.join(', ')}`);
	});
}

/** Resolve the first group's edit-view URL from the Takken list (navigation only — no clicks). */
async function resolveGroupEditUrl(page: Page): Promise<string> {
	const listUrl = `${adminBase()}/admin/content-manager/collection-types/api::group.group`;
	await navigate(page, listUrl);
	await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined);
	await waitForAny(page, ['main table', 'main']);
	// 'attached' is enough — we only read the href; the row link may sit in a
	// scrollable list but is always in the DOM. Exclude the "Create new entry"
	// link: the capture script must never open a Create view.
	const link = page
		.locator('a[href*="collection-types/api::group.group/"]:not([href$="/create"])')
		.first();
	await link.waitFor({ state: 'attached', timeout: 15000 });
	const href = await link.getAttribute('href');
	if (!href) {
		throw new Error('could not resolve the first group edit URL');
	}
	return new URL(href, adminBase()).toString();
}

/** Resolve the first tak slug from the /takken page (navigation only — no clicks). */
async function resolveFirstTakSlug(page: Page): Promise<string> {
	await navigate(page, `${frontendBase()}/takken`);
	await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined);
	await waitForAny(page, ['main#main', 'main']);
	// 'attached' is enough — we only read the href. The first match may be a
	// hidden nav dropdown item; its href is still a valid tak slug.
	const link = page.locator('a[href^="/takken/"]').first();
	await link.waitFor({ state: 'attached', timeout: 15000 });
	const href = await link.getAttribute('href');
	if (!href) {
		throw new Error('could not resolve the first tak slug');
	}
	return new URL(href, frontendBase()).toString();
}

/**
 * Admin walkthrough (9 screenshots). The Member collection is NEVER opened
 * (PII). No Save/Publish/Delete/Create/Upload — the allowlist is enforced.
 */
const ADMIN_DEFINITIONS: ScreenshotDefinition[] = [
	{
		id: 'admin-login',
		url: `${adminBase()}/admin/auth/login`,
		waitSelector: 'input[name="email"]',
		highlight: 'input[name="email"]',
		label: 'Log in met je e-mailadres',
		callout: 'right',
	},
	{
		id: 'admin-content-manager',
		url: `${adminBase()}/admin/content-manager`,
		waitSelector: SELECTORS.admin.contentTypes,
		waitFallbacks: [SELECTORS.admin.sidebarNav],
		highlight: 'a[href="/admin/content-manager"]',
		label: 'Content Manager: alle inhoud',
		callout: 'right',
	},
	{
		id: 'admin-page-edit',
		url: `${adminBase()}/admin/content-manager/single-types/api::info-page.info-page`,
		waitSelector: 'main form',
		// The dynamic zone renders without a testid; its "add component" button
		// is the stable anchor for the annotation.
		highlight: 'button:has-text("Add a component to Blocks")',
		label: 'Dynamische zone: voeg blokken toe',
		callout: 'right',
	},
	{
		id: 'admin-homepage-edit',
		url: `${adminBase()}/admin/content-manager/single-types/api::home-page.home-page`,
		waitSelector: 'main form',
		highlight: 'main form h1',
		label: 'Homepagina bewerken',
		callout: 'top',
	},
	{
		id: 'admin-groups-list',
		url: `${adminBase()}/admin/content-manager/collection-types/api::group.group`,
		waitSelector: 'main table',
		waitFallbacks: ['main'],
		highlight: 'main table',
		label: 'Takken: lijst van groepen',
		callout: 'top',
	},
	{
		id: 'admin-group-edit',
		url: `${adminBase()}/admin/content-manager/collection-types/api::group.group`,
		waitSelector: 'main form',
		highlight: 'main form h1',
		label: 'Tak bewerken',
		callout: 'top',
		resolve: resolveGroupEditUrl,
	},
	{
		id: 'admin-media-library',
		url: `${adminBase()}/admin/plugins/upload`,
		waitSelector: 'main img',
		waitFallbacks: ['main'],
		highlight: 'main img',
		label: 'Media bibliotheek',
		callout: 'bottom',
	},
	{
		id: 'admin-settings',
		url: `${adminBase()}/admin/content-manager/single-types/api::general-data.general-data`,
		waitSelector: 'main form',
		// GeneralData edit form is English chrome — the maintenance toggle's
		// label is "Maintenance mode" (Dutch content labels only apply to
		// content types, not field labels). Match both to be robust.
		highlight: 'label:has-text("Maintenance mode"), label:has-text("Onderhoudsmodus")',
		label: 'Instellingen: algemene gegevens',
		callout: 'right',
	},
	{
		id: 'admin-navigation',
		url: `${adminBase()}/admin/plugins/navigation`,
		waitSelector: 'main',
		waitFallbacks: [SELECTORS.admin.sidebarNav],
		highlight: 'main h1',
		label: 'Navigatie beheren',
		callout: 'right',
	},
];

/**
 * Frontend walkthrough (8 screenshots). No credentials required. The apex
 * domain 307-redirects to www — the www base is used directly.
 */
const FRONTEND_DEFINITIONS: ScreenshotDefinition[] = [
	{
		id: 'site-home',
		url: `${frontendBase()}/`,
		waitSelector: 'main#main',
		waitFallbacks: ['main'],
		highlight: 'header',
		label: 'Header & navigatie',
		callout: 'bottom',
	},
	{
		id: 'site-takken',
		url: `${frontendBase()}/takken`,
		waitSelector: 'main#main',
		waitFallbacks: ['main'],
		highlight: 'section.sl-layout',
		label: 'Takken overzicht',
		callout: 'top',
	},
	{
		id: 'site-tak-slug',
		url: `${frontendBase()}/takken`,
		waitSelector: 'main#main',
		waitFallbacks: ['main'],
		highlight: '.hero',
		label: 'Takpagina',
		callout: 'bottom',
		resolve: resolveFirstTakSlug,
		// Production tak detail pages currently return HTTP 500 (verified for all
		// 6 slugs on 2026-08-29; GraphQL data is fine) — skip instead of shipping
		// a "500 Internal Server Error" screenshot into the manual.
		optional: true,
	},
	{
		id: 'site-wie-is-wie',
		url: `${frontendBase()}/wie-is-wie`,
		// No main#main fallback: the page currently 404s in production (route not
		// deployed yet) and the fallback would mask that with a 404 screenshot.
		waitSelector: '.wie-is-wie',
		highlight: '.wie-is-wie',
		label: 'Wie is wie: leiding per tak',
		callout: 'top',
		optional: true,
	},
	{
		id: 'site-handleidingen',
		url: `${frontendBase()}/handleidingen`,
		waitSelector: '.article-grid',
		waitFallbacks: ['main#main', 'main'],
		highlight: '.article-grid',
		label: 'Handleidingen voor bezoekers',
		callout: 'top',
	},
	{
		id: 'site-verhuur',
		url: `${frontendBase()}/verhuur`,
		waitSelector: 'main#main',
		waitFallbacks: ['main'],
		highlight: 'section.block-container--light',
		label: 'Verhuurlocaties',
		callout: 'top',
	},
	{
		id: 'site-contact',
		url: `${frontendBase()}/contact`,
		waitSelector: 'form.form',
		waitFallbacks: ['main#main', 'main'],
		highlight: 'form.form',
		label: 'Contactformulier',
		callout: 'top',
	},
	{
		id: 'site-inschrijven',
		url: `${frontendBase()}/inschrijven`,
		waitSelector: 'form.form',
		waitFallbacks: ['main#main', 'main'],
		highlight: 'form.form',
		label: 'Inschrijvingsformulier',
		callout: 'top',
	},
];

// ---------------------------------------------------------------------------
// Capture walkthroughs.
// ---------------------------------------------------------------------------
/**
 * Dismiss UI chrome that pollutes screenshots: modals, dialogs, toasts and
 * hover popovers. READ-ONLY by design: Escape key + close buttons only —
 * never Save/Publish/Delete/Create/Upload, never form submits. Best-effort:
 * anything that fails to close is logged, not fatal. The interaction
 * allowlist's spirit (no CMS data mutations) is preserved.
 */
const POPUP_CLOSE_SELECTORS = [
	'[aria-label="Close"]',
	'[aria-label="close"]',
	'[data-testid="modal-close-button"]',
	'[data-testid="notification-close"]',
	'button[aria-label*="close" i]',
	'button[aria-label*="Close" i]',
	'button:has-text("Skip")',
	'button:has-text("Skip tour")',
] as const;

async function dismissPopups(page: Page): Promise<{ dismissed: number; dialogsAtShot: number }> {
	let dismissed = 0;
	await page.keyboard.press('Escape').catch(() => undefined);
	await page.waitForTimeout(300);

	for (const selector of POPUP_CLOSE_SELECTORS) {
		try {
			const locator = page.locator(selector);
			const count = await locator.count().catch(() => 0);
			for (let i = 0; i < Math.min(count, 5); i++) {
				const btn = locator.nth(i);
				if (await btn.isVisible().catch(() => false)) {
					await btn.click({ timeout: 1500 }).catch(() => undefined);
					dismissed += 1;
					await page.waitForTimeout(200);
				}
			}
		} catch {
			/* selector not present */
		}
	}

	await page.waitForTimeout(500);
	const dialogsAtShot = await page
		.locator('[role="dialog"]:visible, [role="alertdialog"]:visible')
		.count()
		.catch(() => 0);
	return { dismissed, dialogsAtShot };
}

/** Wait until Strapi's async loading placeholders are gone (best-effort). */
async function waitForContentSettled(page: Page): Promise<void> {
	for (let i = 0; i < 10; i++) {
		const loading = await page
			.locator('text=/Loading widget content|Loading data|Loading \\.\\.\\./')
			.isVisible()
			.catch(() => false);
		if (!loading) {
			return;
		}
		await page.waitForTimeout(500);
	}
}

async function captureDefinition(
	page: Page,
	def: ScreenshotDefinition,
	manifest: Manifest,
): Promise<void> {
	let url: string;
	try {
		url = def.resolve ? await def.resolve(page) : def.url;
	} catch (err) {
		throw new Error(`failed to resolve URL for "${def.id}": ${(err as Error).message}`, {
			cause: err,
		});
	}

	console.log(`[capture] ${def.id}: ${url}`);
	try {
		await navigate(page, url);
	} catch (err) {
		throw new Error(`failed to capture "${def.id}" at ${url}: ${(err as Error).message}`, {
			cause: err,
		});
	}
	await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {
		console.warn(`[capture] ${def.id}: networkidle timed out, continuing`);
	});
	try {
		await waitForAny(page, [def.waitSelector, ...(def.waitFallbacks ?? [])]);
	} catch (err) {
		if (def.optional) {
			console.warn(
				`[capture] ${def.id}: SKIPPED — page did not render its content at ${url} (${(err as Error).message})`,
			);
			return;
		}
		throw err;
	}

	await waitForContentSettled(page);
	const { dismissed, dialogsAtShot } = await dismissPopups(page);
	console.log(
		`[capture] ${def.id}: popups-dismissed=${dismissed} dialogs-at-shot=${dialogsAtShot}`,
	);

	if (def.highlight && def.label) {
		try {
			await injectSvgOverlay(page, def.highlight, def.label, def.callout ?? 'top');
		} catch (err) {
			console.warn(`[capture] ${def.id}: annotation skipped: ${(err as Error).message}`);
		}
	}

	const outPath = path.join(OUTPUT_DIR, `${def.id}.png`);
	await page.screenshot({ path: outPath, fullPage: true });
	const bytes = statSync(outPath).size;
	manifest.push({ id: def.id, path: outPath, bytes });
	console.log(`[capture] ${def.id}: ${bytes} bytes`);
}

/**
 * Admin login: fill credentials, submit (the only allowed click), wait for
 * navigation away from /auth/. On failure: graceful error, NO retry (avoids
 * lockout). 2FA, if ever present, aborts with a clear message.
 */
async function loginToAdmin(page: Page): Promise<void> {
	const email = requireEnv('STRAPI_ADMIN_EMAIL');
	const password = requireEnv('STRAPI_ADMIN_PASSWORD');

	await page.waitForSelector(SELECTORS.admin.loginEmail, { timeout: 20000 });
	await typeWithoutSubmit(page.locator(SELECTORS.admin.loginEmail), email);
	await typeWithoutSubmit(page.locator(SELECTORS.admin.loginPassword), password);
	await loginSubmit(page);

	try {
		await page.waitForURL(
			(url) => url.pathname.startsWith('/admin') && !url.pathname.includes('/auth/'),
			{ timeout: 20000 },
		);
	} catch {
		const twoFactor = page.locator(SELECTORS.admin.twoFactorCode);
		if (await twoFactor.isVisible().catch(() => false)) {
			throw new Error('admin login requires a 2FA code — cannot automate; aborting without retry');
		}
		const errorText = await readAuthError(page);
		if (errorText) {
			throw new Error(`admin login failed (credentials rejected): ${errorText}`);
		}
		throw new Error('admin login failed: no navigation away from /auth/ and no error banner');
	}

	await page.waitForSelector(SELECTORS.admin.sidebarNav, { timeout: 20000 });
	await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined);
	console.log('[admin] logged in');
}

/** Strapi renders "Loading widget content" inside error-matching elements during SPA load — require the same text on 2 consecutive polls. */
async function readAuthError(page: Page): Promise<string | null> {
	const locator = page.locator(SELECTORS.admin.authError);
	let previous = '';
	for (let i = 0; i < 8; i++) {
		const text = (await locator.allTextContents()).join(' ').trim();
		if (text && text === previous && !/loading/i.test(text)) {
			return text;
		}
		previous = text;
		await page.waitForTimeout(400);
	}
	return null;
}

async function captureAdmin(context: BrowserContext, manifest: Manifest): Promise<void> {
	const page = await context.newPage();
	try {
		// admin-login is captured pre-auth; the rest require the session.
		await captureDefinition(page, ADMIN_DEFINITIONS[0], manifest);
		await loginToAdmin(page);
		for (const def of ADMIN_DEFINITIONS.slice(1)) {
			await captureDefinition(page, def, manifest);
		}
	} finally {
		await page.close();
	}
}

async function captureFrontend(context: BrowserContext, manifest: Manifest): Promise<void> {
	const backendUrl = process.env.NEXT_PUBLIC_APP_BACKEND_URL;
	if (backendUrl) {
		try {
			const maintenance = await readMaintenanceMode(backendUrl);
			if (maintenance) {
				console.warn(
					'[frontend] generalData.maintenanceMode is ON — the site may show the maintenance page; capturing anyway',
				);
			}
		} catch (err) {
			console.warn(`[frontend] maintenanceMode check skipped: ${(err as Error).message}`);
		}
	}

	const page = await context.newPage();
	try {
		for (const def of FRONTEND_DEFINITIONS) {
			await captureDefinition(page, def, manifest);
		}
	} finally {
		await page.close();
	}
}

function printManifest(manifest: Manifest): void {
	console.log('\nManifest:');
	for (const entry of manifest) {
		console.log(`  ${entry.path}  ${entry.bytes} bytes`);
	}
	console.log(`Total: ${manifest.length} screenshots`);
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------
async function run(parsed: ParsedArgs): Promise<void> {
	mkdirSync(OUTPUT_DIR, { recursive: true });

	const updatedAtBefore = parsed.checkReadonly
		? await readHomePageUpdatedAt(requireEnv('NEXT_PUBLIC_APP_BACKEND_URL'))
		: null;

	const { browser, context } = await createBrowserContext();
	const manifest: Manifest = [];
	try {
		if (parsed.mode === 'admin' || parsed.mode === 'all') {
			await captureAdmin(context, manifest);
		}
		if (parsed.mode === 'frontend' || parsed.mode === 'all') {
			await captureFrontend(context, manifest);
		}
	} finally {
		await context.close();
		await browser.close();
	}

	if (parsed.checkReadonly) {
		const updatedAtAfter = await readHomePageUpdatedAt(requireEnv('NEXT_PUBLIC_APP_BACKEND_URL'));
		if (updatedAtBefore !== updatedAtAfter) {
			throw new Error(
				`READ-ONLY VIOLATION: homePage.updatedAt changed before/after capture (${updatedAtBefore} -> ${updatedAtAfter})`,
			);
		}
		console.log(`readonly check OK: homePage.updatedAt unchanged (${updatedAtBefore})`);
	}

	printManifest(manifest);

	// PNG budget: each >10KB (a smaller file usually means a blank/error page), total ≤ 30.
	const small = manifest.filter((entry) => entry.bytes < 10_000);
	if (small.length > 0) {
		throw new Error(
			`PNG budget violated: ${small.map((e) => `${e.id} (${e.bytes} bytes)`).join(', ')} — every screenshot must be >10KB`,
		);
	}
	if (manifest.length > 30) {
		throw new Error(
			`PNG budget violated: ${manifest.length} screenshots exceed the 30-screenshot budget`,
		);
	}

	console.log('done');
}

function main(): void {
	let parsed: ParsedArgs;
	try {
		parsed = parseArgs(process.argv);
	} catch (err) {
		console.error(`Error: ${(err as Error).message}`);
		console.error(USAGE);
		process.exit(1);
	}

	if (parsed.help) {
		console.log(USAGE);
		process.exit(0);
	}

	if (!parsed.mode) {
		console.error('Error: no mode specified (--admin, --frontend or --all).');
		console.error(USAGE);
		process.exit(1);
	}

	assertEnv(parsed.mode, parsed.checkReadonly);

	run(parsed).catch((err: unknown) => {
		console.error(`capture-manual failed: ${(err as Error).message}`);
		process.exit(1);
	});
}

// Run only when executed directly (not when imported by probes/tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
