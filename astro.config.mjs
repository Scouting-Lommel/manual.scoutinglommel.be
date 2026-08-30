// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'CMS-handleiding Scouting Lommel',
			defaultLocale: 'root',
			locales: {
				root: { label: 'Nederlands', lang: 'nl' },
			},
			sidebar: [
				// Fixed TOC from the manual plan — one page per section.
				{ label: 'Inleiding', items: [{ label: 'Inleiding', link: '01-inleiding' }] },
				{ label: 'Inloggen', items: [{ label: 'Inloggen', link: '02-inloggen' }] },
				{
					label: 'Overzicht inhoudstypen',
					items: [{ label: 'Overzicht inhoudstypen', link: '03-overzicht-inhoudstypen' }],
				},
				{
					label: 'Een pagina bewerken',
					items: [{ label: 'Een pagina bewerken', link: '04-pagina-bewerken' }],
				},
				{ label: 'Media', items: [{ label: 'Media', link: '05-media' }] },
				{
					label: 'Publiceren & versheid',
					items: [{ label: 'Publiceren & versheid', link: '06-publiceren-versheid' }],
				},
				{ label: 'Navigatie', items: [{ label: 'Navigatie', link: '07-navigatie' }] },
				{ label: 'Instellingen', items: [{ label: 'Instellingen', link: '08-instellingen' }] },
				{
					label: 'Wat je beter niet doet',
					items: [{ label: 'Wat je beter niet doet', link: '09-wat-je-beter-niet-doet' }],
				},
				{
					label: 'Troubleshooting',
					items: [{ label: 'Troubleshooting', link: '10-troubleshooting' }],
				},
				{
					label: 'Vragen & wijzigingen',
					items: [{ label: 'Vragen & wijzigingen', link: '11-vragen-wijzigingen' }],
				},
			],
			customCss: ['./src/styles/custom.css'],
			favicon: '/favicon.ico',
			components: {
				// Light-theme only: drop the dark/light theme toggle entirely.
				ThemeSelect: './src/components/ThemeSelect.astro',
			},
			head: [
				// Editor docs: public URL, but excluded from search engines.
				{
					tag: 'meta',
					attrs: { name: 'robots', content: 'noindex, nofollow' },
				},
				// Scouting Lommel favicon pack (from the site repo).
				{ tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: 'any' } },
				{
					tag: 'link',
					attrs: {
						rel: 'icon',
						type: 'image/png',
						sizes: '16x16',
						href: '/assets/head/favicon-16x16.png',
					},
				},
				{
					tag: 'link',
					attrs: {
						rel: 'icon',
						type: 'image/png',
						sizes: '32x32',
						href: '/assets/head/favicon-32x32.png',
					},
				},
				{
					tag: 'link',
					attrs: { rel: 'apple-touch-icon', href: '/assets/head/apple-touch-icon.png' },
				},
				{ tag: 'link', attrs: { rel: 'manifest', href: '/assets/head/site.webmanifest' } },
				{ tag: 'meta', attrs: { name: 'theme-color', content: '#364d3f' } },
				// Force the light theme only (the manual is a light-theme docs site;
				// the dark theme's white headings would clash with the brand palette).
				{
					tag: 'script',
					attrs: { type: 'module', src: '/theme-light.mjs' },
				},
			],
		}),
	],
});
