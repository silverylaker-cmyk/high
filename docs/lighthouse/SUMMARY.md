# Lighthouse / offline — 2026-10-14 (Asia/Seoul)

URL: https://silverylaker-cmyk.github.io/high/
Form factor: mobile (Lighthouse 13.5, headless Chrome)

## Scores (post a11y fix recheck, 11:18 KST)
- Performance: 82
- Accessibility: 100 (was 93 before morning progressbar/main fix)
- Best Practices: 100
- SEO: 100
- PWA category: removed in Lighthouse 13; checked separately below

## Key metrics
- FCP 2.0 s · LCP 3.8 s · TBT 10 ms · CLS 0.127 · SI 2.0 s

## Accessibility
- No failing audits after `role="progressbar"` and `<main>` landmark fixes on onboarding/play/range.

## Offline / SW (Playwright, earlier same day)
- service worker active at scope `/high/`
- caches: workbox-precache-v2-…, fonts
- offline reload: success, HTTP 200, title 하이노트
