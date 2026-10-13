# 하이노트(HighNote) 계획서 검수 — Grok 패스
작성: 2026-10-13 · 대상: HIGHNOTE_BRIEF.md · 범위: 해외 앱 비교 + 리스크 + 보완안
> 원칙: 확인된 사실만 쓰고 출처 URL을 붙였어요. 확인 못 한 항목은 "미확인"으로 표기했어요.

---
## 1. 해외 앱·웹사이트 조사 요약

| 서비스 | 플랫폼 | 핵심 기능 | 피드백 방식 | 음역 추적 | 게임화 | 가격 모델 | 출처 |
|---|---|---|---|---|---|---|---|
| **Singing Carrots** | 웹(브라우저), 모바일 웹, iOS 앱 | 무료 음역 테스트(약 1분)·음정 정확도 테스트·피치 모니터, 21주 코스, 호흡/지속음 훈련, MIDI 멜로디 가져오기, AI 코치 | 마이크 실시간 피치를 가상 피아노/오선에 표시 | 계정 생성 시 음역 측정 이력 시계열 저장, 5000+ 가수 음역 DB 비교 | 점수·경쟁 피치 트레이닝, "carrot points", AI 코치 주간 세션 한도 | 무료 도구 + 구독(Starter/Self‑Study/Guided), 연 약 $119.99~ | singingcarrots.com/range-test, /product-tiers, /docs/singing-carrots-ai-coach |
| **Yousician (Singing)** | iOS·Android·데스크톱 | 음역 캘리브레이션(편한 최저·최고음 "무리 없이"), 곡 자동 전조, 학습 경로(미션), Note Catcher·Chase the Notes 게임, 녹음·리뷰 | 실시간 피치+타이밍 | 캘리브레이션 결과로 연습 음역 조정 | 별·포인트·배수(3x→5x), 주간 활동 리포트 이메일 | 무료 체험 + 프리미엄 구독(가격 미확인) | support.yousician.com (calibrating/practice-play/learning path), yousician.com/singing |
| **Erol Singer's Studio** | iOS·Android | 72개 보이스 레슨 + 60개 음계/아르페지오/음정 연습, 사용자 연습 편집기(iOS) | 목표음 버블 + 내 피치 파란 선 | 자동 음역 감지("아" 지속), 수동 조정, 시간별 음역 추적, **2주마다 재측정 권장** | 별 1~3개, 단 **별 1개로도 진행 가능**·"무리하지 말라" 명시, 워밍업·쿨다운 레슨 필수 강조 | 초급 무료 + 구독 | erolstudios.com/SingersStudio-UserManual/my-vocal-range/, /faq/, /voice-lessons/ |
| **SWIFTSCALES** | iOS·Android | "피아노 앞 보컬 코치" 시뮬레이션, 초급~고급 내장 세션, 사용자 음계 패턴, 실시간 키·템포 조절, 루틴 클라우드 공유, 호흡 연습 카운트다운 | 기준음 반주 위주(피치 검출 피드백은 미확인) | 대시보드에 "부른 전체 음역" 표시 | 거의 없음 | 광고 기반 무료 + 1회 구매 | swiftscales.com, App Store id1079277628 |
| **Vanido** | iOS(현재 US 스토어 미제공) | 하루 3개 개인화 연습(민첩성·기초·흉성·두성), 녹음 리뷰 | 실시간 시각 피치 | 초기 캘리브레이션 | 별 3개·XP·레벨·스트릭("노래의 듀오링고") | 무료 + Unlimited | theverge.com(2017), bloomvocal.site/en/blog/vanido-review-2026 |
| **Simply Sing** | iOS·Android | AI 음역 체크로 곡 키 자동 조정, 가사 스크롤, 데일리 워밍업, 녹음 | 실시간 피치+타이밍 | 음역 체크(무료) | XP·난이도 | 구독(US $14.99/월 등 표기) | hellosimply.com/simply-sing, sing-help.hellosimply.com |
| **Vocal Pitch Monitor** | Android | 실시간 피치 그래프, 녹음·재생, 튜너, 화면 정지 | 피치 궤적 그래프 | 없음 | 없음(레슨·점수 없음) | 무료 | play.google.com (com.tadaoyamaoka.vocalpitchmonitor) |
| **Sing Sharp** | 웹/앱(세부 미확인) | 실시간 피치·호흡 감지, 음역 분석, 적응형 연습, 귀 훈련, 시연 영상, AI 튜터 | 실시간 피치 | 음역 분석 | 미확인 | 미확인 | singsharp.com/en |
| **Singeo** | 웹 | 영상 레슨·워밍업·코치 피드백·커뮤니티 | 실시간 피치 분석 없음(리뷰 기준) | — | — | 구독 | americansongwriter.com/singeo-review/ |

시사점: 시장 앱 대부분은 "음역 측정 → 범위 맞춤 연습 → 피치 시각 피드백 → 별/XP" 구조예요. **성구 전환(크랙) 계측, 발성 부하 예산(목 에너지), 주간 신규음 상한**을 게임 규칙으로 넣은 앱은 조사 범위에서 찾지 못했어요 → 계획서의 차별점은 유효해요.

---
## 2. 계획서와 비교

### 2.1 이미 잘 커버된 것
- 음역 측정·재측정(4주) — Yousician/Erol과 동등, "highestAbs 위 제시 금지"는 더 안전.
- 실시간 피치 시각 피드백, 유지 판정, 난이도 3단계 + 자동 조정 제안.
- 워밍업 필수 잠금(Erol은 권고만, 하이노트는 강제) · 쿨다운 · 자가체크 · 진료 권장 카드.
- 매일 스트릭 대신 주간 스트릭(과사용 방지) — Vanido식 매일 스트릭의 약점 보완.
- 오프라인·무서버·오디오 비저장(프라이버시) — 경쟁 앱 대비 강점.

### 2.2 빠졌거나 약한 것
| # | 항목 | 경쟁 앱 근거 | 계획서 상태 |
|---|---|---|---|
| G1 | **자기 소리 듣기(녹음 다시듣기)** | Vanido·Yousician·Vocal Pitch Monitor 모두 녹음/재생 제공 | 녹음 저장 금지 → 청각 자기 피드백 부재 |
| G2 | **기준음 반주형 스케일 루틴(5음 음계·아르페지오, 키 자동 상행)** | SWIFTSCALES·Erol 핵심 | 음계 등반은 반음 단위 단음 유지뿐 |
| G3 | 모음/발성 종류 가이드(립트릴·허밍·"우"·NG) 시연 | Erol 레슨, Sing Sharp 시연 영상 | 버블에 텍스트 팁만 |
| G4 | 목표 곡 연결(곡 최고음·자동 전조) | Yousician·Simply Sing·Singing Carrots 곡 음역 DB | 보스전(v2)에서만, 곡 DB 없음 |
| G5 | 호흡/지속음 훈련 | Singing Carrots Sustain & Breath, SWIFTSCALES 호흡 카운트다운 | 숨 길이 측정(선택)만 |
| G6 | 수동 음역 조정 | Erol: 버블 드래그로 수동 조정 | 자동 측정만 |
| G7 | 진행 강요 완화 문구 | Erol FAQ: "별 1개로 진행 가능, 무리 말라" | 하트 3개·실패 페널티 구조 → 무리 유발 가능 |
| G8 | 주간 리포트 | Yousician 주간 활동 리포트 | 기록 화면 주간 요약 있음(충분) |

### 2.3 리스크
1. **iOS Safari 오디오**: `echoCancellation:false`가 무시되거나(WebKit bug 179411), 마이크 캡처 중 출력이 이어피스로 라우팅/크래클(WebKit bug 326286), AudioWorklet+getUserMedia 왜곡 이력(WebKit PR 9711). → 콜앤리스폰스(기준음 재생↔마이크)에서 문제 가능. 계획서의 "기준음 구간 판정 제외"는 좋지만 **iOS 실기기 검증 매트릭스가 M1 AC에 없음**.
2. **피치 검출 정확도**: Vanido 사용자 리뷰에서 비브라토 오판·옥타브 오류·반음 오차 정답 처리 지적(bloomvocal 리뷰). 가성/두성 고음(약한 기음)·립트릴(진폭 변조)·허밍에서 clarity 0.90 기준이면 **유성음 탈락**이 잦을 수 있음 → 버블 90 s 완료가 안 될 위험. 립트릴 전용 clarity 임계값 필요.
3. **크랙 감지 오탐**: Δ2.5반음 점프 규칙은 의도적 슬라이드 끝·숨 끊김·자음과 구분 어려움. 사이렌 1회 6–8 s면 반음당 속도가 빠른 구간에서 정상 글라이드도 프레임 간 Δ가 커질 수 있음(수치 검증 필요).
4. **지연**: 60 ms AC는 캡처→렌더 기준. 블루투스 이어폰은 출력 지연 수백 ms가 흔해 콜앤리스폰스/이어폰 모드 판정 타이밍이 깨질 수 있음 → 유선/BT 구분 안내 필요.
5. **안전·책임**: 하트·콤보·보스전은 "힘으로 올리기"를 유도할 수 있음. 앱은 통증·긴장을 측정할 수 없음(밀어붙임 지표는 실험적). 고지문·청소년 사용·기존 성대 질환자 안내 보강 필요. "원장 검토" 전제는 좋음.
6. **목 에너지 120 s/일**: 근거 없음(계획서도 인정). 사용자 이탈 요인이 될 수 있어 베타에서 측정 필요.
7. **Slack 디자인 차용**: 브랜드 가드는 있으나 aubergine 사이드바 + `#` 채널형 목록 조합은 트레이드 드레스 혼동 소지 → 법률적 판단은 미확인, 색 조정 권장.

---
## 3. 보완 권고 (우선순위)

### MVP에 넣기 (P0)
1. **iOS/안드로이드 실기기 매트릭스를 M1 AC에 추가**: iPhone Safari(최신·직전 iOS), 안드 Chrome, 데스크톱 Chrome/Safari × 내장 스피커/유선/BT. `track.getSettings()` 결과·기준음 재생 중 피치 오염률 기록.
2. **기준음과 마이크 시분할 엄격화**: iOS에서는 기준음 재생 중 마이크 판정 제외(현행) + 출력 라우팅이 이어피스로 바뀌면 경고. BT 감지(가능 범위) 시 "유선 이어폰 권장" 안내.
3. **발성 종류별 유성음 임계값**: 립트릴/허밍 모드는 clarity 0.75~0.85 범위로 fixture 튜닝(값은 M1에서 실측 후 승인). 버블 완료 조건 실패율 지표화.
4. **진행 압박 완화(G7)**: 등반 실패 시 하트 소모 대신 "쉬고 다시" 선택지, 결과 화면에 "별/점수보다 편안함 우선" 문구(Erol FAQ 사례). 목표음 시도 후 짧은 휴식(예: 10 s) 강제.
5. **세션 내 즉시 다시듣기(G1, 저장 없음)**: 직전 시도 1회 메모리에만 보관→재생 후 폐기. "녹음 저장 금지" 원칙과 양립. 설정에서 끌 수 있게.
6. **수동 음역 보정(G6)**: 측정 결과 화면에서 comfortMax를 −1/−2만 내릴 수 있게(올리기는 금지).
7. **크랙 감지 검증 데이터**: 실제 남/여 발성 샘플(크랙 있음/없음 라벨) fixture를 M3 AC로 추가, 정밀도/재현율 목표 설정.

### v1.1~v2 (P1)
8. **스케일 루틴 게임(G2)**: 5음 음계(1-2-3-4-5-4-3-2-1)·옥타브 아르페지오, 반음씩 상행 후 하행, 상한 = comfortMax.
9. **발성 시연 오디오/애니메이션(G3)**: 립트릴·허밍·NG·빨대 짧은 시연(자체 제작).
10. **목표 곡 최고음 입력 → 남은 반음 표시 + 키 내림 제안(G4)**: 곡 DB 없이 사용자 입력만(저작권 회피).
11. **호흡/지속 미니게임(G5)**: 낮은 강도 지속음 시간 기록.
12. **익명 텔레메트리 없이 베타 피드백**: JSON 내보내기를 활용한 자발적 데이터 제출로 임계값 튜닝.

### 하지 않기 (확인)
- 곡 반주·랭킹·가수 비교는 비목표 유지 — 경쟁 앱과 정면 경쟁 회피, 안전 콘셉트 집중이 맞음.

---
## 4. 계획서 반영안 (추가/수정 문안)

**§2.2 C 음계 등반 — 추가**
- 하트 0 → 라운드 종료가 아니라 "오늘은 여기까지 좋아요" 휴식 카드. 목표음 시도 사이 최소 휴식 10 s(SAFETY 상수 후보 `TARGET_REST_SEC`, 원장 승인 필요).
- 직전 시도 다시듣기 버튼(메모리 버퍼, 화면 이탈 시 폐기).

**§2.2 F 스케일 루틴 (신규, v1.1)**
- 5음 음계/아르페지오를 기준음과 함께 반음씩 상행, comfortMax 초과 금지, 목 에너지 소모.

**§4.2 피치 검출 — 수정**
- `clarity` 임계값을 모드별로: `sustain 0.90 / lipTrill·hum TBD(실측)`.
- 비브라토 대응: 판정용 중앙값 외에 300 ms 창 평균 cents 병행 검토.

**§4.7 — 추가**
- BT 출력 감지 시 경고, iOS에서 출력 라우팅 변화 시 안내. 마이크 트랙은 세션 종료 시 `stop()`.

**§4.9 — 추가**
- 측정 후 comfortMax 하향 수동 조정 허용(상향 금지).

**§6 안전 — 추가 후보(원장 검토)**
- `TARGET_REST_SEC`, 18세 미만·성대 질환 이력자 안내 문구, 통증 1 이상 시 당일 고음 게임 종료 옵션.

**§9 마일스톤 AC — 추가**
- M1: 실기기 매트릭스 결과 표 `PROGRESS.md` 기록, 립트릴/허밍 fixture 유성 판정률 ≥ 목표치.
- M3: 크랙 라벨 fixture 정밀도·재현율 기록, 정상 글라이드 오탐률 기록.

**§7 디자인 — 권고**
- aubergine + `#` 채널형 사이드바 조합은 Slack 연상이 강함 → 주색을 자체 색으로 바꾸거나 `#` 접두 제거 검토.

---
## 5. 출처
- https://singingcarrots.com/singing-practice
- https://singingcarrots.com/range-test
- https://singingcarrots.com/product-tiers
- https://singingcarrots.com/docs/singing-carrots-ai-coach
- https://support.yousician.com/hc/en-us/articles/360000538869-Calibrating-for-your-vocal-range
- https://support.yousician.com/hc/en-us/articles/360000553289-Practice-and-Play-modes-in-singing
- https://support.yousician.com/hc/en-us/articles/360000550025-How-the-singing-learning-path-works
- https://yousician.com/singing
- https://www.erolstudios.com/singers-studio-voice-and-ear-training/
- https://www.erolstudios.com/SingersStudio-UserManual/my-vocal-range/
- https://www.erolstudios.com/SingersStudio-UserManual/faq/
- https://www.erolstudios.com/SingersStudio-UserManual/voice-lessons/
- https://apps.apple.com/us/app/erol-singers-studio/id502780186
- https://swiftscales.com/ · https://swiftscales.com/news/
- https://apps.apple.com/us/app/swiftscales-vocal-trainer/id1079277628
- https://www.theverge.com/circuitbreaker/2017/4/10/15246932/vanido-personal-singing-coach-app-range-voice-notes
- https://www.bloomvocal.site/en/blog/vanido-review-2026
- https://www.hellosimply.com/simply-sing
- https://sing-help.hellosimply.com/en/articles/12584694-what-can-i-access-for-free-in-simply-sing
- https://play.google.com/store/apps/details?id=com.tadaoyamaoka.vocalpitchmonitor
- https://singsharp.com/en
- https://americansongwriter.com/singeo-review/
- https://bugs.webkit.org/show_bug.cgi?id=179411
- https://bugs.webkit.org/show_bug.cgi?id=326286
- https://github.com/WebKit/WebKit/pull/9711
- https://samueleddy.com/writing/ios-safari-audio-sessions/
