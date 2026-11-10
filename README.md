# Badr Albdulmajeed: engineering portfolio

The portfolio of Badr Albdulmajeed, an electrical and electronic engineer (B.Eng (Hons), APU 2026) based in
Sharjah, UAE. It covers his work in power-system protection, Siemens PLC automation, machine vision and
embedded hardware.

It is a static site: plain HTML, CSS and JavaScript, with no framework and no runtime dependencies. A small
Node script generates the project pages from one data file.

## What is on the site

- **Home page:** a scroll-driven film. A greeting video becomes a camera move through the workshop and
  into the inspection software. Four pinned chapters follow:
  - PCB and wood defect inspection
  - a fault-recorder scope
  - a relay grading study
  - a sensor-to-PLC signal path

  Below the chapters sit the full project index and the About section.
- **40 project pages:** generated from `data/data.json`. Each page has a drawing of its field, the record
  of the project, and a pager with Badr's avatar.
- **Page transitions:** a different one for each field. Vision pages scan, protection pages trip and
  re-energise, automation pages ride a conveyor, embedded pages route traces, signals pages sweep like a
  scope, software pages open like a window. This uses cross-document view transitions, so it runs in
  Chrome and Edge; other browsers simply change page.
- **Contact page:** a small switchboard. Each contact line is locked until the visitor works its control
  (slide an isolator, turn a selector or hold a pushbutton), or closes the main breaker. Every control
  also works from the keyboard.

## Project structure

```text
index.html              home page (hand-written; the index and About sections are generated into it)
contact.html            generated, not committed (it holds the contact details)
work/                   generated project pages, not committed
data/data.json          all content: projects, experience, skills, certificates, questions
data/images.json        width and height of every image (for layout stability)
tools/build.mjs         the generator (Node 22+, no packages)
assets/css/             site.css (home and shared), case.css (project pages), contact.css
assets/js/              main.js (home film), case.js, contact.js, pose.js (avatar playback)
assets/vendor/gsap/     GSAP 3.15 with ScrollTrigger and SplitText, used by the home page only
assets/avatar/          the greeting video and the avatar animations
assets/img/             project and certificate images (each with -400 / -800 variants)
.github/workflows/      builds and publishes the site on every push to main
```

## Run it locally

You need Node 22 or newer, and any static file server.

1. Copy the example settings file, then put your contact details in `.env`:

   ```bash
   cp .env.example .env
   ```

2. Generate the project pages, the contact page and the index and About sections:

   ```bash
   node tools/build.mjs
   ```

3. Serve the folder over HTTP:

   ```bash
   python -m http.server 8110
   ```

4. Open http://localhost:8110.

Opening `index.html` straight from disk will not work properly. The avatar animations and the page
transitions need the pages to come from a server.

## Change the content

- **Text, projects, skills and certificates:** edit `data/data.json`, then run `node tools/build.mjs`. The
  script rewrites every page in `work/`, `contact.html`, and the parts of `index.html` between the
  `<!-- build:index -->` and `<!-- build:about -->` markers. Edit the data, not those parts of the HTML.
- **A new image:** add it to `assets/img/` and add its size to `data/images.json`. Optional
  `name-400.webp` and `name-800.webp` versions are picked up automatically.
- **Stale styles:** every page links its CSS and JS with a content hash (`site.css?v=…`), so browsers
  always load the latest build.
- **Notes in the data:** `needsInput` entries in `data.json` list material still to supply. They are never
  shown on the site.

## Contact details and privacy

The email address and phone number are kept out of the repository:

- On your computer they live in `.env`, which `.gitignore` excludes.
- On GitHub they live in two repository secrets: `CONTACT_EMAIL` and `CONTACT_PHONE`.
- The build reads them from either place. The phone number also gives the call and WhatsApp links.
- `contact.html` is generated from them and is never committed.

Once the site is published, these details are public on the contact page by design. The CV PDF in
`assets/` also contains them.

## Publish on GitHub Pages

1. Create a repository and push this folder to its `main` branch.
2. Add the two secrets under **Settings → Secrets and variables → Actions → New repository secret**:
   - `CONTACT_EMAIL`, for example `name@example.com`
   - `CONTACT_PHONE`, written as it should appear, for example `+971 50 000 0000`
3. Under **Settings → Pages**, set **Source** to **GitHub Actions**.
4. Push to `main`, or run the **Publish site** workflow from the **Actions** tab.

The workflow builds the pages and copies the public files (`index.html`, `contact.html`, `work/`,
`assets/`) into `_site`. Only `_site` is published.

## Browser support

The site is tested in Chrome at 1440 px and 390 px. It works in any current browser. Page transitions need
Chromium-based browsers. Elsewhere, pages simply change, and everything still works.

Motion is always on, whatever the system's animation setting. Without JavaScript every page is still
fully readable, and the contact page lists all lines plainly.

## Credits and licences

- **Typeface:** Schibsted Grotesk, under the SIL Open Font License (`assets/fonts/OFL.txt`).
- **Animation:** [GSAP](https://gsap.com) by GreenSock, under its standard no-charge licence.
- **Photographs, project images, certificates, the CV and the avatar animations:** © Badr Albdulmajeed,
  all rights reserved.
- **Code:** © Badr Albdulmajeed, all rights reserved. No open-source licence is granted.
