/* erfassung.js – Funnel-Erfassung (PROJ-30), Version 1.0.1 (2026-10-23)
   1.0.1: KA-Nummer auch aus #gj-ka (Feld-Bindung im Footer der Vorlage); Schritte zählen erst, wenn sie wirklich
          auf dem Bildschirm sind (Großer Funnel: Einstiegsseiten verdecken die Fragen, ohne sie selbst auszublenden).
   Beobachtet die von funnel.js vorbereitete Bewerbungsseite und meldet jeden Klickweg sofort an die eigene
   Annahmestelle https://erfassung.glanzjobs.de (von dort weiter an Tinybird, Frankfurt):
   Besuch, Definition der Fragen (mit Prüfsumme), Schritt sichtbar, Antwort (beim Weitergehen), Herkunft
   („Woher kommst Du?“), Direkte Absage, Bewerbung, aktive Zeit je Schritt.
   Grenzen (verbindlich, spec.md AC-14 bis AC-18):
   - liest nur; schreibt keine Cookies, keinen lokalen oder Sitzungs-Speicher, nichts in den dataLayer,
     keine Formularfelder; ruft keine Funktion von funnel.js auf. Meta-Weg und Bewerbung bleiben unberührt.
   - sendet keine Namen, Telefon, E-Mail, Freitexte (nur „beantwortet“) und keine Browserkennung.
   - Sitzungs-Kennung lebt nur im Arbeitsspeicher, neu bei jedem Seitenaufruf.
   - Senden wartet nie auf eine Antwort; scheitert es, ist die Sendung verloren. Fehler bleiben folgenlos.
   Laden: im Footer der Vorlage NACH funnel.js und Formly, mit defer. */
(function () {
  "use strict";
  try {
    var VERSION = "1.0.1";
    var LIVE = "bewerbung.glanzjobs.de", TESTADRESSE = "timurs-cool-site-da5d3f.webflow.io";
    var host = location.hostname, lokal = host === "127.0.0.1" || host === "localhost";
    if (host !== LIVE && host !== TESTADRESSE && !lokal) return;
    /* Lokal (Probe gegen eine gespeicherte Stellenseite) geht alles an den Probe-Server derselben Herkunft. */
    var ZIEL = lokal ? location.origin + "/v1/ereignisse" : "https://erfassung.glanzjobs.de/v1/ereignisse";

    /* ---------- Kopfdaten, beim Laden festgehalten (EC-7, EC-8) ---------- */
    var cfgEl = document.getElementById("gj-config");
    function cfg(name) { var e = cfgEl && cfgEl.querySelector('[data-k="' + name + '"]'); return e ? (e.textContent || "").trim() : ""; }
    var kaEl = document.getElementById("gj-ka");   /* Feld-Bindung im Footer der Vorlage */
    var KA = (cfg("ka") || (kaEl ? (kaEl.textContent || "").trim() : "")).slice(0, 20);
    var SLUG = (cfg("slug") || location.pathname.split("/").pop() || "").toLowerCase();
    function param(n) { try { return new URLSearchParams(location.search).get(n) || ""; } catch (e) { return ""; } }
    function gemerkt(n) { try { return sessionStorage.getItem("gj_p_" + n) || ""; } catch (e) { return ""; } }   /* nur lesen: setzt funnel.js */
    var UTM = {};
    ["source", "medium", "campaign", "content"].forEach(function (k) { UTM[k] = (param("utm_" + k) || gemerkt("utm_" + k)).slice(0, 250); });
    var TEST = param("gj_test") === "1" || UTM.source === "e2etest" || host === TESTADRESSE || lokal;
    function neueSitzung() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = crypto.getRandomValues(new Uint8Array(1))[0] & 15; return (c === "x" ? r : (r & 3 | 8)).toString(16);
      });
    }
    var SITZUNG = neueSitzung();
    function geraet() {
      var ua = navigator.userAgent || "", touch = (navigator.maxTouchPoints || 0) > 1;
      if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/i.test(ua) && touch)) return "tablet";
      if ((navigator.userAgentData && navigator.userAgentData.mobile) || /Mobi|iPhone|iPod|Windows Phone|BlackBerry/i.test(ua)) return "handy";
      if (/Windows NT|Macintosh|X11|CrOS|Linux/i.test(ua)) return "computer";
      return "unbekannt";
    }
    var GERAET = geraet();

    /* ---------- Schritte und Definition (AC-5, AC-6) ---------- */
    var schritte = Array.prototype.slice.call(document.querySelectorAll('[data-form="step"]'));
    if (!schritte.length) return;
    function schrittId(i) {
      var s = schritte[i]; if (!s) return "";
      var q = s.getAttribute("data-question-id"); if (q) return q;
      var gj = s.getAttribute("data-gj");
      if (gj === "ort-step") return "_ort";
      if (gj === "contact") return "_name";
      if (gj === "contact2") return "_kontakt";
      return "_schritt_" + (i + 1);
    }
    function text(el) { return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : ""; }
    var fragen = [];
    schritte.forEach(function (s, i) {
      if (!s.hasAttribute("data-question-id")) return;
      var art = s.querySelector("textarea") ? "freitext" : (s.querySelector("input[data-gj-multi]") ? "mehrfach" : "einfach");
      var antworten = [];
      Array.prototype.forEach.call(s.querySelectorAll('input[type="radio"], input[data-gj-multi]'), function (inp) {
        var lab = inp.closest("label");
        antworten.push({ text: (inp.value || "").trim(), absage: false, sprung: (lab && lab.getAttribute("data-go-to")) || "" });
      });
      Array.prototype.forEach.call(s.querySelectorAll('a[href*="/absage"]'), function (a) {
        antworten.push({ text: text(a.querySelector('[data-gj="ko-text"]') || a), absage: true, sprung: "" });
      });
      fragen.push({ id: schrittId(i), pos: i + 1, text: text(s.querySelector('[data-gj="q"]')), art: art, antworten: antworten });
    });
    var DEFINITION = JSON.stringify({ v: 1, fragen: fragen, feste: ["_ort", "_name", "_kontakt"] });
    function pruefsumme(str) {   /* zwei 32-Bit-FNV-1a-Läufe mit verschiedenen Startwerten = 16 Hex-Zeichen */
      var a = 0x811c9dc5, b = 0x5bd1e995;
      for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); a = Math.imul(a ^ c, 16777619); b = Math.imul(b ^ c, 2246822519); }
      return ("0000000" + (a >>> 0).toString(16)).slice(-8) + ("0000000" + (b >>> 0).toString(16)).slice(-8);
    }
    var DEF = pruefsumme(DEFINITION);

    /* ---------- Senden: sofort, gebündelt je Augenblick (AC-29) ---------- */
    var nr = 0, warteschlange = [], uhr = null;
    function melde(art, felder) {
      var e = { nr: nr++, art: art, t: Date.now() };
      if (felder) Object.keys(felder).forEach(function (k) { e[k] = felder[k]; });
      warteschlange.push(e);
      if (!uhr) uhr = setTimeout(function () { senden(false); }, 250);
    }
    function senden(beimVerlassen) {
      if (uhr) { clearTimeout(uhr); uhr = null; }
      while (warteschlange.length) {
        var teil = warteschlange.splice(0, 50);
        var body = JSON.stringify({ v: 1, ka: KA, slug: SLUG, sitzung: SITZUNG, def: DEF, geraet: GERAET, test: TEST,
                                    utm: UTM, ev: VERSION, gesendet: Date.now(), e: teil });
        try {
          if (beimVerlassen && navigator.sendBeacon && navigator.sendBeacon(ZIEL, new Blob([body], { type: "text/plain" }))) continue;
          fetch(ZIEL, { method: "POST", body: body, mode: "no-cors", credentials: "omit", keepalive: true,
                        headers: { "Content-Type": "text/plain" } }).catch(function () {});
        } catch (x) { /* verworfen (AC-18) */ }
      }
    }

    /* ---------- Aktive Zeit je Schritt (AC-13): zählt nur, solange die Seite sichtbar ist ---------- */
    var aktuell = -1, sekunden = {}, seit = null, fertig = false;
    function zeitStoppen() { if (seit !== null && aktuell >= 0) sekunden[aktuell] = (sekunden[aktuell] || 0) + (performance.now() - seit) / 1000; seit = null; }
    function zeitStarten() { if (document.visibilityState === "visible" && seit === null) seit = performance.now(); }
    function meldeZeit(i) {
      if (i < 0) return;
      zeitStoppen();
      melde("zeit", { schritt: schrittId(i), pos: i + 1, sekunden: Math.round((sekunden[i] || 0) * 10) / 10 });
    }

    /* ---------- Antwortstand eines verlassenen Schritts (AC-8, AC-9, EC-4) ---------- */
    function meldeAntwort(i) {
      var s = schritte[i], id = schrittId(i);
      if (s.hasAttribute("data-question-id")) {
        var ta = s.querySelector("textarea");
        if (ta) { if ((ta.value || "").trim()) melde("antwort", { schritt: id, pos: i + 1, freitext: true }); return; }
        var gewaehlt = Array.prototype.map.call(s.querySelectorAll('input[type="radio"]:checked, input[data-gj-multi]:checked'),
          function (x) { return (x.value || "").trim(); }).filter(Boolean);
        if (gewaehlt.length) melde("antwort", { schritt: id, pos: i + 1, antworten: gewaehlt });
      } else if (id === "_ort") {
        var f = document.getElementById("f-plz-ort"), v = f && f.value ? String(f.value).trim().slice(0, 100) : "";
        if (v) melde("antwort", { schritt: id, pos: i + 1, herkunft: v });
      }
    }

    /* ---------- Schrittwechsel (AC-7): erster sichtbarer Schritt wie in funnel.js ---------- */
    /* Erster Schritt, der wirklich auf dem Bildschirm ist: selbst nicht ausgeblendet UND kein Vorfahr ausgeblendet
       (beim Großen Funnel verdecken die Einstiegsseiten die Fragenkarte, die Schritte selbst bleiben "block"). */
    function sichtbar() {
      for (var i = 0; i < schritte.length; i++) if (getComputedStyle(schritte[i]).display !== "none" && schritte[i].getClientRects().length > 0) return i;
      return -1;
    }
    function wechsel() {
      try {
        if (fertig) return;
        var i = sichtbar(); if (i < 0 || i === aktuell) return;
        var alt = aktuell;
        if (alt >= 0) { meldeZeit(alt); if (i > alt) meldeAntwort(alt); }   /* rückwärts: nichts melden (EC-4) */
        aktuell = i; zeitStarten();
        melde("schritt", { schritt: schrittId(i), pos: i + 1 });
      } catch (x) {}
    }

    /* ---------- Start (AC-4, AC-5) ---------- */
    melde("besuch");
    melde("definition", { definition: DEFINITION });
    wechsel();   /* erster sichtbarer Schritt; beim Großen Funnel erst, wenn die Fragen erscheinen */
    var beobachter = new MutationObserver(wechsel);
    schritte.forEach(function (s) { beobachter.observe(s, { attributes: true, attributeFilter: ["style", "class"] }); });
    var seite = document.querySelector('[data-gj="page"]');
    if (seite) beobachter.observe(seite, { attributes: true });   /* Großer Funnel: Wechsel Einstiegsseiten -> Fragen */

    /* ---------- Direkte Absage (AC-11): vor dem Seitenwechsel raus ---------- */
    document.addEventListener("click", function (ev) {
      try {
        var a = ev.target && ev.target.closest && ev.target.closest('a[href*="/absage"]'); if (!a || fertig) return;
        var i = schritte.indexOf(a.closest('[data-form="step"]')); if (i < 0) return;
        var knopf = text(a.querySelector('[data-gj="ko-text"]') || a);
        meldeZeit(i);
        melde("absage", { schritt: schrittId(i), pos: i + 1, antworten: knopf ? [knopf] : [] });
        fertig = true; senden(true);
      } catch (x) {}
    }, true);

    /* ---------- Bewerbung (AC-12): Erfolgsmeldung sichtbar ---------- */
    var erfolg = document.getElementById("bewerbung-erfolgreich");
    function pruefeErfolg() {
      try {
        if (fertig || !erfolg || getComputedStyle(erfolg).display === "none") return;
        meldeZeit(aktuell);
        melde("bewerbung");
        fertig = true; senden(true);
      } catch (x) {}
    }
    if (erfolg) new MutationObserver(pruefeErfolg).observe(erfolg, { attributes: true, attributeFilter: ["style", "class"] });

    /* ---------- Verbergen und Verlassen (EC-2): Zeitstand und Rest sofort senden ---------- */
    document.addEventListener("visibilitychange", function () {
      try {
        if (document.visibilityState === "hidden") { if (!fertig) meldeZeit(aktuell); senden(true); }
        else zeitStarten();
      } catch (x) {}
    });
    window.addEventListener("pagehide", function () { try { senden(true); } catch (x) {} });
  } catch (fehler) { /* Erfassung darf den Funnel nie stören (AC-18) */ }
})();
