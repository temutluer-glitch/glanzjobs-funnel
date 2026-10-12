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
