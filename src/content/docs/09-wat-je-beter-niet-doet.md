---
title: Wat je beter niet doet
description: Dingen die je moet vermijden in het CMS — het Artikels-blok, ledengegevens en rechtstreekse wijzigingen aan de code.
---

# Wat je beter niet doet

Het CMS is gemaakt om de website te beheren, maar niet alles wat erin staat is bedoeld om te
gebruiken. Dit zijn de drie belangrijkste dingen die je beter niet doet.

## 1. Gebruik het blok "Artikels" niet

In het CMS bestaat een blok **"Artikels"** (Engels: _ArticlesBlock_). Dat blok wordt
**niet ondersteund** door de website: de code van de website kent het blok niet, dus het
verschijnt **nooit** op de pagina.

- Voeg het blok "Artikels" dus **niet** toe aan een pagina — het lijkt alsof je wijziging
  "niet werkt", terwijl het blok gewoon niet getoond kan worden.
- Gebruik in de plaats de blokken die de website wél ondersteunt. De volledige lijst vind je
  in [04 · Een pagina bewerken](/04-pagina-bewerken/).
- Vind je een pagina waar het blok al in staat? Verwijder het blok en vervang het door een
  ondersteund blok.

## 2. Publiceer nooit ledengegevens

De verzameling **"Leden"** bevat persoonlijke gegevens van leden: e-mailadressen,
telefoonnummers en adressen. Die gegevens worden **nooit** op de website getoond — en dat
moet zo blijven.

- **Bewerk de "Leden"-verzameling niet.** De website toont die gegevens niet, dus er is
  geen enkele reden om ze aan te passen.
- **Kopieer geen ledengegevens** naar andere inhoud (bv. een tekstblok of een bestand).
  Eén vergissing kan betekenen dat persoonlijke gegevens op het internet verschijnen.
- De **leiders** van de takken zijn wél openbaar: hun namen en functies staan op de website
  en mogen daar blijven staan.

## 3. Wijzig niets rechtstreeks in de code

De website is meer dan alleen het CMS: er draait ook code achter (de "website-code" die de
pagina's opbouwt). Die code wordt beheerd door de **ontwikkelaars**.

- Wijzig **nooit** zelf iets in de code van de website — ook niet als je technisch
  onderlegd bent. Het CMS is de enige plek waar jij inhoud wijzigt.
- Werkt er iets niet, of wil je iets dat het CMS niet kan? Meld het aan de ontwikkelaars
  (zie [11 · Vragen & wijzigingen](/11-vragen-wijzigingen/)) in plaats van zelf te
  sleutelen.

## En verder

- **Test niet op de echte website.** Maak geen "testpagina's" die bezoekers kunnen zien;
  werk met concepten (Opslaan zonder Publiceren) tot je zeker bent van je wijziging.
- **Verwijder geen afbeeldingen** die nog op een pagina gebruikt worden (zie
  [05 · Media](/05-media/)).
