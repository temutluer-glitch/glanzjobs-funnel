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
