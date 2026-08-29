---
title: Inleiding — hoe hangt het CMS samen met de website?
description: "Een eenvoudige uitleg van de weg die je inhoud aflegt: van het CMS naar de website en uiteindelijk naar de bezoeker."
---

# Inleiding — hoe hangt het CMS samen met de website?

De website van Scouting Lommel bestaat uit twee delen:

1. **Het CMS** — de "achterkant" waar jij werkt. Hier staan alle teksten, foto's, pagina's,
   takken, evenementen en instellingen. Het CMS heet **Strapi** en vind je op
   [admin.scoutinglommel.be](https://admin.scoutinglommel.be).
2. **De website** — de "voorkant" die bezoekers zien op
   [scoutinglommel.be](https://www.scoutinglommel.be).

## De weg van jouw wijziging naar de bezoeker

<figure>
  <img src="/captures/site-home.png" alt="De homepage van scoutinglommel.be zoals bezoekers die zien" />
  <figcaption>De homepage van scoutinglommel.be — dit is wat bezoekers zien.</figcaption>
</figure>

Het onderstaande schema toont hoe het in elkaar zit:

<figure>
  <img src="/flow.svg" alt="Stroomschema: van het CMS naar de website naar de bezoeker" />
  <figcaption>De weg van jouw inhoud: CMS → Website → Bezoeker.</figcaption>
</figure>

In gewone woorden:

- **Het CMS** — jij typt een tekst, voegt een foto toe of past een prijs aan. Dit is de
  enige plek waar jij iets wijzigt.
- **De website** — toont automatisch wat jij in het CMS hebt gezet. Je hoeft niets
  technisch te doen: geen verbindingen, geen knoppen, geen extra stappen.
- **De bezoeker** — ziet het resultaat op de website, zonder iets van het CMS te merken.

Het enige dat je moet onthouden: **wat jij in het CMS zet, verschijnt op de website.**

## Van het CMS naar de website: wat zie je waar?

Alles wat je in het CMS invult, komt ergens op de website terecht. Het is handig om te weten
hoe dat precies werkt, zodat je niet verrast wordt door wat bezoekers zien.

Een pagina is opgebouwd uit drie lagen:

1. **Velden** — de losse stukjes tekst en foto's die je invult. Een veld "Titel" wordt de
   grote kop bovenaan de pagina. Een veld "Tekst" wordt de lopende tekst. Een veld "Foto"
   wordt de afbeelding.
2. **Blokken** — de bouwstenen van een pagina. Elk blok is één onderdeel: een titelbalk, een
   tekst met foto, een kalender, een lijst van veelgestelde vragen, ... Je vult een blok in
   met velden.
3. **Secties** — wat de bezoeker op de website ziet. Elk blok dat jij toevoegt, wordt één
   sectie op de pagina.

Het belangrijkste om te onthouden: **de volgorde van de blokken in het CMS is de volgorde op
de website — van boven naar beneden.** Wat jij bovenaan in het CMS zet, staat bovenaan op de
pagina. Wat jij onderaan zet, staat onderaan.

Een concreet voorbeeld:

- Een veld "Titel" in het CMS wordt de grote kop bovenaan de pagina.
- Een blok "Tekst & afbeelding" wordt een sectie met tekst en een foto.
- Een blok "Kaart" wordt een sectie met de kaart van het lokaal.
- De volgorde van de blokken in het CMS is de volgorde op de website — van boven naar beneden.

Wat jij in het bewerkscherm van het CMS ziet (de velden en blokken onder elkaar), is dus
precies wat de bezoeker op de pagina ziet (de secties onder elkaar). Je hoeft niets te
"ontwerpen": de website zet jouw blokken automatisch om in een mooie pagina.

## Wat betekent dit voor jou?

- Je hoeft **nooit** iets te "publiceren naar de website" of een "upload" te doen: zodra je
  een wijziging opslaat en publiceert in het CMS, is die zichtbaar op de website bij de
  volgende paginalading. Meer daarover in [06 · Publiceren & versheid](/06-publiceren-versheid/).
- Je werkt **altijd in het CMS**, nooit rechtstreeks in de code van de website. De code is
  het werk van de ontwikkelaars (zie [09 · Wat je beter niet doet](/09-wat-je-beter-niet-doet/)).
- Het CMS toont meer dan wat er op de website verschijnt: sommige soorten inhoud zijn er voor
  de werking van de site of voor andere doeleinden. In
  [03 · Overzicht inhoudstypen](/03-overzicht-inhoudstypen/) lees je wat je waarvoor gebruikt.
