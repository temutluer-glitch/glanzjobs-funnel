/* GlanzJobs Bewerbungsfunnel: Laufzeit-Logik der Webflow-Vorlage "Stellen Template".
   Laedt VOR Formly (multi-step.js). Liest alles aus dem versteckten #gj-config (CMS-gebunden).
   Keine IP-Abfrage im Browser (Datenschutz). Praefix gj_. Version 5: jede dataLayer-Meldung traegt eine event_id (Deduplizierung Browser/Server),
   neue Meldungen gj_contact_view, gj_lead, gj_submit_application mit user_data; Pixel-Aufrufe laufen nur noch ueber den Tag Manager. */
(function () {
  "use strict";
  var cfgEl = document.getElementById("gj-config");
  function k(name) { var e = cfgEl && cfgEl.querySelector('[data-k="' + name + '"]'); return e ? (e.textContent || "").trim() : ""; }
  function img(name) { var i = cfgEl && cfgEl.querySelector('[data-ff="' + name + '"]'); var s = i && i.getAttribute("src"); return s && !/placeholder/i.test(s) ? s : ""; }
  var C = { firma: k("firma"), slug: k("slug") || location.pathname.split("/").pop(), stelle: k("stelle"), ort: k("ort"),
            farbe: k("farbe"), ap: k("ap"), ziel: k("webhook"), pixel: k("pixel").replace(/\D/g, ""), ds: k("ds"), imp: k("imp"),
            logo: img("logo"), hero: img("hero"), apbild: img("apbild") };
  window.__gjConfig = C;

  /* ---------- Farbe und Zustands-Styles ---------- */
  var color = /^#?[0-9a-f]{6}$/i.test(C.farbe) ? (C.farbe[0] === "#" ? C.farbe : "#" + C.farbe) : "#0b5fff";
  document.documentElement.style.setProperty("--gj", color);
  var css = document.createElement("style");
  css.textContent =
    ".fn-btn-primary,.fn-bar-fill{background-color:var(--gj)!important;border-color:var(--gj)!important}" +
    ".fn-list{white-space:pre-line}[data-gj=counter]{font-weight:600}" +
    ".fn-btn.w-radio,.fn-btn.w-checkbox{cursor:pointer;margin-bottom:0}" +
    ".fn-btn:has(input:checked){border-color:var(--gj)!important;background:color-mix(in srgb,var(--gj) 10%,#fff)!important}" +
    ".fn-btn .w-form-label{cursor:pointer;font-weight:600;margin-left:0}" +
    ".w-radio-input,.w-checkbox-input{display:none}" +
    "[data-gj=counter]{display:flex;gap:4px}" +
    "[data-gj=bar-fill]{transition:width .35s ease}" +
    ".gj-footer{text-align:center;font-size:12px;color:#6b7280;margin-top:18px}.gj-footer a{color:#6b7280;margin:0 8px}" +
    ".fn-check .w-checkbox-input{display:inline-block!important;width:22px;height:22px;margin:0 12px 0 0}";
  document.head.appendChild(css);

  /* ---------- Intro: Kicker, Footer-Links ---------- */
  var kicker = document.querySelector('[data-gj="kicker"]');
  if (kicker) kicker.textContent = [C.stelle, C.ort].filter(Boolean).join(" · ");
  var card = document.querySelector('[data-gj="card"]');
  if (card && (C.ds || C.imp)) {
    var f = document.createElement("div"); f.className = "gj-footer";
    if (C.imp) f.innerHTML += '<a href="' + C.imp + '" target="_blank" rel="noopener">Impressum</a>';
    if (C.ds) f.innerHTML += '<a href="' + C.ds + '" target="_blank" rel="noopener">Datenschutz</a>';
    card.appendChild(f);
  }
  var dsLabel = document.querySelector('[data-gj="f-datenschutz"] .w-form-label');
  if (dsLabel && C.ds) dsLabel.innerHTML += ' <a href="' + C.ds + '" target="_blank" rel="noopener">Datenschutzerklärung</a>';

  /* ---------- Fragen-Schritte aus der Collection-Liste vorbereiten (vor Formly) ---------- */
  var steps = document.querySelectorAll('[data-gj="steps"] [data-gj="step"]');
  var usedIds = {};
  steps.forEach(function (step, si) {
    var qidEl = step.querySelector('[data-gj="qid"]'), typEl = step.querySelector('[data-gj="typ"]');
    var qid = (qidEl && qidEl.textContent.trim().replace(/[^a-z0-9_-]/gi, "_").toLowerCase()) || ("frage_" + (si + 1));
    if (usedIds[qid]) qid = qid + "_" + (si + 1); usedIds[qid] = true;
    var multi = /mehrfach/i.test(typEl ? typEl.textContent : "");
    step.setAttribute("data-question-id", qid);
    var hint = step.querySelector('[data-gj="hint"]'); if (hint && !hint.textContent.trim()) hint.remove();
    var answers = step.querySelector('[data-gj="answers"]');
    var wrappers = step.querySelectorAll('[data-gj^="a"].w-radio, [data-gj^="a"].w-checkbox');
    var n = 0;
    wrappers.forEach(function (w) {
      var input = w.querySelector("input"), label = w.querySelector(".w-form-label");
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
    if (ko) { var kt = ko.querySelector('[data-gj="ko-text"]'); if (!kt || !kt.textContent.trim()) ko.remove(); else ko.setAttribute("data-answer-id", "ko"); }
    if (multi && answers) {
      answers.removeAttribute("data-radio-skip");
      var next = document.createElement("a"); next.href = "#"; next.className = "fn-btn fn-btn-primary"; next.setAttribute("data-form", "next-btn");
      next.textContent = "Weiter"; answers.after(next);
    }
  });

  /* ---------- Zaehler und Fortschrittsbalken (eigene Logik, Formly-Zaehler deaktiviert) ---------- */
  var counterEl = document.querySelector('[data-gj="counter"]'), bar = document.querySelector('[data-gj="bar"]'), fill = document.querySelector('[data-gj="bar-fill"]');
  document.querySelectorAll("[data-text]").forEach(function (el) { el.removeAttribute("data-text"); });
  var allSteps = Array.prototype.slice.call(document.querySelectorAll('[data-form="step"]'));
  var contactSeen = false;
  function paint() {
    var idx = -1;
    allSteps.forEach(function (s, i) { if (idx < 0 && getComputedStyle(s).display !== "none") idx = i; });
    var total = allSteps.length - 2;                 /* ohne Intro und ohne Kontaktschritt */
    var onIntro = idx <= 0, onContact = idx >= allSteps.length - 1;
    if (onContact && !contactSeen && allSteps.length > 1) { contactSeen = true; dl({ event: "gj_contact_view" }); }
    if (counterEl) { counterEl.style.visibility = onIntro ? "hidden" : "visible"; counterEl.textContent = onIntro ? "" : (onContact ? "Letzter Schritt" : ("Frage " + idx + " von " + total)); }
    if (bar) bar.style.visibility = onIntro ? "hidden" : "visible";
    if (fill) fill.style.width = (onContact ? 100 : Math.max(4, Math.round((Math.max(0, idx) / Math.max(1, total + 1)) * 100))) + "%";
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
  document.addEventListener("submit", function () { setField("time_on_funnel", String(Math.round((Date.now() - Number(start)) / 1000))); writeAll(); }, true);
  function dl(obj) { window.dataLayer = window.dataLayer || []; obj.event_id = uuid(); window.__gjLastEventId = obj.event_id; window.dataLayer.push(obj); return obj.event_id; }
  dl(Object.assign({ event: "gj_attribution_ready" }, V));

  /* ---------- Lead-Events bei sichtbarer Erfolgsmeldung (Lead + SubmitApplication, mit user_data fuer den Abgleich) ---------- */
  function val(id) { var el = document.getElementById(id); return el && el.value ? String(el.value).trim() : ""; }
  function normPhone(p) { var d = p.replace(/\D/g, ""); if (d.indexOf("00") === 0) d = d.slice(2); else if (d.indexOf("0") === 0) d = "49" + d.slice(1); return d; }
  var okEl = document.getElementById("bewerbung-erfolgreich"), leadSent = false;
  function checkLead() {
    if (leadSent || !okEl || getComputedStyle(okEl).display === "none") return; leadSent = true;
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
  var seenAnswer = false;
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
    if (t && t.closest && t.closest("#contact") && t.matches("input, textarea")) { contactDone = true; dl({ event: "contact_start" }); }
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
  document.addEventListener("click", function (e) { if (e.target && e.target.closest && e.target.closest('a[href*="/absage"], [type="submit"]')) safe = true; }, true);
  document.addEventListener("submit", function () { safe = true; }, true);
  window.addEventListener("beforeunload", function (e) { if (!dirty || safe) return; e.preventDefault(); e.returnValue = ""; });
})();
