/* GlanzJobs Bewerbungsfunnel: Laufzeit-Logik der Webflow-Vorlage "Stellen Template".
   Laedt VOR Formly (multi-step.js). Liest alles aus dem versteckten #gj-config (CMS-gebunden).
   Keine IP-Abfrage im Browser (Datenschutz). Praefix gj_.
   Version 10: verstecktes Feld lead_json = Zielpaket fuer den LeadTable-Webhook (generischer Typ) mit NUR den Antworten des Bewerbers
   (Schluessel = Frage-ID) plus Kontaktdaten (vorname, nachname, telefon, email, plz_ort, datenschutz). Keine Stellen-, Technik- oder
   Werbefelder; die bleiben nur im Webflow-Formular fuer Make und Tag Manager. Make reicht lead_json unveraendert an den Ziel-Webhook weiter.
   Version 7 (Struktur nach Perspective-Vorlage): Platzhalter [Stelle]/[Beruf]/[Ort] in Fragen und Antworten, Freitext-Fragen (CMS-Feld Freitext-Platzhalter) als Textfeld mit Weiter-Knopf, fester Schritt 'Woher kommst Du?' (plz_ort), Kurzzeile unter Frage 1 mit Ort, Zeitmodell und Start.
   Version 6 (Design cf-jobs-Muster): kein Intro mehr, Frage 1 ist der erste Schritt; Kontaktdaten in zwei Schritten
   (Name, dann Telefon/E-Mail); ein sichtbares Namensfeld, das in die versteckten Felder vorname/nachname gespalten wird;
   Telefonnummer wird beim Absenden auf +49-Format gebracht (Haken am Klick/Enter, weil Formly per jQuery absendet); Fusszeile mit Impressum/Datenschutz/InnoSolv; Design in funnel.css.
   Version 5: event_id auf jeder dataLayer-Meldung, gj_contact_view/gj_lead/gj_submit_application mit user_data, Pixel nur via Tag Manager. */
(function () {
  "use strict";
  var cfgEl = document.getElementById("gj-config");
  function k(name) { var e = cfgEl && cfgEl.querySelector('[data-k="' + name + '"]'); return e ? (e.textContent || "").trim() : ""; }
  function img(name) { var i = cfgEl && cfgEl.querySelector('[data-ff="' + name + '"]'); var s = i && i.getAttribute("src"); return s && !/placeholder/i.test(s) ? s : ""; }
  var C = { firma: k("firma"), slug: k("slug") || location.pathname.split("/").pop(), stelle: k("stelle"), ort: k("ort"),
            farbe: k("farbe"), ap: k("ap"), ziel: k("webhook"), pixel: k("pixel").replace(/\D/g, ""), ds: k("ds"), imp: k("imp"),
            benefits: k("benefits"), zeitmodell: k("zeitmodell"), start: k("start"), logo: img("logo"), hero: img("hero"), apbild: img("apbild") };
  window.__gjConfig = C;
  var page = document.querySelector('[data-gj="page"]');
  function q(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { return /^https?:\/\//i.test(u) ? u : ""; }
  /* Platzhalter in Fragen und Antworten: [Stelle] = Stellenbezeichnung, [Beruf] = ohne (m/w/d), [Ort] = Einsatzort. */
  var beruf = C.stelle.replace(/\s*\((m\/w\/d|w\/m\/d|m\/w\/x|d\/m\/w|m\/f\/d)\)/i, "").trim();
  function fill(t) { return String(t || "").replace(/\[Stelle\]/g, C.stelle).replace(/\[Beruf\]/g, beruf).replace(/\[Ort\]/g, C.ort); }
  function fillEl(el) { if (el && el.textContent && /\[(Stelle|Beruf|Ort)\]/.test(el.textContent)) el.textContent = fill(el.textContent); }

  /* ---------- Kundenfarbe (alles Weitere steht in funnel.css) ---------- */
  var color = /^#?[0-9a-f]{6}$/i.test(C.farbe) ? (C.farbe[0] === "#" ? C.farbe : "#" + C.farbe) : "#335e7b";
  document.documentElement.style.setProperty("--gj", color);

  /* ---------- Kopf: ohne Kundenlogo steht der Firmenname als Text ---------- */
  var logoEl = q('[data-gj="logo"]');
  if (logoEl && !C.logo) {
    logoEl.style.display = "none";
    var lt = document.createElement("span"); lt.setAttribute("data-gj", "logo-text"); lt.textContent = C.firma || "GlanzJobs"; logoEl.after(lt);
  }

  /* ---------- Fusszeile: Copyright, Impressum, Datenschutz ---------- */
  var legal = q('[data-gj="legal"]');
  if (legal) {
    var html = "© " + new Date().getFullYear() + " " + esc(C.firma || "GlanzJobs");
    var links = "";
    if (safeUrl(C.imp)) links += '<a href="' + esc(C.imp) + '" target="_blank" rel="noopener">Impressum</a>';
    if (safeUrl(C.ds)) links += '<a href="' + esc(C.ds) + '" target="_blank" rel="noopener">Datenschutz</a>';
    legal.innerHTML = html + (links ? "<br>" + links : "");
  }
  var dsLabel = q('[data-gj="f-datenschutz"] .w-form-label');
  if (dsLabel) dsLabel.innerHTML = (safeUrl(C.ds) ? '<a href="' + esc(C.ds) + '" target="_blank" rel="noopener">Datenschutzbestimmungen</a>' : "Datenschutzbestimmungen") + " gelesen und akzeptiert";

  /* ---------- Kontaktfelder: Platzhalter, Namensfeld spalten, Pflicht nur auf dem sichtbaren Feld ---------- */
  function setAttrs(el, attrs) { if (el) Object.keys(attrs).forEach(function (a) { el.setAttribute(a, attrs[a]); }); }
  var fName = q('[data-gj="f-name"]'), fVor = document.getElementById("f-vorname"), fNach = document.getElementById("f-nachname");
  setAttrs(fName, { id: "f-name", name: "name", "data-name": "name", placeholder: "Vor- und Nachname", autocomplete: "name", required: "required", minlength: "3" });
  setAttrs(document.getElementById("f-telefon"), { placeholder: "Telefonnummer", autocomplete: "tel-national", inputmode: "tel" });
  setAttrs(document.getElementById("f-email"), { placeholder: "E-Mail", autocomplete: "email", inputmode: "email" });
  setAttrs(document.getElementById("f-plz-ort"), { placeholder: "Dein Stadtteil/Ort", autocomplete: "address-level2" });
  [fVor, fNach].forEach(function (el) { if (el) { el.removeAttribute("required"); el.setAttribute("tabindex", "-1"); el.setAttribute("aria-hidden", "true"); } });
  function splitName() {
    if (!fName) return;
    var parts = fName.value.trim().replace(/\s+/g, " ").split(" ");
    var last = parts.length > 1 ? parts.pop() : "";
    if (fVor) fVor.value = parts.join(" ");
    if (fNach) fNach.value = last;
  }
  if (fName) { fName.addEventListener("input", splitName); fName.addEventListener("change", splitName); }
  function toE164(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (!d) return raw;
    if (d.indexOf("00") === 0) d = d.slice(2);
    else if (d.indexOf("0") === 0) d = "49" + d.slice(1);
    else if (d.indexOf("49") !== 0 || d.length < 10) d = "49" + d;
    return "+" + d;
  }

  /* ---------- Fragen-Schritte aus der Collection-Liste vorbereiten (vor Formly) ---------- */
  var steps = document.querySelectorAll('[data-gj="steps"] [data-gj="step"]');
  var usedIds = {}, seenAnswer = false;
  steps.forEach(function (step, si) {
    var qidEl = step.querySelector('[data-gj="qid"]'), typEl = step.querySelector('[data-gj="typ"]');
    var qid = (qidEl && qidEl.textContent.trim().replace(/[^a-z0-9_-]/gi, "_").toLowerCase()) || ("frage_" + (si + 1));
    if (usedIds[qid]) qid = qid + "_" + (si + 1); usedIds[qid] = true;
    var multi = /mehrfach/i.test(typEl ? typEl.textContent : "");
    step.setAttribute("data-question-id", qid);
    var qEl = step.querySelector('[data-gj="q"]'); fillEl(qEl);
    var hint = step.querySelector('[data-gj="hint"]'); fillEl(hint); if (hint && !hint.textContent.trim()) { hint.remove(); hint = null; }
    var answers = step.querySelector('[data-gj="answers"]');
    var phEl = step.querySelector('[data-gj="platzhalter"]'), placeholder = phEl ? fill(phEl.textContent.trim()) : "";
    if (placeholder) {
      /* Freitext-Frage: Antworten und KO-Knopf weg, Textfeld plus Weiter-Knopf rein. */
      if (answers) { answers.remove(); answers = null; }
      var koOld = step.querySelector('[data-gj="ko"]'); if (koOld) koOld.remove();
      var wrap = document.createElement("div"); wrap.className = "fn-field gj-textarea-wrap";
      var ta = document.createElement("textarea"); ta.className = "fn-input gj-textarea"; ta.name = qid; ta.setAttribute("data-name", qid); ta.id = qid + "_text";
      ta.required = true; ta.rows = 4; ta.placeholder = placeholder; ta.setAttribute("minlength", "10"); wrap.appendChild(ta); step.appendChild(wrap);
      var go = document.createElement("a"); go.href = "#"; go.className = "fn-btn fn-btn-primary"; go.setAttribute("data-form", "next-btn"); go.setAttribute("data-gj", "next"); go.textContent = "Weiter"; step.appendChild(go);
      ta.addEventListener("input", function once() { ta.removeEventListener("input", once); dl({ event: "quiz_answer", quiz_step: qid, answer: "(Freitext)", first_answer: !seenAnswer }); seenAnswer = true; });
      multi = false;
    }
    var wrappers = step.querySelectorAll('[data-gj^="a"].w-radio, [data-gj^="a"].w-checkbox');
    var n = 0;
    wrappers.forEach(function (w) {
      var input = w.querySelector("input"), label = w.querySelector(".w-form-label");
      fillEl(label);
      var text = label ? label.textContent.trim() : "";
      if (!text) { w.remove(); return; }
      n++;
      input.name = qid; input.value = text; input.id = qid + "_" + n;
      input.setAttribute("data-name", qid);
      if (label) label.setAttribute("for", input.id);
      if (multi) { input.type = "checkbox"; input.removeAttribute("data-form"); input.removeAttribute("name"); input.removeAttribute("data-name"); input.setAttribute("data-gj-multi", qid); w.classList.remove("w-radio"); w.classList.add("w-checkbox"); input.classList.remove("w-radio-input"); input.classList.add("w-checkbox-input"); }
    });
    if (multi) {
      /* Webflow sendet Kaestchen nur als true/false. Deshalb: Kaestchen ohne Namen, gewaehlte Texte in ein verstecktes Feld <qid> schreiben. */
      var joined = document.createElement("input"); joined.type = "hidden"; joined.name = qid; joined.setAttribute("data-name", qid); joined.value = ""; step.appendChild(joined);
      step.addEventListener("change", function () {
        joined.value = Array.prototype.map.call(step.querySelectorAll('input[data-gj-multi="' + qid + '"]:checked'), function (i) { return i.value; }).join("; ");
      });
    }
    var ko = step.querySelector('[data-gj="ko"]');
    if (ko) { var kt = ko.querySelector('[data-gj="ko-text"]'); fillEl(kt); if (!kt || !kt.textContent.trim()) ko.remove(); else ko.setAttribute("data-answer-id", "ko"); }
    if (multi && answers) {
      answers.removeAttribute("data-radio-skip");
      var next = document.createElement("a"); next.href = "#"; next.className = "fn-btn fn-btn-primary"; next.setAttribute("data-form", "next-btn"); next.setAttribute("data-gj", "next");
      next.textContent = "Weiter"; answers.after(next);
    }
    if (si === 0) {
      /* Erste Frage: Kurzzeile nach Perspective-Muster, Ort, Zeitmodell und Startzeitpunkt. */
      var items = [];
      if (C.ort) items.push("\uD83D\uDCCD " + C.ort);
      if (C.zeitmodell || C.start) items.push("\uD83D\uDD56 " + [C.zeitmodell, C.start].filter(Boolean).join(" \u2192 "));
      if (qEl && items.length) { var meta = document.createElement("div"); meta.setAttribute("data-gj", "meta"); meta.innerHTML = items.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join(""); (hint && hint.parentNode ? hint : qEl).after(meta); }
    }
  });

  /* ---------- Zaehler und Fortschrittslinie (eigene Logik, Formly-Zaehler deaktiviert) ---------- */
  var counterEl = q('[data-gj="counter"]'), fill = q('[data-gj="bar-fill"]');
  document.querySelectorAll("[data-text]").forEach(function (el) { el.removeAttribute("data-text"); });
  var allSteps = Array.prototype.slice.call(document.querySelectorAll('[data-form="step"]'));
  var total = Math.max(1, allSteps.length - 2);     /* Fragen = alle Schritte ohne die zwei Kontaktschritte */
  var contactSeen = false, done = false;
  function paint() {
    if (done) return;
    var idx = -1;
    allSteps.forEach(function (s, i) { if (idx < 0 && getComputedStyle(s).display !== "none") idx = i; });
    if (idx < 0) idx = 0;
    var onContact = idx >= total;
    if (onContact && !contactSeen) { contactSeen = true; dl({ event: "gj_contact_view" }); }
    if (counterEl) counterEl.textContent = idx < total ? ("Frage " + (idx + 1) + " von " + total) : (idx === total ? "Fast geschafft" : "Letzter Schritt");
    if (fill) fill.style.width = Math.max(6, Math.round(((idx + 1) / (total + 2)) * 100)) + "%";
  }
  var mo = new MutationObserver(paint);
  allSteps.forEach(function (s) { mo.observe(s, { attributes: true, attributeFilter: ["style", "class"] }); });
  window.addEventListener("load", paint); paint();

  /* ---------- Attribution: fbc/fbp, UTM, Anzeigen-Namen, Nutzer-ID, Stellen-Zuordnung ---------- */
  var DAYS = 90;
  function getParam(n) { try { return new URLSearchParams(location.search).get(n); } catch (e) { return null; } }
  function setCookie(n, v, d) { try { var t = new Date(); t.setTime(t.getTime() + d * 864e5); document.cookie = n + "=" + encodeURIComponent(v) + "; path=/; expires=" + t.toUTCString() + "; SameSite=Lax; Secure"; } catch (e) {} }
  function getCookie(n) { var hit = document.cookie.split(";").map(function (s) { return s.trim(); }).filter(function (c) { return c.indexOf(n + "=") === 0; })[0]; return hit ? decodeURIComponent(hit.split("=").slice(1).join("=")) : null; }
  function ls(a, v) { try { if (v === undefined) return localStorage.getItem(a); localStorage.setItem(a, v); return v; } catch (e) { return null; } }
  function ss(a, v) { try { if (v === undefined) return sessionStorage.getItem(a); sessionStorage.setItem(a, v); return v; } catch (e) { return null; } }
  function uuid() { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = crypto.getRandomValues(new Uint8Array(1))[0] & 15, v = c === "x" ? r : (r & 3 | 8); return v.toString(16); }); }
  function metaId(s) { var m = String(s || "").match(/fb\.1\.(\d{10,})\.([A-Za-z0-9_-]+)/); return m ? "fb.1." + m[1] + "." + m[2].slice(0, 4096) : null; }
  var fbp = metaId(getCookie("_fbp")) || ("fb.1." + Date.now() + "." + Math.floor(1e9 + Math.random() * 9e9)); setCookie("_fbp", fbp, DAYS);
  var fbclidRaw = getParam("fbclid"), fbclid = (fbclidRaw || "").replace(/[^A-Za-z0-9_-]/g, "");
  if (fbclid) ls("gj_fbclid", fbclid); else fbclid = ls("gj_fbclid") || "";
  var fbc = fbclidRaw ? ("fb.1." + Date.now() + "." + fbclid) : metaId(getCookie("_fbc")); if (fbc) setCookie("_fbc", fbc, DAYS);
  var eid = getCookie("_gj_uid") || ls("gj_uid") || uuid(); setCookie("_gj_uid", eid, 365); ls("gj_uid", eid);
  var V = { fbp: fbp, fbc: fbc || "", fbclid: fbclid, external_id: eid, user_agent: (navigator.userAgent || "").slice(0, 300),
            event_source_url: location.origin + location.pathname, landing_url: (ss("gj_landing") || ss("gj_landing", location.href) || "").slice(0, 250),
            page_referrer: (document.referrer || "").slice(0, 250), stelle: C.slug, kunde: C.firma, stellenbezeichnung: C.stelle, ort: C.ort,
            pixel_id: C.pixel, ziel_webhook: C.ziel };
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id", "campaign_name", "adset_name", "ad_name", "placement", "site_source_name", "gclid", "ttclid", "msclkid"]
    .forEach(function (key) { var v = getParam(key); if (v) ss("gj_p_" + key, v); var w = v || ss("gj_p_" + key); if (w) V[key] = String(w).slice(0, 250); });
  var start = ss("gj_start") || ss("gj_start", String(Date.now()));
  function setField(name, value) {
    if (value == null || value === "") return;
    document.querySelectorAll("form").forEach(function (form) {
      var el = form.querySelector('input[name="' + name + '"]');
      if (!el) { el = document.createElement("input"); el.type = "hidden"; el.name = name; el.setAttribute("data-name", name); form.appendChild(el); }
      el.value = value; el.setAttribute("value", value);
    });
  }
  function writeAll() { Object.keys(V).forEach(function (key) { setField(key, V[key]); }); }
  writeAll(); var end = Date.now() + 5000; var iv = setInterval(function () { writeAll(); if (Date.now() > end) clearInterval(iv); }, 300);
  /* Formly loest das Absenden ueber jQuery aus, dabei feuert kein natives submit-Ereignis. Deshalb zusaetzlich am Klick auf den
     Absenden-Knopf und an der Eingabetaste im letzten Schritt ansetzen. */
  /* Zielpaket fuer den LeadTable-Webhook: NUR Antworten (Schluessel = Frage-ID, Mehrfachauswahl als "A; B") plus Kontaktdaten. */
  function answers() {
    var out = {}, form = document.getElementById("bewerbung-form"); if (!form) return out;
    Array.prototype.forEach.call(document.querySelectorAll('[data-gj="step"][data-question-id]'), function (s) {
      var id = s.getAttribute("data-question-id"); if (!id) return;
      Array.prototype.forEach.call(form.querySelectorAll('[name="' + id + '"]'), function (el) {
        if (el.type === "radio" || el.type === "checkbox") { if (el.checked) out[id] = el.value; }
        else if (el.value && String(el.value).trim()) out[id] = String(el.value).trim();
      });
    });
    return out;
  }
  function buildLead() {
    var out = { vorname: ((fVor && fVor.value) || "").trim(), nachname: ((fNach && fNach.value) || "").trim(),
                telefon: val("f-telefon"), email: val("f-email"), plz_ort: val("f-plz-ort") };
    var a = answers(); Object.keys(a).forEach(function (key) { out[key] = a[key]; });
    var ds = document.getElementById("f-datenschutz"); if (ds) out.datenschutz = ds.checked ? "true" : "false";
    return out;
  }
  function prepareSubmit() {
    splitName();
    var tel = document.getElementById("f-telefon"); if (tel && tel.value.trim()) tel.value = toE164(tel.value);
    setField("time_on_funnel", String(Math.round((Date.now() - Number(start)) / 1000))); writeAll();
    try { setField("lead_json", JSON.stringify(buildLead())); } catch (e) {}
  }
  document.addEventListener("submit", prepareSubmit, true);
  document.addEventListener("click", function (e) { if (e.target && e.target.closest && e.target.closest('[data-form="submit-btn"], [type="submit"]')) prepareSubmit(); }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.closest && e.target.closest('[data-gj="contact2"]')) prepareSubmit(); }, true);
  function dl(obj) { window.dataLayer = window.dataLayer || []; obj.event_id = uuid(); window.__gjLastEventId = obj.event_id; window.dataLayer.push(obj); return obj.event_id; }
  dl(Object.assign({ event: "gj_attribution_ready" }, V));

  /* ---------- Erfolgsmeldung: Darstellung umschalten, Lead-Events (Lead + SubmitApplication, mit user_data fuer den Abgleich) ---------- */
  function val(id) { var el = document.getElementById(id); return el && el.value ? String(el.value).trim() : ""; }
  function normPhone(p) { return toE164(p).replace(/\D/g, ""); }
  var okEl = document.getElementById("bewerbung-erfolgreich"), leadSent = false;
  function checkLead() {
    if (leadSent || !okEl || getComputedStyle(okEl).display === "none") return; leadSent = true;
    done = true; if (page) page.setAttribute("data-gj-state", "done"); if (fill) fill.style.width = "100%";
    var plzOrt = val("f-plz-ort"), zip = (plzOrt.match(/\b\d{5}\b/) || [""])[0], city = plzOrt.replace(/\b\d{5}\b/, "").replace(/[,\s]+/g, " ").trim();
    var ud = { em: val("f-email").toLowerCase(), ph: normPhone(val("f-telefon")), fn: val("f-vorname"), ln: val("f-nachname"), zp: zip, ct: city, country: "de",
               external_id: eid, fbc: fbc || "", fbp: fbp };
    Object.keys(ud).forEach(function (key) { if (!ud[key]) delete ud[key]; });
    var tof = Math.round((Date.now() - Number(start)) / 1000);
    dl({ event: "gj_lead", user_data: ud, stelle: C.slug, kunde: C.firma, time_on_funnel: tof });
    dl({ event: "gj_submit_application", user_data: ud, stelle: C.slug, kunde: C.firma, time_on_funnel: tof });
  }
  if (okEl) { new MutationObserver(checkLead).observe(okEl, { attributes: true, attributeFilter: ["style", "class"] }); setTimeout(checkLead, 0); }

  /* ---------- Quiz-Events ---------- */
  document.addEventListener("change", function (e) {
    var el = e.target; if (!el || !el.matches('input[type="radio"], input[type="checkbox"]')) return;
    if (el.type === "radio" && !el.checked) return;
    var step = el.closest('[data-gj="step"]'); if (!step) return;
    dl({ event: "quiz_answer", quiz_step: step.getAttribute("data-question-id"), answer: el.value, first_answer: !seenAnswer });
    seenAnswer = true;
  }, true);
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="/absage"]'); if (!a) return;
    var step = a.closest('[data-gj="step"]');
    dl({ event: "quiz_ko", quiz_step: step ? step.getAttribute("data-question-id") : "", answer: (a.textContent || "").trim() });
  }, true);
  var contactDone = false;
  document.addEventListener("focusin", function (e) {
    if (contactDone) return; var t = e.target;
    if (t && t.closest && t.closest('[data-gj="contact"], [data-gj="contact2"]') && t.matches("input, textarea")) { contactDone = true; dl({ event: "contact_start" }); }
  }, true);

  /* ---------- Zeit-Events (aktiv sichtbare Zeit) ---------- */
  var TH = [[10, "low_interest"], [25, "mid_interest"], [60, "high_interest"], [90, "super_high_interest"]], fired = {}, active = 0, last = null, raf = null;
  function fire(name) { dl({ event: "gj_time_" + name, interest: name }); }
  function tick() { if (document.visibilityState !== "visible") return; var now = performance.now(); if (last != null) active += (now - last) / 1000; last = now;
    TH.forEach(function (t) { if (active >= t[0] && !fired[t[1]]) { fired[t[1]] = true; fire(t[1]); } }); raf = requestAnimationFrame(tick); }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") { last = performance.now(); tick(); } else { cancelAnimationFrame(raf); last = null; } });
  if (document.visibilityState === "visible") { last = performance.now(); raf = requestAnimationFrame(tick); }

  /* ---------- Verlassen-Warnung ---------- */
  var dirty = false, safe = false;
  ["pointerdown", "keydown", "input", "change"].forEach(function (ev) { document.addEventListener(ev, function () { dirty = true; }, { capture: true, passive: true }); });
  document.addEventListener("click", function (e) { if (e.target && e.target.closest && e.target.closest('a[href*="/absage"], [type="submit"], [data-gj="ghost"], [data-gj="legal"] a, [data-gj="inno"]')) safe = true; }, true);
  document.addEventListener("submit", function () { safe = true; }, true);
  window.addEventListener("beforeunload", function (e) { if (!dirty || safe) return; e.preventDefault(); e.returnValue = ""; });
})();
