# Lighthouse / offline — 2026-10-14 (Asia/Seoul)

URL: https://silverylaker-cmyk.github.io/high/
Form factor: mobile (Lighthouse 13.5, headless Chrome)

## Scores
- Performance: 84
- Accessibility: 93 (goal ≥ 90 met)
- Best Practices: 100
- SEO: 100
- PWA category: removed in Lighthouse 13; checked separately below

## Key metrics
- FCP 2.0 s · LCP 3.7 s · TBT 0 ms · CLS 0.127 · SI 2.0 s · TTI 3.7 s

## Accessibility fails (weighted)
- aria-prohibited-attr: `div.bar` with aria-label and no role (onboarding step indicator)
- landmark-one-main: no `<main>` landmark

## Offline / SW (Playwright)
- service worker active at scope `/high/`
- caches: workbox-precache-v2-…, fonts
- offline reload: success, HTTP 200, title 하이노트
