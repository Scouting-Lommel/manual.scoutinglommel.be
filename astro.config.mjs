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
