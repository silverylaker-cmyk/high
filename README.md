# 하이노트(HighNote) — 고음 연습 웹앱 MVP

마이크로 목소리 높이를 실시간으로 재며 **편한 음역 안에서** 한 음씩 정확하게 내는 연습을 하는 웹앱이에요.
교육·연습용이며 의료 서비스가 아니에요. 녹음은 저장·전송하지 않고, 측정 수치만 브라우저(IndexedDB)에 저장해요.

계획서: [`docs/PLAN.md`](docs/PLAN.md) (§11 검수 반영 사항 우선) · 진행 기록: [`docs/PROGRESS.md`](docs/PROGRESS.md) · 이미지 프롬프트: [`docs/image-prompts.md`](docs/image-prompts.md)

## 실행

필요: Node.js 20.19 이상(22 권장), npm 10 권장.

```bash
npm install          # npm 9에서 의존성 트리 오류가 나면: npx npm@10 install
npm run dev          # 개발 서버 http://localhost:5173
npm run build        # 타입체크 + 프로덕션 빌드(dist/)
npm run preview      # 빌드 결과 미리보기 http://localhost:4173
npm test             # 단위·컴포넌트 테스트(Vitest)
npm run e2e          # 스모크 E2E(Playwright, 가짜 마이크 입력). 시스템 Chrome 사용
```

- `npm run e2e`는 기본으로 `/usr/bin/google-chrome`을 써요. 다른 경로면 `CHROME_PATH=/path/to/chrome npm run e2e`.
  Playwright 번들 브라우저를 쓰려면 `npx playwright install chromium` 후 `CHROME_PATH=` 를 비워 실행하세요.
- 마이크는 **HTTPS 또는 localhost**에서만 열려요. 휴대폰에서 시험하려면 HTTPS로 배포하거나(GitHub Pages)
  `npm run dev -- --host`에 HTTPS 프록시를 붙여야 해요.
- 개발 도구: 앱 안 `#/dev/pitch`(실시간 Hz·MIDI·cents·clarity·dB, 실제 마이크 설정, 내부 지연 P50/P95), `#/dev/ui`(컴포넌트 카탈로그).

## 배포

`main`에 푸시하면 `.github/workflows/deploy.yml`이 테스트·빌드 후 GitHub Pages에 올려요(저장소 Settings → Pages → Source를 "GitHub Actions"로 설정 필요).
`base: './'` + HashRouter라 하위 경로(`/high/`)에서도 동작해요.

## 구조

```
src/
  app/        AppShell(모바일 하단 탭·데스크톱 사이드바), 라우트, 상태 저장소(zustand), 서비스워커 등록
  audio/      engine(마이크·생명주기 복구), mic(권한 실패 분류), worklet/capture-processor, pitch.worker,
              pitchCore(pitchy), pitchTrack(유성 판정·중앙값·옥타브 가드), noteMath, synth
  analysis/   hold(유지 판정), breaks(추적 끊김), gate(기준음 판정 제외), rangeTest, ceiling(상한 분리), difficulty, evaluate
  games/      engine(canvas·루프), bubble, siren, climber
  meta/       xp, streak, energy, collection, quests, achievements, coach, dates
  safety/     config(§6 상수·검수 정책), rules
  data/       db(Dexie), exportImport
  design/     tokens.css, global.css, components/
  copy/       ko.ts(모든 사용자 문자열)
  screens/    S1–S12, dev/
tests/        unit/, ui/, e2e/, fixtures/(합성 신호, e2e용 WAV, voice/ 실제 발성 자리)
```

## 검수 결정 반영 요약

| 결정 | 구현 |
|---|---|
| D1 자동 고음 확장 보류 | `analysis/ceiling.ts`: 관측 최고음·편한 상한·연습 목표·획득 기록 분리. 상한은 낮추기만(측정 결과·내 음역 화면). 재측정이 높게 나와도 상한 유지. 등반 목표음 = 상한(+1 없음) |
| D2 크랙·전환점·push 제외 | 끊김은 원시값 기준으로 세어 '음정 추적 끊김(원인 미확인, 점수에 반영 안 함)'으로만 표시. 콤보 리셋·매끈 보너스·전환 구간 집중 모드 없음. 편한 최고음 측정 시작점은 `highestAbs − 5` |
| D3 증상 중단·모바일 오디오 복구 우선 | 시작 전 상태 확인(증상 시 버블·쿨다운까지 잠금), 모든 게임·측정에 '불편해요/그만하기', 라운드 사이 상태 확인, AudioContext `statechange`·track `mute/ended`·`visibilitychange`·`pagehide/pageshow`·`devicechange` → 판정 중지 후 사용자 탭으로 재개(필요 시 stream 재생성·소음 재측정), 권한 실패 8가지 구분 |
| D4 진행 압박 완화 | 하트 0 → "오늘은 여기까지 좋아요" 휴식 카드, 결과마다 "점수보다 편안함이 먼저예요", 신호 불량은 '측정 불가'로 하트·실패에 반영 안 함 |
| D5 비목표 유지 | 반주·랭킹·가수 비교·로그인·녹음 업로드 없음 |
