# GlanzJobs Bewerbungsfunnel (Webflow-Laufzeitcode)

`funnel.js` ist der Laufzeit-Code der Webflow-Vorlage "Stellen Template" (Seite bewerbung.glanzjobs.de/job/...).
Er wird ueber jsDelivr mit festem Commit eingebunden, z. B.
`https://cdn.jsdelivr.net/gh/temutluer-glitch/glanzjobs-funnel@<commit>/funnel.js`.
Aufgaben: Fragen-Schritte aus der Collection-Liste vorbereiten (Radio-Namen und -Werte, KO-Knopf, Mehrfachauswahl),
Zaehler und Fortschrittsbalken, Attribution (fbc/fbp, UTM, Anzeigen-Namen) in versteckte Felder, Quiz- und Zeit-Events
fuer den Google Tag Manager, Verlassen-Warnung. Enthaelt keine Geheimnisse. Prozess: Notion "Funnel -> Webflow Funnel-System".

## Dateien

- `funnel.js`: Laufzeit-Logik (Schritte, Zaehler, Attribution, Events). Laedt im Seitenfuss der Stellen-Vorlage VOR Formly.
- `funnel.css`: Design (Version 6, Muster cf-jobs). Laedt im `<head>` der Stellen-Vorlage und der Absage-Seite. Alle Selektoren haengen an `data-gj`-Attributen, die Webflow-Klassen bleiben unberuehrt. Kundenfarbe kommt als `--gj` aus funnel.js.

Beide Dateien werden per jsDelivr auf einen Commit gepinnt (`@<commit-hash>`). Neue Version = committen, pushen, Hash im Webflow-Custom-Code eintragen, Seite veroeffentlichen.

## Paket an LeadTable (lead_json, seit Version 10, erweitert in Version 11)

Beim Absenden schreibt funnel.js das fertige Zielpaket als JSON-Text in das versteckte Feld `lead_json`. Darin stehen: die Antworten des Bewerbers (Schluessel = Frage-ID aus der Fragenbank, Mehrfachauswahl als "A; B"), Kontaktdaten `vorname`, `nachname`, `telefon` (+49-Format), `email`, `plz_ort`, `datenschutz` (true/false) sowie die Werbe- und Technikfelder fuer die Zuordnung in LeadTable (utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id, campaign_name, adset_name, ad_name, placement, site_source_name, gclid, ttclid, msclkid, fbclid, fbp, fbc, external_id, user_agent, event_source_url, landing_url, page_referrer, time_on_funnel; nur wenn gefuellt). NICHT dabei: `name` (doppelt zu vorname/nachname), `stelle`, `kunde`, `stellenbezeichnung`, `ort` (Einsatzort der Stelle), `pixel_id`, `ziel_webhook`. Diese bleiben nur im Webflow-Formular fuer Make und Tag Manager. Make-Szenario 7876191 sendet im HTTP-Modul `lead_json` unveraendert an den Ziel-Webhook der Stelle (Fallback auf das volle Formular nur, wenn lead_json fehlt).

## Version 14.2 (2026-10-18): Erfolgsseite wie bei Candidate Flow

- Wunsch Timur: Ueberschrift "Das hat geklappt! So geht's weiter" (ohne Gedankenstrich) und die drei naechsten Schritte woertlich wie auf cf-jobs.com: 1 "Du bekommst von uns eine Bestaetigung per E-Mail mit allen wichtigen Infos.", 2 "Wir melden uns direkt bei Dir fuer ein lockeres 10-minuetiges Kennenlerngespraech per Telefon.", 3 "Wenn wir beide ein gutes Gefuehl haben und zueinander passen, dann laden wir Dich gerne zu einem persoenlichen Gespraech ein." Die Texte stehen fest in der Webflow-Vorlage (Absaetze data-gj=step-item), kein Code.
- Der Satz aus dem CMS-Feld erfolgstext ("<Ansprechpartner> meldet sich innerhalb von 48 Stunden ...") bleibt wie bisher zwischen Ueberschrift und Schritten. Eine Unterschrift unter den Schritten nach cf-jobs-Muster (Commit b040281) hat Timur abgelehnt; sie ist wieder entfernt, die Vorlage bleibt auf Commit e6ed26e gepinnt.

## Version 14 und 14.1 (2026-10-18): Scrollen, Logo-Neustart, Feldpruefung

- Scrollen: Das Formular trug `data-scroll-top="true"`. Formly (multi-step.js) scrollte damit bei jedem Schritt 1 Sekunde lang per jQuery-Animation zum Formularanfang und setzte die Position in jedem Bild neu. Wer waehrenddessen nach unten wischte, wurde zurueckgezogen (Ruckeln, kein Scrollen moeglich). funnel.js entfernt das Attribut jetzt vor dem Start von Formly und scrollt selbst: nur wenn der Fragenkopf oberhalb des Bildschirms liegt, nativ und vom Bewerber jederzeit unterbrechbar (bei reduzierter Bewegung sofort). Sicherheitsnetz: laufende jQuery-Scrollanimationen stoppen bei Wischen, Mausrad oder Taste. Messung im Test (390 x 520): alte Version zieht die Seite 250 ms nach eigenem Runterscrollen auf 0 zurueck, neue Version bleibt unten.
- Logo (14.1): Klick auf das Kundenlogo oder den Firmennamen im Kopf startet den Funnel neu bei Frage 1 (Seite neu laden, Werbeparameter bleiben in der Adresse, keine Verlassen-Warnung). Der in 14.0 gebaute Rueckweg von der Absage-Seite zur Absage-Frage ist auf Wunsch von Timur wieder entfernt; Zurueck verhaelt sich wie in Version 13 (manche Browser zeigen dabei den alten Stand aus ihrem Zwischenspeicher).
- Feldpruefung vor dem Absenden: Telefon (deutsche Nummern: Handy nur 015/016/017, Festnetz ab 02 bis 09, 7 bis 12 Ziffern nach der 0; keine Service-Nummern 0900/0180/0137/0138/0118/0700/0800; auslaendische Nummern mit + und 9 bis 15 Ziffern) und E-Mail (Format mit Domain-Endung, bekannte Tippfehler wie gmail.con oder web.dee mit Vorschlag "Meintest du ...? Ja, korrigieren"; wer den Vorschlag ignoriert und erneut absendet, kommt durch). Meldungen rot unter dem Feld, kurz und ohne Beispiel (14.1: "Bitte gib eine korrekte Telefonnummer an." / "Bitte gib eine korrekte E-Mail-Adresse an."), verschwinden beim Tippen. Hinweis: Solange ein Pflichtfeld leer ist, graut Formly den Absenden-Knopf aus (Klasse disabled, nicht klickbar); die Pruefung greift deshalb, sobald alle Felder gefuellt sind.
- toE164: Eine Nummer mit + behaelt jetzt ihre Laendervorwahl (vorher wurde aus +48 600 123 456 faelschlich +4948600123456).

## Version 13 (2026-10-17): Antwort-Ereignisse und Zusatzfelder fuer Meta

- Jede geklickte Antwort loest zusaetzlich die dataLayer-Meldung `gj_answer` aus, mit `meta_event` = "Antwort: <frage-id> = <antwort>" (nur ASCII, hoechstens 50 Zeichen, wie Perspective "Answer Clicked: ...") und `meta_cd` mit frage, antwort, schritt und content_name. Der Tag Manager sendet sie als eigenes Meta-Ereignis (Browser und Server), damit in Meta eigene Conversions je Antwort moeglich sind.
- `gj_lead`, `gj_submit_application` und `quiz_ko` tragen `meta_cd` mit allen Antworten (Schluessel = Frage-ID) plus content_name, content_category "Bewerbung", time_on_funnel und erreichter Interesse-Stufe; der Server-Tag haengt das Objekt als custom_data an.
- 13.1 (gleicher Tag): `meta_event`, `meta_cd`, `quiz_step` und `answer` werden in JEDER dataLayer-Meldung ausdruecklich auf null gesetzt, wenn die Meldung sie nicht selbst traegt. Grund: Der Tag Manager merkt sich Werte im Datenmodell bis zur naechsten Meldung, die sie ueberschreibt; im ersten Test hiessen InitiateCheckout, Contact, Lead und SubmitApplication deshalb "Antwort: abwann = Ab sofort". Gepinnt ist Commit dda7891.
- 13.2 (gleicher Tag): `meta_cd_json` = die Zusatzfelder zusaetzlich als JSON-Text. Grund: Der Stape-Meta-Server-Tag faellt KOMPLETT aus (kein einziges Event mehr bei Meta), sobald man ihm das Objekt ueber "Custom Data Properties Object" (customDataObject) uebergibt. Der Server-Tag nutzt deshalb nur die Tabelle customDataList: Feld `antworten` = meta_cd_json, dazu Einzelfelder `meta_cd.<frage-id>` ueber Event-Data-Variablen (Standard-Frage-IDs; neue Frage-IDs brauchen eine neue Zeile im Server-Tag, der Volltext steht aber immer in `antworten`).
- 13.3 (gleicher Tag): `user_data` mit den Feldnamen, die der Server-Tag automatisch erkennt (`email`, `phone`, `first_name`, `last_name`, `postal_code`, `address[].city`, `country`, `external_id`, `fbc`, `fbp`). Die Kurzformen em/ph/fn/ln/zp/ct hatte er ignoriert, dem Server-Lead fehlten deshalb E-Mail, Telefon, Name und PLZ. Gepinnt ist Commit 2b29498.
- Testen: Der Meta-Pixel (fbevents.js) sendet in automatisierten Browsern (navigator.webdriver) keine Browser-Events, und per curl nachgespielte Data-Tag-Aufrufe erzeugen keine Meta-Events. Meta-Pruefungen daher immer mit einem echten Browser-Durchlauf und dem Test-Code aus Events Manager > Events testen (testId im Server-Tag, danach leeren). Stape uebernimmt neue Server-Versionen erst nach 10 bis 20 Minuten.
- `window.__gjLast` haelt die zuletzt gemeldete dataLayer-Meldung, damit der Browser-Pixel-Tag die Zusatzfelder uebernehmen kann.
- Tag Manager: Web-Variablen DLV - meta_event und JS - Meta Event Name final, Trigger CE - Meta Events um gj_answer erweitert, Tags HTML - Meta Pixel - Event und Data Tag nutzen den neuen Namen; Server: Variable ED - meta_cd, CAPI-Tag mit customDataObject.

## Verzweigung (seit Version 12)

Eine Antwort kann zu einer spaeteren Frage springen. Dafuer im CMS (Fragenbank) den Antworttext mit dem Sprungziel abschliessen:
`Vormittags, 10:00 bis 14:00 Uhr [>umfang_tag]`. Ziel ist die Frage-ID einer Frage, die in der Kampagne SPAETER kommt
(nur Vorwaerts-Spruenge). `[>kontakt]` springt direkt zum Schritt "Woher kommst Du?". Antworten ohne Kuerzel gehen zur naechsten Frage.
Das Kuerzel wird vor der Anzeige entfernt und nie gesendet. Ungueltige Ziele werden ignoriert (Warnung in der Browser-Konsole).

Regeln fuer den Bau:
- Reihenfolge der Fragen in der Kampagne so waehlen, dass jeder Sprung nach vorne geht.
- Jede Frage-ID innerhalb einer Kampagne nur einmal verwenden.
- Mehrfachauswahl-Fragen tragen kein Sprungziel, nach ihnen kommt immer die naechste Frage.
- KO-Antworten fuehren wie bisher zur Absage-Seite.

Technik: Nur wenn mindestens eine Antwort ein Kuerzel traegt, schaltet funnel.js Formly in den Logikmodus (`data-logic-extra`),
legt um jeden Schritt eine Karte `data-answer=<Schluessel>` mit `data-go-to=<naechster Schluessel>`, setzt an springende Antworten
`data-go-to` und `data-skip-to` (Schrittnummer, 1-basiert) und entfernt `data-form="next-btn"` von den Radio-Knoepfen (Weiterschalten
ueber `data-radio-skip`). Weil Formly im Logikmodus die Browser-Pflichtpruefung abschaltet, prueft funnel.js selbst: Mehrfachauswahl
mindestens ein Haken, Pflichtfelder der Kontaktschritte, Datenschutz-Haken. Zaehler zeigt "Frage k" (Gesamtzahl haengt vom Pfad ab).
Beim Absenden werden Antworten aus nicht besuchten Schritten geleert. Kampagnen ohne Kuerzel laufen exakt wie in Version 11
(Vergleichstest Mr. Service und GlanzJobs-Test: gleicher Pfad, gleiches lead_json).
