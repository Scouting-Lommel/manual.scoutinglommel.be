// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'CMS-handleiding Scouting Lommel',
			defaultLocale: 'nl',
			locales: {
				nl: { label: 'Nederlands', lang: 'nl' },
			},
			sidebar: [
				// Placeholder groups from the manual TOC — real pages land in a
				// later step (src/content/docs/*.md, kebab-case).
				{ label: 'Inleiding', items: [] },
				{ label: 'Inloggen', items: [] },
				{ label: 'Overzicht inhoudstypen', items: [] },
				{ label: 'Een pagina bewerken', items: [] },
				{ label: 'Media', items: [] },
				{ label: 'Publiceren & versheid', items: [] },
				{ label: 'Navigatie', items: [] },
				{ label: 'Instellingen', items: [] },
				{ label: 'Wat je beter niet doet', items: [] },
				{ label: 'Troubleshooting', items: [] },
				{ label: 'Vragen & wijzigingen', items: [] },
			],
			customCss: ['./src/styles/custom.css'],
			head: [
				// Editor docs: public URL, but excluded from search engines.
				{
					tag: 'meta',
					attrs: { name: 'robots', content: 'noindex, nofollow' },
				},
			],
		}),
	],
});
