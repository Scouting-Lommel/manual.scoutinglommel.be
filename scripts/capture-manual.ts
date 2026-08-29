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
 * hover and type-without-submit (see assertAllowedInteraction). It never
 * clicks Save/Publish/Delete/Create/Upload and never opens the Member
 * collection (PII). --check-readonly proves read-only-ness by asserting
 * homePage.updatedAt (public GraphQL) is unchanged before/after capture.
 *
 * Env contract (asserted up front, values never logged):
 *   STRAPI_ADMIN_EMAIL / STRAPI_ADMIN_PASSWORD  required for --admin / --all
 *   NEXT_PUBLIC_APP_BACKEND_URL                 required for --check-readonly
 *
 * Screenshots are written to public/captures/.
 */

import { mkdirSync } from 'node:fs';
import path from 'node:path';
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
    twoFactorCode: 'input[name="code"], input[autocomplete="one-time-code"], input[placeholder*="code" i]',
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

Screenshots are written to ${OUTPUT_DIR}. The script is strictly read-only:
interactions are limited to navigate, hover and type-without-submit.`;

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
export async function createBrowserContext(): Promise<{ browser: Browser; context: BrowserContext }> {
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
// type-without-submit (plus screenshot). Anything else throws.
// ---------------------------------------------------------------------------
export const ALLOWED_INTERACTIONS = new Set(['navigate', 'hover', 'type-without-submit', 'screenshot'] as const);

export function assertAllowedInteraction(action: string): void {
  if (!ALLOWED_INTERACTIONS.has(action as (typeof ALLOWED_INTERACTIONS extends Set<infer T> ? T : never))) {
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

// ---------------------------------------------------------------------------
// (g) injectSvgOverlay — ANNOTATION STUB (T2).
// Full implementation lands in T3.
// Contract: given a target selector + Dutch label text + callout position,
// inject an absolutely-positioned `pointer-events: none` SVG overlay
// (arrow + rounded label box + highlight ring) anchored to the target
// element's bounding box, so the annotation never intercepts clicks.
// Brand colors (pinned from the site repo's colors.pcss):
//   highlight ring #edb942 (--color-secondary-600)
//   label box      #364d3f (--color-primary-700), white text
//   arrow          #4d6e5a (--color-primary-600)
// ---------------------------------------------------------------------------
export type CalloutPosition = 'top' | 'bottom' | 'left' | 'right';

export async function injectSvgOverlay(
  page: Page,
  targetSelector: string,
  label: string,
  position: CalloutPosition = 'top',
): Promise<void> {
  // T3: locate the target, read its bounding box, inject the SVG overlay.
  void page;
  void targetSelector;
  void label;
  void position;
  throw new Error('injectSvgOverlay is stubbed in T2; full implementation lands in T3');
}

// ---------------------------------------------------------------------------
// (h) --check-readonly: homePage.updatedAt via GraphQL, before and after
// capture, must be unchanged. Mirrors the site repo's src/api/strapi.ts fetch
// pattern: POST + JSON body + no-store; sends STRAPI_API_TOKEN when present
// (this instance forbids unauthenticated reads) and retries as public on auth
// failure; errors are thrown with messages.
// ---------------------------------------------------------------------------
interface GraphQLResponse {
  data?: { homePage?: { updatedAt?: string | null } | null };
  errors?: Array<{ message?: string; extensions?: { code?: string } }>;
}

export async function readHomePageUpdatedAt(backendUrl: string): Promise<string | null> {
  const token = process.env.STRAPI_API_TOKEN;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const request = async (withAuth: boolean) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (withAuth) {
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${backendUrl}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'query HomePageUpdatedAt { homePage { updatedAt } }' }),
      cache: 'no-store',
    });
  };

  let res = await request(Object.keys(authHeaders).length > 0);
  let json = (await res.json()) as GraphQLResponse;

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
    json = (await res.json()) as GraphQLResponse;
  }

  if (json.errors && json.errors.length > 0) {
    throw new Error(`GraphQL read failed: ${json.errors.map((e) => e.message ?? 'unknown error').join(', ')}`);
  }

  if (!res.ok) {
    throw new Error(`GraphQL read failed: HTTP ${res.status} ${res.statusText}`);
  }

  return json.data?.homePage?.updatedAt ?? null;
}

// ---------------------------------------------------------------------------
// Skeleton run (T2). Capture definitions (navigate → wait → annotate →
// screenshot) land in T3; this proves the env contract, output dir, shared
// browser context and readonly check all work end to end.
// ---------------------------------------------------------------------------
async function run(parsed: ParsedArgs): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const backendUrl = parsed.checkReadonly ? requireEnv('NEXT_PUBLIC_APP_BACKEND_URL') : null;
  const updatedAtBefore = parsed.checkReadonly ? await readHomePageUpdatedAt(backendUrl as string) : null;

  const { browser, context } = await createBrowserContext();
  try {
    console.log(`[skeleton] mode=${parsed.mode} — capture definitions land in T3`);
    console.log(`[skeleton] output dir: ${OUTPUT_DIR}`);
    // T3: walk the screenshot-definitions array here:
    //   navigate → waitForLoadState('networkidle') → waitForSelector →
    //   injectSvgOverlay (if highlight+label) → page.screenshot({ fullPage: true })
  } finally {
    await context.close();
    await browser.close();
  }

  if (parsed.checkReadonly) {
    const updatedAtAfter = await readHomePageUpdatedAt(backendUrl as string);
    if (updatedAtBefore !== updatedAtAfter) {
      throw new Error(
        `READ-ONLY VIOLATION: homePage.updatedAt changed before/after capture (${updatedAtBefore} -> ${updatedAtAfter})`,
      );
    }
    console.log(`readonly check OK: homePage.updatedAt unchanged (${updatedAtBefore})`);
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

main();