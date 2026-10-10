# GlanzJobs Bewerbungsfunnel (Webflow-Laufzeitcode)

`funnel.js` ist der Laufzeit-Code der Webflow-Vorlage "Stellen Template" (Seite bewerbung.glanzjobs.de/job/...).
Er wird ueber jsDelivr mit festem Commit eingebunden, z. B.
`https://cdn.jsdelivr.net/gh/temutluer-glitch/glanzjobs-funnel@<commit>/funnel.js`.
Aufgaben: Fragen-Schritte aus der Collection-Liste vorbereiten (Radio-Namen und -Werte, KO-Knopf, Mehrfachauswahl),
Zaehler und Fortschrittsbalken, Attribution (fbc/fbp, UTM, Anzeigen-Namen) in versteckte Felder, Quiz- und Zeit-Events
fuer den Google Tag Manager, Verlassen-Warnung. Enthaelt keine Geheimnisse. Prozess: Notion "Funnel -> Webflow Funnel-System".
