/* ============ REEL studio — app (v3: showreel hero, rail, full-screen project stage) ============ */
(function () {
  "use strict";
  const S = window.SITE, M = window.MANIFEST || { projects: {} };
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => Array.from(el.querySelectorAll(q));
  const html = document.documentElement, body = document.body;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const params = new URLSearchParams(location.search);
  const shot = params.has("shot");
  const isHome = !!$("#reelstrip");
  const pageSlug = body.dataset.project || null;
  let lang = (params.get("lang") || localStorage.getItem("reel-lang") || html.getAttribute("data-lang") || "en");
  const t = (x) => (x == null ? "" : typeof x === "string" ? x : (x[lang] || x.en || ""));
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, n) => a + (b - a) * n;
  const isAr = (s) => /[؀-ۿ]/.test(s);
  const pageUrl = (p) => `work/${p.slug}.html`;
  const bySlug = s => S.projects.find(p => p.slug === s);
  const pad2 = n => String(n).padStart(2, "0");

  /* ---------- i18n ---------- */
  function applyLang(next) {
    lang = next; localStorage.setItem("reel-lang", lang);
    html.setAttribute("lang", lang); html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr"); html.setAttribute("data-lang", lang);
    $$("[data-i18n]").forEach(el => { const k = el.getAttribute("data-i18n"); if (S.ui[k]) el.textContent = t(S.ui[k]); });
    if (isHome) { document.title = lang === "ar" ? "ريل | استوديو إبداعي سعودي" : "REEL | Saudi creative studio"; renderHome(); }
    if (pageSlug) { const p = bySlug(pageSlug); if (p) { document.title = `${t(p.title)} | REEL`; renderProject(p); } }
    buildRail();
  }
  $("#langToggle").addEventListener("click", e => { e.preventDefault(); applyLang(lang === "en" ? "ar" : "en"); });

  /* ---------- shutter page transitions ---------- */
  const shutter = $("#shutter");
  function go(url) {
    if (reduced || !shutter) { location.href = url; return; }
    shutter.classList.add("in"); setTimeout(() => { location.href = url; }, 560);
  }
  function wireLinks(scope = document) {
    $$("a[data-go]", scope).forEach(a => { if (a._wired) return; a._wired = true; a.addEventListener("click", e => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); go(a.getAttribute("href")); }); });
  }
  addEventListener("pageshow", e => { if (e.persisted && shutter) shutter.className = ""; });

  /* ---------- loader (home only) ---------- */
  const loader = $("#loader");
  function finishLoader() {
    if (!loader || loader.classList.contains("done")) return;
    loader.classList.add("done"); body.classList.add("ready"); sessionStorage.setItem("reel-seen", "1");
    setTimeout(() => $$(".reveal").forEach(el => io.observe(el)), 100);
  }
  function runLoader() {
    if (!loader) { body.classList.add("ready"); $$(".reveal").forEach(el => io.observe(el)); return; }
    const seen = sessionStorage.getItem("reel-seen") || reduced;
    loader.classList.add("logo"); setTimeout(finishLoader, seen ? 350 : 1100);
    loader.addEventListener("click", finishLoader);
  }

  /* ---------- cursor ---------- */
  const cur = $("#cursor"), cLabel = $(".c-label");
  if (fine && cur) {
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy, moving = false;
    addEventListener("mousemove", e => { tx = e.clientX; ty = e.clientY; if (!moving) { moving = true; requestAnimationFrame(loop); } }, { passive: true });
    document.addEventListener("mouseleave", () => cur.classList.add("hidden"));
    document.addEventListener("mouseenter", () => cur.classList.remove("hidden"));
    document.addEventListener("mouseover", e => {
      const el = e.target.closest("[data-cursor], a, button, .reel-card, .frame, .chip, .book, .char, .member, .ch-stills figure");
      body.classList.toggle("over-video", !!e.target.closest("#hero, .chapter, .pv-stage, #reelstrip"));
      if (el) { cur.classList.add("hover"); cLabel.textContent = el.getAttribute("data-cursor") || (el.closest(".reel-card") ? t(S.ui.open_project).toUpperCase() : ""); }
      else cur.classList.remove("hover");
    });
    function loop() { cx = lerp(cx, tx, .22); cy = lerp(cy, ty, .22); cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`; if (Math.abs(cx - tx) > .3 || Math.abs(cy - ty) > .3) requestAnimationFrame(loop); else moving = false; }
  }

  /* ---------- nav + scroll progress ---------- */
  const nav = $("#nav"), progress = $("#progress"); let lastY = 0, ticking = false;
  function onScroll() {
    const y = scrollY; nav.classList.toggle("solid", y > innerHeight * .8); body.classList.toggle("at-top", isHome && y < innerHeight * .6); lastY = y;
    if (progress) { const max = document.documentElement.scrollHeight - innerHeight; progress.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`; }
    ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  $("#burger").addEventListener("click", () => nav.classList.toggle("menu"));
  $$("#navMobile a").forEach(a => a.addEventListener("click", () => nav.classList.remove("menu")));

  /* ---------- rail (section navigator) ---------- */
  const rail = $("#rail"); let railIO = null;
  function buildRail() {
    if (!rail) return;
    let items = [];
    if (isHome) {
      items.push({ href: "#hero", label: "REEL", el: $("#hero") });
      items.push({ href: "#work", label: t(S.ui.nav_work), el: $("#work") });
      S.projects.forEach((p, i) => items.push({ href: "#ch-" + p.key, label: pad2(i + 1) + " " + t(p.title), el: $("#ch-" + p.key), sub: true, key: p.key }));
      ["studio", "services", "team", "grade", "contact"].forEach(id => { const el = $("#" + id); items.push({ href: "#" + id, label: t(S.ui[el.dataset.railKey]), el }); });
    } else if (pageSlug) {
      items.push({ href: "index.html", label: t(S.ui.rail_home), go: true });
      S.projects.forEach((p, i) => items.push({ href: pageUrl(p), label: pad2(i + 1) + " " + t(p.title), sub: true, key: p.key, active: p.slug === pageSlug, go: p.slug !== pageSlug }));
    }
    rail.innerHTML = items.map(it => `<a href="${it.href}" class="${it.sub ? "sub" : ""} ${it.active ? "active" : ""}" ${it.go ? "data-go" : ""} ${it.key ? `data-key="${it.key}"` : ""}><i></i><span>${esc(it.label)}</span></a>`).join("");
    wireLinks(rail);
    if (isHome) {
      if (railIO) railIO.disconnect();
      const links = $$("a", rail);
      railIO = new IntersectionObserver(es => {
        es.forEach(en => { if (en.isIntersecting) { const href = "#" + en.target.id; links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === href)); } });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      items.forEach(it => it.el && railIO.observe(it.el));
    }
  }

  /* ---------- reveal / tilt ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: .12 });
  function markReveal(scope = document) {
    $$(".section-head, .value, .member, .act, .sstat, .look, .char, .book-wrap, .frame, .ch-main > *, .ch-bottom > *, .pv-s2 .glass", scope).forEach((el, i) => {
      if (!el.classList.contains("reveal")) { el.classList.add("reveal"); el.style.transitionDelay = (i % 6) * 60 + "ms"; }
      if (body.classList.contains("ready")) io.observe(el);
    });
  }
  function tilt(el, max = 6, target = el) {
    if (!fine || reduced) return;
    el.addEventListener("mousemove", e => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; target.style.setProperty("--ry", (x * max) + "deg"); target.style.setProperty("--rx", (-y * max) + "deg"); });
    el.addEventListener("mouseleave", () => { target.style.setProperty("--ry", "0deg"); target.style.setProperty("--rx", "0deg"); });
  }

  /* ---------- toast / copy ---------- */
  let toastT; function toast(msg) { const el = $("#toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 1600); }
  function copy(txt) { (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).finally(() => toast(`${t(S.ui.copied)} ${txt}`)); }

  /* ---------- lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap"); let lbList = [], lbI = 0;
  function shotLabel(orig) {
    let m = orig.match(/^(?:still )?(\d+)_(\d+)\.(\d+)\.(\d+)/i); if (m) return `C${pad2(m[1])} · TL${m[2]} · F${m[3]}`;
    m = orig.match(/_(\d+)\.(\d+)\.(\d+)\./); if (m) return `SC${m[1]} · TK${m[2]}.${pad2(m[3])}`;
    return orig;
  }
  function openLB(list, i) { lbList = list; lbI = i; showLB(); lb.classList.add("open"); }
  function showLB() { const s = lbList[lbI]; lbImg.src = s.src; lbCap.textContent = `${pad2(lbI + 1)} / ${pad2(lbList.length)}  ·  ${shotLabel(s.orig)}`; }
  function closeLB() { lb.classList.remove("open"); }
  $(".lb-close").addEventListener("click", closeLB); lb.addEventListener("click", e => { if (e.target === lb) closeLB(); });
  $(".lb-prev").addEventListener("click", () => { lbI = (lbI - 1 + lbList.length) % lbList.length; showLB(); });
  $(".lb-next").addEventListener("click", () => { lbI = (lbI + 1) % lbList.length; showLB(); });
  addEventListener("keydown", e => { if (e.key === "Escape") closeLB(); if (!lb.classList.contains("open")) return; if (e.key === "ArrowRight") $(".lb-next").click(); if (e.key === "ArrowLeft") $(".lb-prev").click(); });

  /* ================= HOME ================= */
  let strip, track, dragging = false, startX = 0, startSX = 0, moved = 0, vel = 0, lastPX = 0, lastT = 0;
  const SEG = [0, 9, 18, 27], SEG_END = 37; // showreel.mp4 segment starts (seconds)
  function initHome() {
    // hero: parallax wash via direct transforms (compositor-only), showreel caption
    const hero = $("#hero"), wash = $("#heroWash"); let hx = 0, hy = 0, hxT = 0, hyT = 0, pm = false;
    if (fine && !reduced && wash) {
      const step = () => { hx = lerp(hx, hxT, .06); hy = lerp(hy, hyT, .06); wash.style.transform = `translate3d(${(hx * -24).toFixed(1)}px,${(hy * -18).toFixed(1)}px,0) scale(1.04)`; if (Math.abs(hx - hxT) > .002 || Math.abs(hy - hyT) > .002) requestAnimationFrame(step); else pm = false; };
      hero.addEventListener("mousemove", e => { const r = hero.getBoundingClientRect(); hxT = ((e.clientX - r.left) / r.width - .5) * 2; hyT = ((e.clientY - r.top) / r.height - .5) * 2; if (!pm) { pm = true; requestAnimationFrame(step); } }, { passive: true });
    }
    const tcEl = $("#heroTC"); const t0 = performance.now();
    setInterval(() => { const f = Math.floor((performance.now() - t0) / 1000 * 24); tcEl.textContent = [Math.floor(f / 86400), Math.floor(f / 1440) % 60, Math.floor(f / 24) % 60, f % 24].map(pad2).join(":"); }, 1000 / 24);
    const hv = $("#heroVideo"), now = $("#heroNow"), nowIdx = $("#heroNowIdx"), nowTitle = $("#heroNowTitle"), nowBar = $("#heroNowBar"); $("#heroNowN").textContent = pad2(S.projects.length);
    let curSeg = -1;
    const tickNow = () => {
      const ct = hv.currentTime || 0; let i = 0; for (let k = 0; k < SEG.length; k++) if (ct >= SEG[k]) i = k;
      const a = SEG[i], b = SEG[i + 1] != null ? SEG[i + 1] : SEG_END; nowBar.style.transform = `scaleX(${clamp((ct - a) / (b - a), 0, 1).toFixed(3)})`;
      if (i !== curSeg) { curSeg = i; const p = S.projects[i]; nowIdx.textContent = pad2(i + 1); nowTitle.textContent = t(p.title); now.setAttribute("href", pageUrl(p)); body.style.setProperty("--hero-accent", p.accent); }
    };
    hv.addEventListener("timeupdate", tickNow); tickNow();
    hv.addEventListener("error", () => { hv.style.display = "none"; });
    now.addEventListener("click", e => { e.preventDefault(); go(now.getAttribute("href")); });
    // pause hero video when off-screen (saves GPU)
    new IntersectionObserver(es => { if (es[0].isIntersecting) hv.play().catch(() => {}); else hv.pause(); }, { threshold: .05 }).observe(hero);
    // strip
    strip = $("#reelstrip"); track = $("#reelTrack");
    const dir = () => (html.dir === "rtl" ? -1 : 1);
    strip.addEventListener("pointerdown", e => { if (e.button) return; dragging = true; strip.classList.add("dragging"); startX = e.clientX; startSX = offset; moved = 0; vel = 0; lastPX = startX; lastT = performance.now(); });
    addEventListener("pointermove", e => { if (!dragging) return; const x = e.clientX; offset = startSX + (x - startX) * dir(); moved = Math.abs(x - startX); const nowT = performance.now(); vel = (x - lastPX) / Math.max(1, nowT - lastT) * dir(); lastPX = x; lastT = nowT; });
    const endDrag = (e) => { if (!dragging) return; dragging = false; strip.classList.remove("dragging"); offset += vel * 180; if (e && e.type === "pointerup" && moved < 6) { const card = document.elementFromPoint(e.clientX, e.clientY)?.closest(".reel-card"); if (card) go(card.getAttribute("href")); } };
    addEventListener("pointerup", endDrag); addEventListener("pointercancel", endDrag);
    strip.addEventListener("mouseenter", () => { paused = true; }); strip.addEventListener("mouseleave", () => { paused = false; });
    addEventListener("resize", layoutStrip);
    requestAnimationFrame(stripFrame);
    range.addEventListener("input", () => setPos(+range.value)); setPos(50);
    initShowcaseObserver();
    const m = location.hash.match(/^#\/work\/([\w-]+)/); if (m && bySlug(m[1])) location.replace(pageUrl(bySlug(m[1])));
  }
  let offset = 0, setW = 0, paused = false, lastFrame = 0, lastBest = 0;
  function buildStrip() {
    const one = S.projects.map((p, i) => `
      <a class="reel-card" href="${pageUrl(p)}" data-slug="${p.slug}" draggable="false">
        <img src="${p.cover}" alt="${esc(t(p.title))}" loading="lazy" draggable="false">
        ${p.loop ? `<video muted loop playsinline preload="none" src="${p.loop}"></video>` : ""}
        ${p.status ? `<span class="rc-status mono">${esc(t(S.ui.in_production))}</span>` : ""}
        <div class="rc-top mono"><span class="rc-tc">00:00:00:00</span><span class="rc-rec">REC</span></div>
        <span class="rc-idx">0${i + 1}</span>
        <div class="rc-cap"><div><div class="rc-type mono">${esc(t(p.type))} · ${p.year}</div><h3>${esc(t(p.title))}</h3></div><span class="rc-open">↗</span></div>
      </a>`).join("");
    track.innerHTML = one + one + one;
    $$(".reel-card", track).forEach(card => {
      const v = $("video", card), tc = $(".rc-tc", card); let timer;
      card._play = () => { if (v && !reduced) { v.play().catch(() => {}); card.classList.add("playing"); } clearInterval(timer); timer = setInterval(() => { const f = v ? Math.floor(v.currentTime * 24) : 0; tc.textContent = `00:00:${pad2(Math.floor(f / 24))}:${pad2(f % 24)}`; }, 40); };
      card._stop = () => { if (v) { v.pause(); card.classList.remove("playing"); } clearInterval(timer); };
      if (fine) { card.addEventListener("mouseenter", card._play); card.addEventListener("mouseleave", card._stop); }
      card.addEventListener("click", e => e.preventDefault());
      card.addEventListener("dragstart", e => e.preventDefault());
    });
    layoutStrip();
  }
  function layoutStrip() { const cards = $$(".reel-card", track), n = S.projects.length; if (cards.length < 2 * n) return; setW = Math.abs(cards[n].offsetLeft - cards[0].offsetLeft); }
  function stripFrame(now) {
    const dt = Math.min(50, now - (lastFrame || now)); lastFrame = now;
    if (!dragging && !paused && !reduced && document.visibilityState === "visible") offset -= dt * 0.04;
    if (setW > 0) { while (offset <= -setW) offset += setW; while (offset > 0) offset -= setW; }
    track.style.transform = `translate3d(${(html.dir === "rtl" ? -offset : offset).toFixed(2)}px,0,0)`;
    if (!fine && now - lastBest > 300) { lastBest = now; const cx = strip.clientWidth / 2; let best = null, bd = 1e9; $$(".reel-card", track).forEach(c => { const r = c.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - cx); if (d < bd) { bd = d; best = c; } }); $$(".reel-card.playing", track).forEach(c => { if (c !== best) c._stop(); }); if (best && !best.classList.contains("playing")) best._play(); }
    requestAnimationFrame(stripFrame);
  }

  /* ---------- showcase (scroll chapters, page theme follows) ---------- */
  function buildShowcase() {
    const ui = S.ui, n = S.projects.length;
    $("#chapters").innerHTML = S.projects.map((p, i) => {
      const all = (M.projects[p.key] || {}).stills || (p.featureStills || []).map((s, j) => ({ src: s, thumb: s, orig: `draft 0${j + 1}` }));
      const thumbs = all.slice(0, 3);
      const posterSrc = p.poster || p.ink || null; const isFrame = !posterSrc;
      return `
      <a class="chapter" id="ch-${p.key}" data-key="${p.key}" href="${pageUrl(p)}" data-go style="--accent:${p.accent}" data-cursor="OPEN">
        <div class="ch-bg"><img src="${p.cover}" alt="" loading="lazy">${p.loop ? `<video muted loop playsinline preload="none" src="${p.loop}"></video>` : ""}</div>
        <span class="ch-hint mono">${esc(t(ui.tap_anywhere))}</span>
        <div class="ch-grid">
          <div class="ch-top"><p class="kicker mono"><span>${pad2(i + 1)} / ${pad2(n)}</span><span>${esc(t(p.type))}</span>${p.status ? `<span class="badge">${esc(t(ui.in_production))}</span>` : `<span>${p.year}</span>`}<span>${esc(t(p.kicker))}</span></p><span class="mono ch-rec">REC <span class="ch-tc">00:00:00:00</span></span></div>
          <div class="ch-main">
            <h3 class="ch-title ${isAr(t(p.title)) ? "ar" : ""}">${esc(t(p.title))}</h3>
            ${p.titleAlt ? `<div class="ch-alt">${esc(t(p.titleAlt))}</div>` : ""}
            <p class="ch-tag">${esc(t(p.tagline))}</p>
            <p class="ch-desc glass">${esc(t(p.desc).split("\n\n")[0])}</p>
          </div>
          <div class="ch-poster ${isFrame ? "frame" : ""}"><div class="ch-poster-in"><img src="${posterSrc || p.frameStill || (all[0] && all[0].mid) || p.cover}" alt="" loading="lazy"></div></div>
          <div class="ch-bottom">
            <div class="ch-stats glass">${p.stats.slice(0, 4).map(s => `<div class="ch-stat"><b data-count="${s.v}" data-suffix="${esc(s.suffix || "")}" ${s.raw ? 'data-raw="1"' : ""}>0</b><span>${esc(t(s.label))}</span></div>`).join("")}</div>
            <div class="ch-stills glass">${thumbs.map(s => `<figure><img src="${s.thumb}" alt="" loading="lazy"></figure>`).join("")}${all.length > 3 ? `<figure class="more mono" style="display:grid;place-items:center;color:#bbb">+${all.length - 3}</figure>` : ""}</div>
            <div class="ch-cta glass"><span>${esc(t(ui.show_more))}</span><i>↗</i></div>
          </div>
        </div>
      </a>`; }).join("");
    $$(".chapter", $("#chapters")).forEach(ch => {
      const v = $("video", ch), tc = $(".ch-tc", ch);
      if (v) { let timer; ch._play = () => { v.play().then(() => v.classList.add("on")).catch(() => {}); clearInterval(timer); timer = setInterval(() => { const f = Math.floor(v.currentTime * 24); tc.textContent = `00:00:${pad2(Math.floor(f / 24))}:${pad2(f % 24)}`; }, 40); }; ch._stop = () => { v.pause(); v.classList.remove("on"); clearInterval(timer); }; }
      const po = $(".ch-poster", ch); if (po) tilt(ch, 12, $(".ch-poster-in", po));
    });
    wireLinks($("#showcase")); countUp($("#showcase"));
    if (showIO) { showIO.disconnect(); $$(".chapter").forEach(ch => showIO.observe(ch)); }
  }
  let showIO = null;
  function initShowcaseObserver() {
    const sec = $("#showcase");
    showIO = new IntersectionObserver(es => {
      es.forEach(en => { const ch = en.target; if (en.isIntersecting) { ch.classList.add("active"); if (ch._play && !reduced) ch._play(); } else { ch.classList.remove("active"); if (ch._stop) ch._stop(); } });
      const act = $$(".chapter.active"); if (act.length) body.dataset.theme = act[act.length - 1].dataset.key;
    }, { threshold: .35 });
    new IntersectionObserver(es => { if (!es[0].isIntersecting) delete body.dataset.theme; }, { threshold: 0, rootMargin: "-30% 0px -30% 0px" }).observe(sec);
    $$(".chapter").forEach(ch => showIO.observe(ch));
  }
  function countUp(scope) {
    const cio = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; cio.unobserve(en.target); const b = en.target, target = +b.dataset.count, suf = b.dataset.suffix; if (b.dataset.raw || reduced) { b.textContent = target + suf; return; } const st = performance.now(), dur = 1400; const step = now => { const k = clamp((now - st) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3); b.textContent = Math.round(target * e) + suf; if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }), { threshold: .4 });
    $$("[data-count]", scope).forEach(b => cio.observe(b));
  }

  /* ---------- static home sections ---------- */
  function renderHome() {
    buildStrip(); buildShowcase();
    $("#studioStats").innerHTML = S.stats.map(s => `<div class="sstat"><b>${esc(s.v || t(S.ui[s.vk]))}</b><span>${esc(t(S.ui[s.k]))}</span></div>`).join("");
    const acts = $("#acts"), cells = $("#filmCells"); let idx = 0; const cellMap = [];
    acts.innerHTML = S.services.map((sv, i) => { const items = sv.items[lang] || sv.items.en; const from = idx; idx += items.length; cellMap.push([from, idx]); return `
      <article class="act" data-i="${i}"><span class="act-label mono">${esc(t(S.ui.act))} ${sv.n}</span><div class="act-n">${sv.n}</div><h3>${esc(t(sv.title))}</h3><p class="act-b">${esc(t(sv.blurb))}</p><ul>${items.map(x => `<li>${esc(x)}</li>`).join("")}</ul></article>`; }).join("");
    cells.innerHTML = Array.from({ length: idx }, () => "<i></i>").join("");
    const cellEls = $$("i", cells);
    $$(".act", acts).forEach((a, i) => {
      a.addEventListener("mouseenter", () => { const [f, to] = cellMap[i]; cellEls.forEach((c, j) => c.className = (j >= f && j < to) ? `lit c${i + 1}` : ""); });
      a.addEventListener("mouseleave", () => cellEls.forEach(c => c.className = ""));
      $$("li", a).forEach((li, j) => li.addEventListener("mouseenter", () => { const [f] = cellMap[i]; cellEls.forEach((c, k) => c.className = k === f + j ? `lit c${i + 1}` : ""); }));
    });
    $("#teamGrid").innerHTML = S.team.map((m, i) => `<${m.url ? `a href="${m.url}" target="_blank" rel="noopener" data-cursor="↗"` : "article"} class="member"><div class="clap"></div><span class="slate mono">ROLL ${pad2(i + 1)} · REEL</span><figure><img src="assets/img/team/${m.slug}.webp" alt="${esc(t(m.name))}" loading="lazy"></figure><figcaption><b>${esc(t(m.name))}${m.url ? " ↗" : ""}</b><span>${esc(t(m.role))}</span></figcaption></${m.url ? "a" : "article"}>`).join("");
    $$(".member, .value").forEach(el => tilt(el, 7));
    const ICONS = { instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>', x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 3h3l-7.3 8.3L21.8 21h-6.4l-4.9-6.1L4.8 21h-3l7.8-8.9L1.5 3H8l4.4 5.6L17.5 3zm-1.1 16.2h1.7L7.7 4.7H5.9l10.5 14.5z"/></svg>', linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.4 8.6H2.9V21h3.5V8.6zM4.6 3a2 2 0 1 0 0 4.1 2 2 0 0 0 0-4.1zM21 13.4c0-3.5-1.9-5.1-4.4-5.1a3.8 3.8 0 0 0-3.4 1.9V8.6H9.8V21h3.5v-6.2c0-1.6.3-3.2 2.3-3.2s2 1.9 2 3.3V21H21v-7.6z"/></svg>' };
    $("#socials").innerHTML = S.brand.social.map(s => `<a class="spill" href="${s.url}" target="_blank" rel="noopener" data-cursor="↗">${ICONS[s.k] || ""}<span>${s.label}</span></a>`).join("");
    buildGrade(); markReveal();
  }

  /* ---------- grade lab ---------- */
  const cmp = $("#compare"), cmpA = $("#cmpAfter"), cmpB = $("#cmpBefore"), range = $("#cmpRange"), pal = $("#palette"), gLabel = $("#gradeLabel");
  let gradeIdx = 0;
  function setPos(p) { p = clamp(p, 2, 98); cmp.style.setProperty("--pos", p + "%"); cmp.style.setProperty("--posn", p); range.value = p; }
  function stillOf(p, id) { const pr = M.projects[p] || {}; return [...(pr.stills || []), ...(pr.gradeStills || [])].find(s => s.id === id); }
  function buildGrade() {
    const list = $("#gradeList"); const items = S.grade.map(g => ({ ...g, s: stillOf(g.p, g.id) })).filter(g => g.s && g.s.log);
    list.innerHTML = items.map((g, i) => `<button data-i="${i}" class="${i === gradeIdx ? "active" : ""}"><img src="${g.s.thumb}" alt=""></button>`).join("");
    $$("button", list).forEach(b => b.addEventListener("click", () => { gradeIdx = +b.dataset.i; $$("button", list).forEach(x => x.classList.toggle("active", x === b)); showGrade(items[gradeIdx]); }));
    if (items[gradeIdx]) showGrade(items[gradeIdx]);
  }
  function showGrade(g) {
    cmpA.src = g.s.src; cmpB.src = g.s.log; gLabel.textContent = t(g.label) + "  ·  " + g.s.orig.replace(/\.(png|jpg)$/i, "");
    pal.innerHTML = g.s.palette.map((c, i) => `<button class="chip" style="background:${c};transition-delay:${i * 40}ms" data-hex="${c}" data-cursor="COPY"><code>${c}</code></button>`).join("");
    $$(".chip", pal).forEach(ch => ch.addEventListener("click", () => copy(ch.dataset.hex)));
    if (!reduced) { setPos(50); let p = 50, dir = 1, n = 0; const id = setInterval(() => { p += dir * 1.2; n++; if (n > 22) dir = -1; if (n > 66) { clearInterval(id); return; } setPos(p); }, 16); }
  }

  /* ================= PROJECT PAGE ================= */
  function renderProject(p) {
    const ui = S.ui, root = $("#projectScroll"); const stills = (M.projects[p.key] || {}).stills || [];
    const idx = S.projects.indexOf(p); const nexts = [S.projects[(idx + 1) % S.projects.length], S.projects[(idx + 2) % S.projects.length]];
    const meta = [[ui.client, t(p.client)], [ui.year, p.year], p.director ? [ui.director, t(p.director)] : null, p.runtime ? [ui.runtime, p.runtime] : null, p.status ? [ui.status, t(ui.in_production)] : null, [ui.role, t(p.role)]].filter(Boolean);
    const media = p.video
      ? `<video class="bg" muted loop autoplay playsinline poster="${p.video.poster}" src="${p.loop || p.video.src}"></video>
         <button class="pv-play" data-cursor="PLAY" aria-label="Play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3l15 9-15 9z"/></svg><span class="mono">${esc(t(p.video.label))}</span></button>
         <div class="pv-ctrl"><button class="pv-mute">${esc(t(ui.mute))}</button><button class="pv-back-proj">${esc(t(ui.back_to_project))}</button></div>`
      : `<img class="kb" src="${p.hero || p.cover}" alt="">`;
    const posterSrc = p.poster || p.ink || null; const posterIsFrame = !p.poster && !p.ink;
    const poster = `<div class="pv-poster ${posterIsFrame ? "frame" : ""}" data-cursor="✦"><div class="pv-poster-in"><img src="${posterSrc || p.frameStill || (stills[0] && stills[0].mid) || p.cover}" alt=""></div></div>`;
    let modules = "";
    if (p.key === "feature") modules += featureModules(p);
    if (p.cast) modules += `<section class="pv-section"><p class="kicker mono">${esc(t(ui.cast))}</p><ul class="castlist" style="max-width:640px">${(p.cast[lang] || p.cast.en).map((c, i) => `<li><span>${esc(c)}</span><span class="mono">0${i + 1}</span></li>`).join("")}</ul></section>`;
    const framesHtml = stills.length ? `<section class="pv-section"><p class="kicker mono">${esc(t(ui.frames))} · ${stills.length}</p><div class="frames" id="frames">${stills.map((s, i) => `
        <figure class="frame" data-i="${i}" data-cursor="VIEW"><img src="${s.mid || s.src}" srcset="${s.mid || s.src} 1600w, ${s.src} ${s.w || 2560}w" sizes="(max-width:760px) 100vw, 50vw" alt="" loading="lazy"><span class="fcorner"></span>
          <span class="fdots">${s.palette.slice(0, 5).map(c => `<i style="background:${c}"></i>`).join("")}</span>
          <figcaption class="fmeta mono"><span>${esc(shotLabel(s.orig))}</span><span>${pad2(i + 1)}/${pad2(stills.length)}</span></figcaption></figure>`).join("")}</div></section>` : "";
    root.innerHTML = `
      <a class="pv-backbtn glass" href="index.html#work" data-go>← <span>${esc(t(ui.back))}</span></a>
      <div class="pv-stage" id="pvStage">
        <div class="pv-media" id="pvMedia">${media}</div>
        <div class="pv-over">
          <section class="pv-s1">
            <div>
              <div class="pv-type mono"><span>${esc(t(p.type))}</span>${p.status ? `<span class="badge">${esc(t(ui.in_production))}</span>` : ""}<span>${esc(t(p.kicker))}</span></div>
              <h1 class="pv-title ${isAr(t(p.title)) ? "ar" : ""}">${esc(t(p.title))}</h1>
              ${p.titleAlt ? `<div class="pv-alt">${esc(t(p.titleAlt))}</div>` : ""}
              <p class="pv-tag">${esc(t(p.tagline))}</p>
            </div>
            ${poster}
          </section>
          <section class="pv-s2">
            <div class="glass desc"><p class="kicker mono">${esc(t(p.key === "feature" ? ui.synopsis : ui.about_project))}</p><p>${esc(t(p.desc))}</p>${p.tags ? `<div class="tags">${(p.tags[lang] || p.tags.en).map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}</div>
            <div class="glass stats"><p class="kicker mono">${esc(t(ui.by_numbers))}</p>${p.stats.map(s => `<div class="pv-stat"><b data-count="${s.v}" data-suffix="${esc(s.suffix || "")}" ${s.raw ? 'data-raw="1"' : ""}>0</b><span>${esc(t(s.label))}</span></div>`).join("")}</div>
            <div class="glass meta pv-meta"><p class="kicker mono">${esc(t(ui.credits))}</p>${meta.map(([k, v]) => `<div><span class="mono">${esc(t(k))}</span><span>${esc(v)}</span></div>`).join("")}</div>
          </section>
        </div>
      </div>
      ${modules}${framesHtml}
      <p class="kicker mono pv-nexts-k">${esc(t(ui.more_projects))}</p><div class="pv-nexts">${nexts.map((nx, k) => `<a class="pv-next" href="${pageUrl(nx)}" data-go><img src="${nx.cover}" alt=""><div><span class="mono">${pad2(S.projects.indexOf(nx) + 1)} · ${esc(t(nx.type))}</span><h3>${esc(t(nx.title))}</h3></div></a>`).join("")}</div>
      <div class="pv-foot mono"><a href="index.html#work" data-go>← ${esc(t(ui.back))}</a><span>REEL · ${esc(t(S.brand.city))}</span><span>${esc(t(ui.footer_rights))}</span></div>`;
    const stage = $("#pvStage"), mediaEl = $("#pvMedia");
    if (p.video) {
      const bg = $("video.bg", mediaEl), play = $(".pv-play", mediaEl), mute = $(".pv-mute", mediaEl), back = $(".pv-back-proj", mediaEl); let full = null;
      play.addEventListener("click", () => {
        stage.classList.add("playing"); bg.pause(); bg.style.display = "none";
        full = document.createElement("video"); full.controls = true; full.playsInline = true; full.autoplay = true; full.src = p.video.src; full.poster = p.video.poster; full.className = "full";
        mediaEl.insertBefore(full, play); full.play().catch(() => {});
        stage.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      mute.addEventListener("click", () => { if (!full) return; full.muted = !full.muted; mute.textContent = full.muted ? t(ui.play_sound) : t(ui.mute); });
      back.addEventListener("click", () => { stage.classList.remove("playing"); if (full) { full.pause(); full.remove(); full = null; } bg.style.display = ""; bg.play().catch(() => {}); });
    }
    const posterEl = $(".pv-poster", root); if (posterEl) tilt(posterEl, 14, $(".pv-poster-in", posterEl));
    countUp(root);
    $$(".frame", root).forEach(f => f.addEventListener("click", () => { if (f.dataset.i != null) openLB(stills, +f.dataset.i); }));
    if (p.key === "feature") wireFeature(p);
    wireLinks(root); markReveal(root); $$(".reveal", root).forEach(el => io.observe(el));
  }

  function featureModules(p) {
    const ui = S.ui; const sw = M.treatmentSwatches || [[], [], []]; const looks = M.looks || [];
    const phases = `<section class="pv-section"><p class="kicker mono">${esc(t(ui.phases))}</p><div class="phases" id="phases"><div class="track"></div><div class="fill" id="phaseFill"></div><ol>${p.phases.map(ph => `<li data-d="${ph.d}"><i></i><span class="ph-t">${esc(t(ph.t))}</span><span class="ph-d">${ph.d}</span></li>`).join("")}</ol></div></section>`;
    const chars = `<section class="pv-section"><p class="kicker mono">${esc(t(ui.characters))} · ${p.characters.length}</p><div class="chars">${p.characters.map(c => `
      <article class="char ${c.lead ? "lead" : ""}" data-cursor="BIO">
        <h3 class="ch-name ${isAr(t(c.name)) ? "ar" : ""}">${esc(t(c.name))}</h3>
        <dl class="ch-kv"><dt class="mono">${esc(t(ui.age))}</dt><dd>${esc(t(c.age))}</dd><dt class="mono">${esc(t(ui.job))}</dt><dd>${esc(t(c.job))}</dd><dt class="mono">${esc(t(ui.traits))}</dt><dd>${esc(t(c.traits))}</dd></dl>
        <div class="ch-actor"><img src="${c.img}" alt=""><div><span class="mono">${esc(t(ui.played_by))}</span><b>${esc(t(c.actor))}</b><span style="color:var(--mute)">${esc(t(c.actorBio))}</span></div></div>
        <div class="ch-bio"><p class="kicker mono">${esc(t(ui.bio))} · ${esc(t(c.name))}</p><p>${esc(t(c.bio))}</p><p class="mono" style="color:var(--mute);margin-top:auto">${esc(t(ui.played_by))} ${esc(t(c.actor))}</p></div>
      </article>`).join("")}</div></section>`;
    const shelf = `<section class="pv-section"><p class="kicker mono">${esc(t(ui.novels))}</p><p class="lead" style="max-width:60ch">${esc(t(ui.novels_sub))}</p><div class="shelf">${p.novels.map(n => `
      <div class="book-wrap"><div class="book" data-cursor="TURN" style="--r:${-22 - n.n * 6}deg">
        <div class="face front"><img src="assets/img/feature/novel${n.n}-front.webp" alt="${esc(t(n.title))}"></div>
        <div class="face back"><img src="assets/img/feature/novel${n.n}-back.webp" alt=""></div>
        <div class="face spine"><img src="assets/img/feature/novel${n.n}-spine.webp" alt=""></div>
        <div class="face pages"></div><div class="face top"></div><div class="face bottom"></div>
      </div><div class="book-cap"><b class="${isAr(t(n.title)) ? "ar" : ""}">${esc(t(n.title))}</b><span class="mono">${esc(t(n.edition))} · ${lang === "ar" ? "للكاتب الوليد" : "by Al-Waleed"}</span><p>${esc(t(n.blurb))}</p></div></div>`).join("")}</div></section>`;
    const looksHtml = `<section class="pv-section"><p class="kicker mono">${esc(t(ui.treatment))}</p><div class="looks">${p.looks.map((l, i) => `
      <article class="look"><figure><img src="${(looks[i] || {}).src || p.featureStills[i]}" alt=""></figure>
        <div class="swatches">${(sw[i] || []).map((c, j) => `<i style="background:${c};--rot:${(j % 2 ? 1 : -1) * (3 + j * 2)}deg" data-hex="${c}"></i>`).join("")}</div>
        <div class="look-t"><h4>${esc(t(l.t))}</h4><p>${esc(t(l.p))}</p></div></article>`).join("")}</div>
      <div class="feature-stills">${p.featureStills.map((s, i) => `<figure class="frame" data-fs="${i}" data-cursor="VIEW"><img src="${s}" alt=""><span class="fcorner"></span><figcaption class="fmeta mono"><span>DRAFT 1 · CLR</span><span>0${i + 1}/03</span></figcaption></figure>`).join("")}</div></section>`;
    return phases + chars + shelf + looksHtml;
  }
  function wireFeature(p) {
    const root = $("#projectScroll");
    const parse = d => { const [m, y] = d.split("/").map(s => parseInt(s.trim(), 10)); return new Date(2000 + y, m - 1, 1); };
    const now = new Date(), items = $$("#phases li"); const ds = items.map(li => parse(li.dataset.d));
    let prog = 0; for (let i = 0; i < ds.length; i++) { if (now >= ds[i]) { items[i].classList.add("done"); const nx = ds[i + 1]; prog = nx ? (i + clamp((now - ds[i]) / (nx - ds[i]), 0, 1)) / (ds.length - 1) : 1; items.forEach(l => l.classList.remove("now")); items[i].classList.add("now"); } }
    const fill = $("#phaseFill"); const pio = new IntersectionObserver(es => { if (es[0].isIntersecting) { fill.style.width = (prog * 100) + "%"; pio.disconnect(); } }); pio.observe($("#phases"));
    $$(".book", root).forEach(b => {
      let down = false, sx0 = 0, r0 = 0, r = parseFloat(b.style.getPropertyValue("--r")) || -30;
      b.addEventListener("pointerdown", e => { down = true; sx0 = e.clientX; r0 = r; b.classList.add("drag"); b.setPointerCapture(e.pointerId); });
      b.addEventListener("pointermove", e => { if (!down) { if (fine) { const rc = b.getBoundingClientRect(); b.style.setProperty("--rx", ((.5 - (e.clientY - rc.top) / rc.height) * 10) + "deg"); } return; } r = r0 + (e.clientX - sx0) * .6; b.style.setProperty("--r", r + "deg"); });
      const up = () => { if (!down) return; down = false; b.classList.remove("drag"); };
      b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up);
      b.addEventListener("dblclick", () => { r = -30; b.style.setProperty("--r", "-30deg"); });
      b.addEventListener("mouseleave", () => b.style.setProperty("--rx", "4deg"));
    });
    $$(".char", root).forEach(c => c.addEventListener("click", () => c.classList.toggle("open")));
    $$(".feature-stills .frame", root).forEach(f => f.addEventListener("click", () => openLB(p.featureStills.map((s, i) => ({ src: s, orig: `Beyond the Novel · draft still 0${i + 1}` })), +f.dataset.fs)));
    $$(".look .swatches i", root).forEach(i => i.addEventListener("click", () => copy(i.dataset.hex)));
  }

  /* ---------- boot ---------- */
  if (shot) { html.classList.add("shot"); const only = params.get("only"); if (only) { $$("main > *, .marquee").forEach(el => { if (el.id !== only && !el.querySelector("#" + only)) el.classList.add("only-hide"); }); $$("#chapters > .chapter").forEach(ch => { if (only.startsWith("ch-") && ch.id !== only) ch.classList.add("only-hide"); }); } }
  if (shot) setTimeout(() => { const w = innerWidth; const bad = $$("body *").filter(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.right > w + 1 && cs.position !== "fixed" && cs.display !== "none"; }).slice(0, 30).map(el => el.tagName + "." + [...el.classList].slice(0, 2).join(".") + (el.id ? "#" + el.id : "") + ":" + Math.round(el.getBoundingClientRect().left) + "-" + Math.round(el.getBoundingClientRect().right)); body.setAttribute("data-overflow", "SW=" + document.documentElement.scrollWidth + " W=" + w + " | " + bad.join(" | ")); }, 1500);
  if (params.has("perf")) {
    const items = [["cursor", "custom cursor"], ["video", "videos"], ["glass", "glass blur"], ["poster", "poster float+shadow"], ["kb", "Ken Burns / zoom"], ["shadow", "text shadows"], ["hero", "hero grain+wash"], ["grad", "dark gradients"], ["sticky", "sticky stage"]];
    const box = document.createElement("div"); box.id = "perf"; box.innerHTML = `<b id="fps">-- fps</b>` + items.map(([k, l]) => `<label><input type="checkbox" data-k="${k}"> no ${l}</label>`).join("");
    body.appendChild(box);
    box.addEventListener("change", e => { const k = e.target.dataset.k; if (k) body.classList.toggle("p-" + k, e.target.checked); });
    let frames = 0, t0 = performance.now(); const fpsEl = box.querySelector("#fps");
    (function tick(now) { frames++; if (now - t0 >= 1000) { fpsEl.textContent = frames + " fps"; fpsEl.style.color = frames >= 55 ? "#7df0a6" : frames >= 40 ? "#ffd36b" : "#ff6b6b"; frames = 0; t0 = now; } requestAnimationFrame(tick); })(performance.now());
  }
  if (isHome) initHome();
  applyLang(lang);
  onScroll();
  if (isHome) body.classList.toggle("at-top", scrollY < innerHeight * .6);
  if (shot) { body.classList.add("ready"); if (loader) loader.classList.add("done"); $$(".reveal").forEach(el => el.classList.add("in")); if (shutter) shutter.className = ""; }
  else {
    runLoader();
    if (pageSlug && shutter) requestAnimationFrame(() => requestAnimationFrame(() => { shutter.classList.remove("covered"); shutter.classList.add("out"); setTimeout(() => { shutter.className = ""; }, 900); }));
  }
})();
