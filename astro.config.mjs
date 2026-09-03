// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Website handleiding Scouting Lommel',
			defaultLocale: 'root',
			locales: {
				root: { label: 'Nederlands', lang: 'nl' },
			},
			sidebar: [
				// Home / overview page for the manual.
				{ label: 'Overzicht', link: '/' },
				// Grouped TOC: a few sections, each with multiple pages.
				{
					label: 'Aan de slag',
					items: [
						{ label: 'Inleiding', link: '01-inleiding' },
						{ label: 'Inloggen', link: '02-inloggen' },
					],
				},
				{
					label: 'Inhoud beheren',
					items: [
						{ label: 'Overzicht inhoudstypen', link: '03-overzicht-inhoudstypen' },
						{ label: 'Werken met verzamelingen', link: '03b-werken-met-verzamelingen' },
						{ label: 'Een pagina bewerken', link: '04-pagina-bewerken' },
						{ label: 'Media', link: '05-media' },
						{ label: 'Publiceren & versheid', link: '06-publiceren-versheid' },
					],
				},
				{
					label: 'Website beheren',
					items: [
						{ label: 'Navigatie', link: '07-navigatie' },
						{ label: 'Instellingen', link: '08-instellingen' },
					],
				},
				{
					label: 'Tips & hulp',
					items: [
						{ label: 'Wat je beter niet doet', link: '09-wat-je-beter-niet-doet' },
						{ label: 'Troubleshooting', link: '10-troubleshooting' },
						{ label: 'Vragen & wijzigingen', link: '11-vragen-wijzigingen' },
					],
				},
				{
					label: 'Groepsleiding',
					items: [
						{ label: 'Taken van de groepsleiding', link: '12-groepsleiding-taken' },
						{ label: 'Staging-omgeving', link: '13-staging-omgeving' },
					],
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
