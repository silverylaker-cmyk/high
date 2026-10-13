# 이미지 에셋 프롬프트 기록

모든 이미지는 아래 명령 형식으로 Codex(`codex exec --skip-git-repo-check --sandbox workspace-write`)의 이미지 생성 도구에 맡겨 만들었다.
각 프롬프트 끝에는 "이미지 생성 도구로 이 이미지를 만들어 <저장경로>에 저장하라."를 붙였다. 생성 원본(1024 px 안팎)은 Pillow로 크기를 줄이고 색을 양자화해 용량을 줄였다(아이콘 192/512, 마스코트 512/256 등).
브랜드 가드(§7.7): Slack 로고·해시 마크와 닮지 않게, 그라디언트 없이 단색 면으로 요청했다.

| 파일 | 용도 | 결과 |
|---|---|---|
| `public/images/mascot.png`, `mascot-256.png` | 음계 등반 캐릭터, 빈 화면 | 생성 성공(투명 배경) |
| `public/images/onboarding-hero.png` | 온보딩 환영 일러스트 | 생성 성공 |
| `public/images/rest-card.png` | 휴식 카드(하트 0·불편해요·에너지 소진) | 생성 성공 |
| `public/icons/icon-192.png`, `icon-512.png` | PWA·파비콘 | 생성 성공(원본 1024 px에서 축소) |
| `public/images/coach-avatar.png` | 코치 피드 아바타 | 생성 성공 |

## 프롬프트

## mascot → public/images/mascot.png
Original cute mascot character for a Korean singing-practice app called HighNote: a small round music-note character (an eighth note shape with a single flag) with a soft rounded body, two tiny dot eyes, a small happy open mouth as if singing, and short stubby arms and legs, standing upright in a friendly pose. Flat vector illustration style with solid color fills only and no gradients, no outlines thicker than 4px, no text. Body color deep aubergine purple #4A154B, flag accent in teal-blue #36C5F0, cheeks soft pink #FFB6BD. Fully transparent background, centered, square 1024x1024 PNG, generous padding. Must not resemble Slack, any existing brand logo, hashtag mark, or existing mascot

## hero → public/images/onboarding-hero.png
Wide flat vector illustration for the onboarding screen of a Korean vocal practice web app: a friendly adult (gender-neutral, simple faceless style) sitting relaxed on a cushion wearing wired earphones and holding a smartphone, with soft floating musical notes and gentle rising sound-wave lines climbing like small steps toward the upper right. Calm, warm, encouraging mood. Solid flat color shapes only, absolutely no gradients, no text, no logos. Palette: warm off-white background #F4EDE4, aubergine #4A154B, teal #2392A2, light aqua #78D7DD, butter yellow #FFD57E, peach #FED4BE, coral #F2606A. Landscape 1536x1024 PNG

## rest → public/images/rest-card.png
Flat vector illustration for a 'rest is good' card in a voice practice app: a small round music-note mascot character (aubergine purple #4A154B body, teal flag #36C5F0) lying peacefully on a soft cloud-shaped pillow with a steaming cup of warm tea beside it and a tiny crescent moon above. Cozy, calm, reassuring mood that frames resting as positive, not as punishment. Solid flat color fills only, no gradients, no text, no logos. Background solid warm off-white #F4EDE4. Square 1024x1024 PNG

## icon → public/icons/icon-source.png
App icon for a Korean singing practice app named HighNote: a simple bold white rising staircase of three rounded steps with a small white music note on the top step, centered on a solid flat aubergine purple #4A154B square background filling the entire canvas edge-to-edge (no rounded corners, no border, maskable-safe: keep the symbol within the central 60 percent). Flat design, solid colors only, no gradients, no text, no shadows. Must not resemble the Slack logo or a hashtag mark. Square 1024x1024 PNG

## coach → public/images/coach-avatar.png
Small circular-friendly avatar portrait of a coach character for a voice practice app, called 'Hi Coach': an original round music-note mascot face (aubergine #4A154B) wearing a tiny whistle on a teal #36C5F0 cord, smiling warmly, shown from chest up and centered. Flat vector, solid fills, no gradients, no text, no logos. Solid warm off-white #F4EDE4 background filling the whole square. Square 512x512 PNG

