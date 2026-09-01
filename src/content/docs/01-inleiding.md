---
title: Inleiding — hoe hangt het CMS samen met de website?
description: 'Een eenvoudige uitleg van de weg die je inhoud aflegt: van het CMS naar de website en uiteindelijk naar de bezoeker.'
---

De website van Scouting Lommel bestaat uit twee delen:

1. **Het CMS** — de achterkant waar jij werkt. Hier staan alle teksten, foto's, pagina's, takken, evenementen en instellingen. Het CMS heet **Strapi** en vind je op [admin.scoutinglommel.be](https://admin.scoutinglommel.be).
2. **De website** — de voorkant die bezoekers zien op [scoutinglommel.be](https://www.scoutinglommel.be).

<figure>
  <img src="/captures/site-home.png" alt="De homepage van scoutinglommel.be zoals bezoekers die zien" />
  <figcaption>De homepage van scoutinglommel.be — dit is wat bezoekers zien.</figcaption>
</figure>

## De weg van jouw wijziging naar de bezoeker

Het onderstaande schema toont hoe je inhoud van het CMS naar de website reist:

<figure>
  <img src="/flow.svg" alt="Stroomschema: van het CMS naar de website naar de bezoeker" />
  <figcaption>De weg van jouw inhoud: CMS → Website → Bezoeker.</figcaption>
</figure>

In het kort:

- **Jij werkt in het CMS** — je typt een tekst, voegt een foto toe of past een prijs aan. Dit is de enige plek waar je iets wijzigt.
- **De website toont automatisch** wat je in het CMS hebt gezet. Geen extra stappen, geen technische handelingen.
- **De bezoeker ziet het resultaat** op de website, zonder iets van het CMS te merken.

Het enige dat je moet onthouden: **wat je in het CMS zet, verschijnt op de website.**

## Van het CMS naar de website: hoe zit een pagina in elkaar?

Alles wat je in het CMS invult, komt ergens op de website terecht. Een pagina is opgebouwd uit vier lagen die in elkaar zitten als een set matroesjka's:

1. **Items (entries)** — één pagina, één tak, één evenement. Het item is de hele verpakking: het bevat alle blokken en velden die bij elkaar horen.
2. **Velden (fields)** — de losse stukjes tekst en foto's die je invult. Een veld "Titel" wordt de grote kop bovenaan de pagina. Een veld "Tekst" wordt de lopende tekst. Een veld "Foto" wordt de afbeelding.
3. **Blokken (blocks)** — de bouwstenen van een pagina. Elk blok is één onderdeel: een titelbalk, een tekst met foto, een kalender, een lijst van veelgestelde vragen. Je vult een blok in met velden.
4. **Secties** — wat de bezoeker op de website ziet. Elk blok dat je toevoegt, wordt één sectie op de pagina.

### Hoe hangen ze samen?

Stel je een pagina voor als een artikel in een krant:

- **Het item** is het hele artikel.
- **De blokken** zijn de paragrafen, foto's en tussenkoppen binnen dat artikel.
- **De velden** zijn de losse zinnen, woorden en afbeeldingen in elke paragraaf.
- **De secties** zijn wat de lezer uiteindelijk op papier ziet.

Of, concreet voor de website:

| Laag | In het CMS | Op de website |
|------|-----------|---------------|
| **Item** | Je opent "Pagina - Home" en bewerkt die. | De homepage op scoutinglommel.be. |
| **Blok** | Je voegt een blok "Tekst & afbeelding" toe. | Een sectie met tekst en een foto. |
| **Veld** | Je typt iets in het veld "Titel" van dat blok. | De kop boven die sectie. |
| **Sectie** | — | Wat de bezoeker ziet: de kop, de tekst en de foto samen. |

De volgorde van de blokken in het CMS is de volgorde op de website — van boven naar beneden. Wat je bovenaan in het CMS zet, staat bovenaan op de pagina. Wat je onderaan zet, staat onderaan.

Je hoeft niets te ontwerpen: de website zet jouw blokken automatisch om in een mooie pagina.

## Wat betekent dit voor jou?

- **Je hoeft nooit iets te publiceren naar de website.** Zodra je een wijziging opslaat en publiceert in het CMS, is die zichtbaar op de website bij de volgende paginalading. Meer daarover in [06 · Publiceren & versheid](/06-publiceren-versheid/).
- **Je werkt altijd in het CMS, nooit in de code.** De code is het werk van de ontwikkelaars (zie [09 · Wat je beter niet doet](/09-wat-je-beter-niet-doet/)).
- **Het CMS toont meer dan wat op de website verschijnt.** Sommige soorten inhoud zijn er voor de werking van de site of voor andere doeleinden. In [03 · Overzicht inhoudstypen](/03-overzicht-inhoudstypen/) lees je wat je waarvoor gebruikt.
