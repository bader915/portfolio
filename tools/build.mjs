// Builds the data-driven parts of portfolio-claude-v3 from data/data.json (no dependencies):
//   - work/<slug>.html: one case-study page per project
//   - index.html: the "All work" index and the "About" section, between <!-- build:x --> markers
// Run from the project folder:  node tools/build.mjs
// 'needsInput' in the data lists what Badr still has to supply; it is never written to a page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/data.json'), 'utf8'));
const dims = JSON.parse(fs.readFileSync(path.join(root, 'data/images.json'), 'utf8'));
const P = data.person;
// The public address, used only for link-preview tags (they must be absolute URLs).
const SITE = (process.env.SITE_URL || 'https://bader915.github.io/portfolio/').replace(/\/?$/, '/');
// Link-preview image: a project's own card when it has pictures, otherwise the site card (assets/og/*.jpg).
const ogTags = (pagePath, slug) => {
  const img = slug && fs.existsSync(path.join(root, 'assets/og', slug + '.jpg')) ? slug : 'default';
  return `<meta property="og:url" content="${SITE}${pagePath}">
<meta property="og:site_name" content="Badr Albdulmajeed">
<meta property="og:image" content="${SITE}assets/og/${img}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">`;
};

// Contact details stay out of the repository: locally they come from .env, in GitHub Actions from
// repository secrets set as environment variables (see README). The phone gives the tel: and wa.me links.
try { process.loadEnvFile(path.join(root, '.env')); } catch { /* no .env file: rely on the environment */ }
const need = k => {
  const v = (process.env[k] || '').trim();
  if (!v) throw new Error(`Missing ${k}. Copy .env.example to .env and fill it in.`);
  return v;
};
P.email = need('CONTACT_EMAIL');
P.phone = need('CONTACT_PHONE');
const digits = P.phone.replace(/\D/g, '');
P.phoneHref = 'tel:+' + digits;
P.whatsapp = 'https://wa.me/' + digits;

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = s => encodeURI(s).replace(/#/g, '%23');
const cats = Object.fromEntries(data.categories.map(c => [c.id, c.label]));
const projects = [...data.projects].sort((a, b) => a.order - b.order);
const bySlug = Object.fromEntries(projects.map(p => [p.slug, p]));

// <img> with intrinsic size and the -400 / -800 variants when they exist
function img(src, alt, { pre = '', sizes = '100vw', lazy = true, cls = '', priority = false } = {}) {
  const d = dims[src]; if (!d) throw new Error('no dimensions for ' + src);
  const base = src.replace(/\.webp$/, '');
  const set = [[base + '-400.webp', 400], [base + '-800.webp', 800]].filter(([f]) => dims[f]).map(([f, w]) => `${pre}${url(f)} ${w}w`);
  if (set.length) set.push(`${pre}${url(src)} ${d[0]}w`);
  return `<img${cls ? ` class="${cls}"` : ''} src="${pre}${url(src)}"${set.length ? ` srcset="${set.join(', ')}" sizes="${sizes}"` : ''} width="${d[0]}" height="${d[1]}" alt="${esc(alt)}"${priority ? ' fetchpriority="high"' : lazy ? ' loading="lazy"' : ''} decoding="async">`;
}

const headScript = `<script>
  // motion is always full on this site, whatever the system animation setting (Badr's decision)
  (function () {
    var d = document.documentElement;
    d.classList.remove('no-js'); d.classList.add('js');
    d.classList.add('motion-full');
    // arriving by a page transition: name it after this page's field so the transition fits the discipline
    addEventListener('pagereveal', function (e) {
      if (!e.viewTransition) return;
      var c = 'vt-' + (d.getAttribute('data-field') || 'home');
      d.classList.add(c, 'vt-on');
      d.setAttribute('data-vt', '');   // stays: later scripts read how the page arrived
      e.viewTransition.finished.finally(function () { d.classList.remove(c, 'vt-on'); });
    });
  })();
</script>`;

/* ------------------------------------------------------------------ avatars (copies of Badr's own animations) */
// width, height, length of one loop in ms
const POSES = { idle: [267, 477, 1440], wave: [266, 477, 1560], present: [267, 475, 1560], bench: [266, 478, 1680], arms: [267, 477, 1560], tablet: [267, 476, 1680], hologram: [353, 358, 1800] };
// end: play once and rest on the last frame (a gesture that should stay made) instead of the first
function pose(name, pre, { cls = '', alt = '', lazy = true, end = false } = {}) {
  const [w, h, loop] = POSES[name], a = `${pre}assets/avatar/pose-${name}`, still = `${a}-${end ? 'end' : 'still'}.webp`;
  return `<img class="pose${cls ? ' ' + cls : ''}" src="${a}-still.webp" data-pose="${a}.webp" data-still="${still}" data-loop="${loop}"${end ? ' data-loops="1"' : ''} width="${w}" height="${h}" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
}
const fieldPose = { vision: 'bench', embedded: 'bench', signals: 'bench', power: 'tablet', automation: 'tablet', software: 'tablet' };

/* ------------------------------------------------------------------ field motifs */
// the overlay that plays while a page arrives (see site.css 6h); one per discipline
function vtfx(field) {
  const inner = {
    vision: '<i class="vt-scan"></i><i class="vt-br vt-br--tl"></i><i class="vt-br vt-br--tr"></i><i class="vt-br vt-br--bl"></i><i class="vt-br vt-br--br"></i>',
    power: `<svg class="vt-wave" viewBox="0 0 1200 200" preserveAspectRatio="none"><path pathLength="1" d="${wave(1200, 100, [[0, 760, 34, 120], [760, 980, 80, 120]], 980)}"/></svg>`,
    automation: '<i class="vt-belt"></i><i class="vt-box"></i>',
    embedded: '<svg class="vt-trace" viewBox="0 0 1200 800" preserveAspectRatio="none"><path pathLength="1" d="M0 610 H360 L460 510 H760 L860 410 H1200"/><path pathLength="1" d="M0 250 H240 L330 340 H700 L790 250 H1200"/></svg>',
    signals: '<i class="vt-grid"></i><i class="vt-sweep"></i>',
    software: '<i class="vt-frame"></i>',
    contact: '<i class="vt-ring"></i>',
  }[field];
  return inner ? `<div class="vt-fx" aria-hidden="true">${inner}</div>` : '';
}
// a sine trace: segments of [from, to, amplitude, period], flat after `flat`
function wave(w, mid, segs, flat) {
  let d = `M0 ${mid}`;
  for (let x = 4; x <= w; x += 4) {
    const s = segs.find(([a, b]) => x >= a && x < b);
    const y = x >= flat || !s ? mid : mid - s[2] * Math.sin((x / s[3]) * Math.PI * 2);
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return d;
}
// the drawn strip under each project title: the discipline's own working picture, drawn once on arrival
function motif(field) {
  const svg = (body) => `<div class="motif motif--${field}" aria-hidden="true" data-motif><svg viewBox="0 0 1200 120">${body}</svg></div>`;
  if (field === 'vision') {
    const comps = [[60, 70, 34], [190, 50, 44], [310, 90, 30], [470, 56, 50], [600, 80, 34], [760, 46, 46], [880, 96, 30], [1050, 64, 40]];
    return svg(`<line class="m-base" x1="0" y1="60" x2="1200" y2="60"/>${comps.map(([x, w, h]) => `<rect class="m-comp" style="--d:${(0.15 + (x + w / 2) / 1200 * 2.2).toFixed(2)}s" x="${x}" y="${60 - h / 2}" width="${w}" height="${h}" rx="3"/>`).join('')}<g class="m-scan"><rect x="-70" y="6" width="70" height="108" rx="4"/><line x1="0" y1="6" x2="0" y2="114"/></g>`);
  }
  if (field === 'power') {
    return svg(`<line class="m-base" x1="0" y1="60" x2="1200" y2="60"/><line class="m-mark" style="--d:1.4s" x1="660" y1="8" x2="660" y2="112"/><line class="m-mark m-mark--trip" style="--d:1.85s" x1="860" y1="8" x2="860" y2="112"/><path class="m-draw" pathLength="1" d="${wave(1200, 60, [[0, 660, 22, 100], [660, 860, 46, 100]], 860)}"/>`);
  }
  if (field === 'automation') {
    const bridge = (x, d) => `<line class="m-plate" style="--d:${d}s" x1="${x}" y1="42" x2="${x}" y2="78"/><line class="m-plate" style="--d:${d}s" x1="${x + 24}" y1="42" x2="${x + 24}" y2="78"/><line class="m-bridge" style="--d:${d}s" x1="${x}" y1="60" x2="${x + 24}" y2="60"/>`;
    return svg(`<line class="m-base" x1="10" y1="8" x2="10" y2="112"/><line class="m-base" x1="1190" y1="8" x2="1190" y2="112"/><path class="m-base" d="M10 60 H300 M324 60 H560 M584 60 H950 M1010 60 H1190"/><path class="m-draw" pathLength="1" d="M10 60 H1190"/>${bridge(300, 0.6)}${bridge(560, 1.1)}<path class="m-coil" style="--d:1.9s" d="M962 38 Q946 60 962 82 M998 38 Q1014 60 998 82"/>`);
  }
  if (field === 'embedded') {
    const pins = Array.from({ length: 6 }, (_, k) => 540 + k * 24).map(x => `<line class="m-base" x1="${x}" y1="14" x2="${x}" y2="26"/><line class="m-base" x1="${x}" y1="94" x2="${x}" y2="106"/>`).join('');
    const traces = ['M520 44 H380 L356 22 H70', 'M520 76 H300 L276 100 H120', 'M680 44 H880 L904 22 H1130', 'M680 76 H820 L844 100 H1060'];
    return svg(`${pins}<rect class="m-chip" x="520" y="26" width="160" height="68" rx="6"/>${traces.map(t => `<path class="m-base" d="${t}"/>`).join('')}${traces.map((t, k) => `<path class="m-pulse" style="--d:${0.5 + k * 0.18}s" pathLength="1" d="${t}"/>`).join('')}${[[70, 22], [120, 100], [1130, 22], [1060, 100]].map(([x, y], k) => `<circle class="m-pad" style="--d:${1.5 + k * 0.18}s" cx="${x}" cy="${y}" r="7"/>`).join('')}`);
  }
  if (field === 'signals') {
    let sq = 'M0 85'; for (let x = 0; x < 1200; x += 200) sq += ` H${x + 100} V35 H${x + 200} V85`;
    const grid = [...Array.from({ length: 11 }, (_, k) => `<line class="m-grid" x1="${(k + 1) * 100}" y1="4" x2="${(k + 1) * 100}" y2="116"/>`), ...[30, 60, 90].map(y => `<line class="m-grid" x1="0" y1="${y}" x2="1200" y2="${y}"/>`)].join('');
    return svg(`${grid}<path class="m-draw m-draw--steel" pathLength="1" d="${wave(1200, 60, [[0, 1200, 30, 200]], 9999)}"/><path class="m-draw" pathLength="1" d="${sq}"/>`);
  }
  // software: a small processing chain
  const nodes = [60, 380, 700, 1020];
  return svg(`<path class="m-base" d="M180 60 H380 M500 60 H700 M820 60 H1020"/><path class="m-draw" pathLength="1" d="M180 60 H1020"/>${nodes.map((x, k) => `<rect class="m-node" style="--d:${(0.1 + k * 0.62).toFixed(2)}s" x="${x}" y="34" width="120" height="52" rx="10"/>`).join('')}`);
}

function masthead(pre) {
  return `<header class="masthead is-solid" data-masthead>
  <a class="wordmark" href="${pre}index.html" aria-label="Badr Albdulmajeed, home">
    <span class="wordmark__mark" aria-hidden="true"><i></i><i></i></span>
    <span>Badr Albdulmajeed</span>
  </a>
  <nav class="masthead__nav" aria-label="Main">
    <a href="${pre}index.html#index">All work</a>
    <a href="${pre}index.html#about">About</a>
    <a href="${pre}contact.html">Contact</a>
    <a class="masthead__cv" href="${pre}${url(P.cv)}" download><span class="lg">Download </span>CV</a>
  </nav>
</header>`;
}

function contact(pre) {
  return `<footer class="contact" id="contact">
  <h2>Talk to Badr about a role or a project</h2>
  <p class="contact__panel"><a class="btn btn--solid" href="${pre}contact.html">Open the contact panel</a></p>
</footer>`;
}

/* ------------------------------------------------------------------ case-study pages */
function caseNote(p) {
  return /internship/i.test(p.context || '') ? 'As recorded in the internship report.' : 'As recorded in the project report.';
}
function casePage(p, i) {
  const pre = '../';
  const prev = projects[(i - 1 + projects.length) % projects.length], next = projects[(i + 1) % projects.length];
  const imgs = p.images || [];
  const facts = [['Area', cats[p.category]], ['Context', p.context], ['Year', p.year], ['Role', p.role]].filter(([, v]) => v);
  const tools = p.tools || [];
  const sec = [];
  if (p.problem || p.objective) sec.push(`<section class="case__sec" data-reveal aria-labelledby="po-h"><h2 id="po-h">Problem and objective</h2><div class="case__po">${p.problem ? `<div><h3>Problem</h3><p>${esc(p.problem)}</p></div>` : ''}${p.objective ? `<div><h3>Objective</h3><p>${esc(p.objective)}</p></div>` : ''}</div></section>`);
  if (p.approach?.length) sec.push(`<section class="case__sec" data-reveal aria-labelledby="ap-h"><h2 id="ap-h">Engineering approach</h2><ol class="case__steps">${p.approach.map((a, k) => `<li><span>${String(k + 1).padStart(2, '0')}</span><p>${esc(a)}</p></li>`).join('')}</ol></section>`);
  if (p.results?.length) sec.push(`<section class="case__sec case__sec--results" data-reveal aria-labelledby="rs-h"><h2 id="rs-h">Results</h2><div><ul class="case__results">${p.results.map(r => `<li>${esc(r)}</li>`).join('')}</ul><p class="case__note">${caseNote(p)}</p></div></section>`);
  if (p.specs?.length || tools.length) sec.push(`<section class="case__sec" data-reveal aria-labelledby="sp-h"><h2 id="sp-h">Technical record</h2><div>${p.specs?.length ? `<dl class="case__spec">${p.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}${tools.length ? `<h3 class="case__sub">Tools and equipment</h3><ul class="case__tags" translate="no">${tools.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</div></section>`);
  if (imgs.length > 1) sec.push(`<section class="case__sec case__sec--gallery" data-reveal aria-labelledby="gl-h"><h2 id="gl-h">From the project</h2><div class="case__gallery">${imgs.slice(1).map(m => `<figure class="plate"><a href="${pre}${url(m.src)}" aria-label="Open full size: ${esc(m.alt)}">${img(m.src, m.alt, { pre, sizes: '(min-width: 900px) 44vw, 92vw' })}</a><figcaption>${esc(m.alt)}</figcaption></figure>`).join('')}</div></section>`);

  return `<!doctype html>
<html lang="en" class="no-js" data-field="${p.category}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)} — Badr Albdulmajeed</title>
<meta name="description" content="${esc(p.summary)}">
<meta name="theme-color" content="#06090d">
<meta property="og:title" content="${esc(p.title)} — Badr Albdulmajeed">
<meta property="og:description" content="${esc(p.summary)}">
<meta property="og:type" content="article">
${ogTags(`work/${p.slug}.html`, p.slug)}
<link rel="preload" href="${pre}assets/fonts/schibsted-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="icon" href="${pre}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${pre}assets/css/site.css">
<link rel="stylesheet" href="${pre}assets/css/case.css">
<link rel="expect" href="#main" blocking="render">
${headScript}
</head>
<body class="case-page">
${vtfx(p.category)}
<div class="progress" aria-hidden="true"><i></i></div>
<a class="skip" href="#main">Skip to content</a>
${masthead(pre)}
<main id="main" class="case">
  <header class="case__hero">
    <p class="case__crumb"><a href="${pre}index.html#index">All work</a><span aria-hidden="true">/</span>${esc(cats[p.category])}</p>
    <h1 class="case__title" style="view-transition-name: t-${p.slug}" data-enter>${esc(p.title)}</h1>
    <p class="case__summary" data-enter>${esc(p.summary)}</p>
    <dl class="case__facts" data-enter>${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  </header>
  ${motif(p.category)}
  ${imgs.length ? `<figure class="case__media case__media--${p.category}" data-enter-media><a href="${pre}${url(imgs[0].src)}" aria-label="Open full size: ${esc(imgs[0].alt)}">${img(imgs[0].src, imgs[0].alt, { pre, sizes: '(min-width: 1200px) 1100px, 100vw', lazy: false, priority: true })}</a></figure>` : ''}
  <div class="case__body">
    ${sec.join('\n    ')}
  </div>
  <nav class="pager" aria-label="More projects">
    <a class="pager__link" href="${prev.slug}.html" rel="prev"><span>Previous project</span><b>${esc(prev.title)}</b></a>
    <div class="pager__guide" data-pose-host>${pose(fieldPose[p.category], pre, { cls: 'pager__pose' })}<a class="pager__all" href="${pre}index.html#index">All work</a></div>
    <a class="pager__link pager__link--next" href="${next.slug}.html" rel="next"><span>Next project</span><b>${esc(next.title)}</b></a>
  </nav>
</main>
${contact(pre)}
<script src="${pre}assets/js/pose.js" defer></script>
<script src="${pre}assets/js/case.js" defer></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ home: the index of all work */
function indexSection() {
  const groups = data.categories.map(c => ({ c, list: projects.filter(p => p.category === c.id) })).filter(g => g.list.length);
  return `<section class="index" id="index" aria-labelledby="index-h" data-rail-key="none">
    <div class="index__head" data-gesture>
      <p class="chapter__no">All work · ${projects.length} projects</p>
      <h2 id="index-h">Every project, from coursework to the internship</h2>
      <p class="chapter__lead">Each page is written from its report: the problem, the method, what was recorded and what was used. Pick a discipline or open any line.</p>
      <div class="guide guide--present" data-pose-host>${pose('hologram', '', { end: true })}</div>
    </div>
    <div class="index__filters" role="group" aria-label="Show a discipline" data-filters hidden>
      <button type="button" class="chip is-on" data-filter="all" aria-pressed="true">All <span>${projects.length}</span></button>
      ${groups.map(g => `<button type="button" class="chip" data-filter="${g.c.id}" aria-pressed="false">${esc(g.c.label)} <span>${g.list.length}</span></button>`).join('\n      ')}
    </div>
    <div class="index__wrap">
      <div class="index__groups">
      ${groups.map(g => `<div class="index__group" data-group="${g.c.id}">
        <h3>${esc(g.c.label)} <span>${g.list.length}</span></h3>
        <ul>
          ${g.list.map(p => `<li><a class="row" href="work/${p.slug}.html"${p.images?.length ? ` data-preview="${url(p.images[0].src)}"` : ''}><b style="view-transition-name: t-${p.slug}">${esc(p.title)}</b><span>${esc(p.context || '')}</span><i>${esc(p.year || '')}</i></a></li>`).join('\n          ')}
        </ul>
      </div>`).join('\n      ')}
      </div>
      <div class="index__preview" aria-hidden="true" data-preview-box><img alt="" data-preview-img></div>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------ home: about */
function aboutSection() {
  const e = data.experience[0];
  return `<section class="about" id="about" aria-labelledby="about-h" data-rail-key="none">
    <div class="about__head">
      <p class="chapter__no">About · ${esc(P.location)}</p>
      <h2 id="about-h" data-split>${esc(P.headline)}, ready to start</h2>
      <p class="chapter__lead">${esc(P.lead)} ${esc(P.degree)}. ${esc(P.visa)}, so no sponsorship is needed. ${esc(P.availability)}.</p>
      <div class="guide" data-pose-host>${pose('arms', '', { alt: 'Animated portrait of Badr in workwear, folding his arms' })}</div>
    </div>
    <div class="about__grid">
      <article class="about__block about__block--exp" data-reveal>
        <h3>Experience</h3>
        <p class="about__role">${esc(e.role)}</p>
        <p class="about__meta">${esc(e.org)} · ${esc(e.location)} · ${esc(e.period)}</p>
        <p class="about__sum">${esc(e.summary)}</p>
        <ul class="about__points">${e.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="about__links">Projects: ${e.projects.map(s => `<a href="work/${s}.html">${esc(bySlug[s].title)}</a>`).join(', ')}</p>
      </article>
      <article class="about__block" data-reveal>
        <h3>Education</h3>
        ${data.education.map(ed => `<div class="about__edu"><p class="about__role">${esc(ed.degree)}</p><p class="about__meta">${esc(ed.school)} · ${esc(ed.period)}</p>${ed.points.length ? `<ul class="about__points">${ed.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`).join('')}
        <h3 class="about__h3b">Languages</h3>
        <p class="about__meta">${P.languages.map(l => `${esc(l.name)} (${esc(l.level.toLowerCase())})`).join(', ')}</p>
      </article>
    </div>
    <div class="skills" data-reveal>
      <h3>Skills, and where they were used</h3>
      <div class="skills__grid">
        ${data.skills.map(s => `<div class="skills__col"><h4>${esc(s.domain)}</h4><ul>${s.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p>${s.projects.map(k => `<a href="work/${k}.html">${esc(bySlug[k].title)}</a>`).join('')}</p></div>`).join('\n        ')}
      </div>
    </div>
    <div class="certs" data-reveal>
      <h3>Certificates</h3>
      <ul class="certs__list">
        ${data.certificates.map(c => `<li><a href="${url(c.href)}" target="_blank" rel="noopener">${img(c.thumb, '', { sizes: '200px' })}<b>${esc(c.name)}</b><span>${esc(c.issuer)} · ${esc(c.date)}</span></a></li>`).join('\n        ')}
      </ul>
      <p class="certs__badge"><a href="${esc(data.badge.href)}" target="_blank" rel="noopener">${esc(data.badge.name)} on ${esc(data.badge.issuer)}</a></p>
    </div>
    <div class="faq" data-reveal>
      <h3>Questions recruiters ask</h3>
      <dl>${data.questions.map(q => `<div><dt>${esc(q.q)}</dt><dd>${Array.isArray(q.a) ? `${q.lead ? `<p>${esc(q.lead)}</p>` : ''}<ul class="faq__list">${q.a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : esc(q.a)}</dd></div>`).join('')}</dl>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------ contact page: the panel */
function contactPage() {
  const pre = '';
  const topics = [
    ['role', 'An engineering role', 'Engineering role for Badr Albdulmajeed', "Hello Badr, I'm getting in touch about an engineering role."],
    ['project', 'A project', 'Project enquiry for Badr Albdulmajeed', "Hello Badr, I'm getting in touch about a project."],
    ['question', 'A question', 'Question for Badr Albdulmajeed', 'Hello Badr, I have a question.'],
  ];
  const [, , subj0, text0] = topics[0];
  const mail = `mailto:${P.email}?subject=${encodeURIComponent(subj0)}`, wa = `${P.whatsapp}?text=${encodeURIComponent(text0)}`;
  const cvKB = Math.round(fs.statSync(path.join(root, P.cv)).size / 1024);
  const btn = (h, t, solid, attrs = '') => `<a class="btn ${solid ? 'btn--solid' : 'btn--line'} btn--sm" href="${esc(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}${attrs}>${t}</a>`;
  const copy = (v, t) => `<button type="button" class="btn btn--line btn--sm" data-copy="${esc(v)}" data-copy-label="${t}">${t}</button>`;
  // [key, label, value, link, link attrs, the rest of the drawer]
  // The value itself stays hidden until the line is unlocked (or the breaker brings every line up).
  const lines = [
    ['mail', 'Email', P.email, mail, ' data-line="mail"',
      `<div class="mailcard"><p><span>To</span>${esc(P.email)}</p><p><span>Subject</span><b data-subj>${esc(subj0)}</b></p><p class="mailcard__body" data-body>${esc(text0)}</p></div><div class="drawer__acts">${btn(mail, 'Write the email', true, ' data-line="mail"')}${copy(P.email, 'Copy address')}</div>`],
    ['wa', 'WhatsApp', `${P.phone} on WhatsApp`, wa, ' data-line="wa" target="_blank" rel="noopener"',
      `<div class="chat"><p class="chat__bubble" data-body>${esc(text0)}</p><p class="chat__meta">Written from your topic. You can change it before sending.</p></div><div class="drawer__acts">${btn(wa, 'Open WhatsApp', true, ' data-line="wa"')}</div>`],
    ['phone', 'Phone', P.phone, P.phoneHref, '',
      `<p class="clock">It is <b data-clock>now</b> in Sharjah (UAE time).</p><div class="drawer__acts">${btn(P.phoneHref, 'Call', true)}${copy(P.phone, 'Copy number')}</div>`],
    ['in', 'LinkedIn', `${P.name} on LinkedIn`, P.linkedin, ' target="_blank" rel="noopener"',
      `<div class="idcard"><b>${esc(P.name)}</b><span>${esc(P.headline)}</span><span>${esc(P.location)}</span></div><div class="drawer__acts">${btn(P.linkedin, 'Open the LinkedIn profile', true)}</div>`],
    ['gh', 'GitHub', P.github.replace(/^https?:\/\//, ''), P.github, ' target="_blank" rel="noopener"',
      `<p class="drawer__note">Badr's public repositories on GitHub.</p><div class="drawer__acts">${btn(P.github, 'Open GitHub', true)}</div>`],
    ['cv', 'CV', P.cv.split('/').pop(), url(P.cv), ' download',
      `<p class="drawer__note">PDF · ${cvKB} KB</p><div class="drawer__acts">${btn(url(P.cv), 'Download the CV', true, ' download')}</div>`],
  ];
  // each line is unlocked with a control from a switchboard
  const KIND = { mail: 'slide', wa: 'hold', phone: 'turn', in: 'slide', gh: 'turn', cv: 'hold' };
  const HOW = { slide: 'Slide the isolator across to connect.', turn: 'Turn the selector from 0 to I.', hold: 'Press and hold the button until the ring closes.' };
  const control = (kind, k) => ({
    slide: `<div class="ctl ctl--slide" data-ctl><span class="ctl__track"><span class="ctl__fill"></span><span class="ctl__mk ctl__mk--0">0</span><span class="ctl__mk ctl__mk--1">I</span><span class="ctl__knob" role="slider" tabindex="0" aria-label="${k}: slide to connect" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></span></span></div>`,
    turn: `<div class="ctl ctl--turn" data-ctl><span class="ctl__dial"><span class="ctl__mk ctl__mk--0">0</span><span class="ctl__mk ctl__mk--1">I</span><span class="ctl__knob" role="slider" tabindex="0" aria-label="${k}: turn to connect" aria-valuemin="0" aria-valuemax="90" aria-valuenow="0" aria-valuetext="0"><i></i></span></span></div>`,
    hold: `<div class="ctl ctl--hold" data-ctl><button type="button" class="ctl__push" aria-label="${k}: press and hold to connect"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ctl__ring-bg" cx="50" cy="50" r="46"/><circle class="ctl__ring" cx="50" cy="50" r="46" pathLength="1"/></svg><span class="ctl__cap"></span></button></div>`,
  })[kind];
  // small drawn icons; each has its own short animation (see contact.css)
  const ICONS = {
    mail: '<rect class="i-letter" x="14" y="12" width="20" height="16" rx="2"/><path class="i-body" d="M8 18h32v18a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z"/><path class="i-flap" d="M8 18l16 11 16-11"/>',
    wa: '<path d="M11 11h26a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H22l-8 6v-6h-3a3 3 0 0 1-3-3V14a3 3 0 0 1 3-3z"/><circle class="i-dot" cx="17" cy="21.5" r="2"/><circle class="i-dot" cx="24" cy="21.5" r="2"/><circle class="i-dot" cx="31" cy="21.5" r="2"/>',
    phone: '<path class="i-hand" d="M15 9h5l3 8-4 3a19 19 0 0 0 9 9l3-4 8 3v5a3 3 0 0 1-3 3C22 36 12 26 12 12a3 3 0 0 1 3-3z"/><path class="i-wave" d="M30 12a7 7 0 0 1 6 6"/><path class="i-wave i-wave--2" d="M30 6a13 13 0 0 1 12 12"/>',
    in: '<rect x="7" y="10" width="34" height="28" rx="3"/><circle cx="17" cy="21" r="4"/><path d="M10 33c1.2-4 4-6 7-6s5.8 2 7 6"/><path class="i-line" d="M28 19h8"/><path class="i-line i-line--2" d="M28 24h8"/><path class="i-line i-line--3" d="M28 29h5"/>',
    gh: '<path class="i-l" d="M17 15l-9 9 9 9"/><path class="i-r" d="M31 15l9 9-9 9"/><path class="i-slash" d="M27 11l-6 26"/>',
    cv: '<path d="M13 6h15l8 8v28H13z"/><path d="M28 6v8h8"/><path class="i-line" d="M18 21h12"/><path class="i-line i-line--2" d="M18 26h12"/><path class="i-arrow" d="M24 29v9m-4-4 4 4 4-4"/>',
  };
  return `<!doctype html>
<html lang="en" class="no-js" data-field="contact">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Contact — Badr Albdulmajeed</title>
<meta name="description" content="Reach Badr Albdulmajeed, electrical and electronic engineer in ${esc(P.location)}, by email, WhatsApp, phone or LinkedIn.">
<meta property="og:title" content="Contact — Badr Albdulmajeed">
<meta property="og:description" content="Reach Badr Albdulmajeed by email, WhatsApp, phone or LinkedIn.">
<meta property="og:type" content="website">
${ogTags('contact.html')}
<meta name="theme-color" content="#06090d">
<link rel="preload" href="assets/fonts/schibsted-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/css/site.css">
<link rel="stylesheet" href="assets/css/contact.css">
<link rel="expect" href="#main" blocking="render">
${headScript}
</head>
<body class="cx-page">
${vtfx('contact')}
<a class="skip" href="#main">Skip to content</a>
${masthead(pre)}
<main id="main" class="cx" data-panel>
  <div class="cx__feed">
    <div class="cx__screen" data-pose-host>
      ${pose('idle', pre, { cls: 'cx__pose', alt: 'Animated portrait of Badr standing in the workshop', lazy: false })}
      <i class="cx__corner cx__corner--tl"></i><i class="cx__corner cx__corner--tr"></i><i class="cx__corner cx__corner--bl"></i><i class="cx__corner cx__corner--br"></i>
      <p class="cx__tag"><span class="lamp lamp--status" aria-hidden="true"></span><span><b>Badr</b> · ${esc(P.location)}</span><span class="cx__state" data-state>Standby</span></p>
    </div>
  </div>

  <div class="cx__desk">
    <h1 class="cx__title">Six lines to Badr. Each one is locked out.</h1>
    <p class="cx__lead">Press an icon to open its line, then work its control: slide the isolator, turn the selector or hold the button. Or close the main breaker to bring every line up at once. Pick a topic first and the email and WhatsApp message are written for you.</p>

    <fieldset class="selector" data-topics>
      <legend>What is it about?</legend>
      ${topics.map(([id, label, subj, text], k) => `<label class="selector__pos"><input type="radio" name="topic" value="${id}" data-subject="${esc(subj)}" data-text="${esc(text)}"${k ? '' : ' checked'}><span>${esc(label)}</span></label>`).join('\n      ')}
    </fieldset>

    <div class="board">
      <button type="button" class="breaker" aria-pressed="false" data-breaker>
        <span class="breaker__body" aria-hidden="true"><span class="breaker__on">ON</span><span class="breaker__slot"><span class="breaker__handle"></span></span><span class="breaker__off">OFF</span><span class="breaker__flag"></span></span>
        <span class="breaker__text"><b data-breaker-label>Close the breaker</b><span>Main switch</span></span>
      </button>

      <span class="bus" aria-hidden="true"><i class="bus__stub"></i><i class="bus__bar"></i></span>
      <div class="tiles" role="group" aria-label="Contact lines">
        ${lines.map(([key, k], i) => `<button type="button" class="tile" style="--k:${i}" data-tile="${key}" aria-pressed="false" aria-controls="stage" aria-label="${k}"><span class="tile__drop" aria-hidden="true"><i></i></span><span class="ico ico--${key}" aria-hidden="true"><svg viewBox="0 0 48 48">${ICONS[key]}</svg></span><span class="lamp" aria-hidden="true"></span><span class="tile__name" aria-hidden="true">${k}</span></button>`).join('\n        ')}
      </div>
      <div class="line-stage" id="stage" data-stage>
        <p class="line-stage__idle" data-idle>Press an icon to open its line.</p>
        ${lines.map(([key, k, v, h, attrs, drawer]) => `<section class="unit" data-unit="${key}" data-kind="${KIND[key]}" aria-label="${k}" hidden>
          <div class="unit__lock"><p class="unit__how"><b>${k}</b><span>${HOW[KIND[key]]}</span></p>${control(KIND[key], k)}</div>
          <div class="unit__open" hidden><p class="unit__label">${k}</p><a class="reveal" href="${esc(h)}"${attrs}>${esc(v)}</a>${drawer}</div>
        </section>`).join('\n        ')}
      </div>
      <ul class="lines-plain">
        ${lines.map(([key, k, v, h, attrs]) => `<li><span>${k}</span> <a href="${esc(h)}"${attrs}>${esc(v)}</a></li>`).join('\n        ')}
      </ul>
    </div>
    <p class="cx__readout" aria-live="polite" data-readout>Breaker open. Every line is locked.</p>

    <dl class="plate-info">
      <div><dt>Based in</dt><dd>${esc(P.location)}</dd></div>
      <div><dt>Start</dt><dd>${esc(P.availability)}</dd></div>
      <div><dt>Work status</dt><dd>${esc(P.visa)}</dd></div>
      <div><dt>Languages</dt><dd>${P.languages.map(l => esc(l.name)).join(', ')}</dd></div>
    </dl>
  </div>
</main>
<footer class="cx__foot">
  <a href="index.html#index">All work</a><a href="index.html#about">About</a>
</footer>
<script src="assets/js/pose.js" defer></script>
<script src="assets/js/contact.js" defer></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ write */
fs.mkdirSync(path.join(root, 'work'), { recursive: true });
// ?v=<hash of the file> on every local stylesheet and script, so browsers never show a stale build
const hashes = {};
const bust = html => html.replace(/((?:\.\.\/)?assets\/(?:css|js)\/[\w.-]+\.(?:css|js))(?:\?v=\w+)?"/g, (m, f) => {
  const file = f.replace(/^\.\.\//, '');
  hashes[file] ??= crypto.createHash('md5').update(fs.readFileSync(path.join(root, file))).digest('hex').slice(0, 8);
  return `${f}?v=${hashes[file]}"`;
});
projects.forEach((p, i) => fs.writeFileSync(path.join(root, 'work', p.slug + '.html'), bust(casePage(p, i))));

const indexFile = path.join(root, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');
for (const [name, body] of [['index', indexSection()], ['about', aboutSection()]]) {
  const re = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(<!-- /build:${name} -->)`);
  if (!re.test(html)) throw new Error('marker missing: build:' + name);
  html = html.replace(re, `$1\n  ${body}\n  $2`);
}
fs.writeFileSync(indexFile, bust(html));
fs.writeFileSync(path.join(root, 'contact.html'), bust(contactPage()));
console.log(`wrote ${projects.length} case pages, the contact page, and the index and about sections`);
