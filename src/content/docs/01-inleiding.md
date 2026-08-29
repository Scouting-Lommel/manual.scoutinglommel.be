---
title: Inleiding — hoe hangt de CMS samen met de website?
description: "Een eenvoudige uitleg van de weg die je inhoud aflegt: van de CMS naar de website en uiteindelijk naar de bezoeker."
---

# Inleiding — hoe hangt de CMS samen met de website?

De website van Scouting Lommel bestaat uit twee delen:

1. **De CMS** — de "achterkant" waar jij werkt. Hier staan alle teksten, foto's, pagina's,
   takken, evenementen en instellingen. De CMS heet **Strapi** en vind je op
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
  <img src="/flow.svg" alt="Stroomschema: CMS (Strapi) naar GraphQL naar Website naar Bezoeker" />
  <figcaption>De weg van jouw inhoud: CMS → GraphQL → Website → Bezoeker.</figcaption>
</figure>

In gewone woorden:

- **CMS (Strapi)** — jij typt een tekst of voegt een foto toe in de CMS. De CMS bewaart alle
  inhoud in een databank. Dit is de enige plek waar jij iets wijzigt.
- **GraphQL** — een "taal" waarmee de website de inhoud bij de CMS opvraagt. Je hoeft hier
  niets van te kennen: het is gewoon de verbinding tussen de twee. Elke keer dat iemand een
  pagina opent, vraagt de website de nieuwste inhoud op via die verbinding.
- **Website** — de website zet de opgevraagde inhoud om in mooie pagina's met blokken
  (titels, teksten, foto's, kalenders, ...). Zie
  [04 · Een pagina bewerken](/04-pagina-bewerken/) voor uitleg over die blokken.
- **Bezoeker** — de bezoeker ziet het resultaat in de browser, zonder dat hij of zij iets
  van de CMS merkt.

## Wat betekent dit voor jou?

- Je hoeft **nooit** iets te "publiceren naar de website" of een "upload" te doen: zodra je
  een wijziging opslaat en publiceert in de CMS, is die zichtbaar op de website bij de
  volgende paginalading. Meer daarover in [06 · Publiceren & versheid](/06-publiceren-versheid/).
- Je werkt **altijd in de CMS**, nooit rechtstreeks in de code van de website. De code is
  het werk van de ontwikkelaars (zie [09 · Wat je beter niet doet](/09-wat-je-beter-niet-doet/)).
- De CMS toont meer dan wat er op de website verschijnt: sommige inhoudstypen zijn er voor
  de werking van de site of voor andere doeleinden. In
  [03 · Overzicht inhoudstypen](/03-overzicht-inhoudstypen/) lees je wat je waarvoor gebruikt.