# r/SideProject 게시용 최종본

## 올리기 전 체크
- [ ] 스크린샷 또는 5~10초 GIF 1장 필수로 첨부 (텍스트만 있으면 묻힘) — 바탕화면에 위젯 여러 개 예쁘게 배치한 화면 캡처 추천
- [ ] 계정이 너무 새 거면(카르마 낮음) 먼저 다른 글에 댓글 좀 달아서 계정 신뢰도 쌓고 올리기
- [ ] 평일 오전(한국시간 밤~새벽, 미국 기준 오전)에 올리는 게 노출 잘됨
- [ ] 댓글 달리면 최대한 빨리, 진솔하게 답변하기 (영어로) — 여기서 신뢰도 갈림

---

## Title (택1)

**옵션 A:**
I got tired of my empty Windows desktop, so I built a free widget app (31 widgets, open source)

**옵션 B:**
Built a free, open-source desktop widget app for Windows because I couldn't find one that wasn't bloated or paid

---

## Body (English — 레딧에 이걸 그대로 올리면 됨)

Hey r/SideProject,

I'm a solo developer from South Korea, and I've been building **Wobi** — a free desktop widget app for Windows.

It lets you drop things like a clock, to-do list, notes, D-day counter, weather, unit converter, quick launcher, currency/stock tickers, and even a few small games (2048, Minesweeper, Tic-Tac-Toe) directly onto your desktop, and arrange, resize, and theme them however you want. 31 widgets total right now, and growing.

**Why I built it:** every widget app I tried was either paid, full of ads, or so heavy it slowed my PC down just sitting on the desktop doing nothing. I wanted something light, completely free, and something I could keep shaping based on real feedback instead of a roadmap some company decided on. I started this alone, in my free time, mostly to scratch my own itch — and it slowly grew into something I wanted to actually ship and keep improving.

**Some things I'm proud of:**
- Fully free, no ads, no premium tier, no account required
- Open source — the entire codebase is public on GitHub
- Lightweight (Electron under the hood, but tuned so it barely touches CPU/RAM when idle)
- A "summon" shortcut (Alt+W) that briefly brings your widgets to the front over other windows, so you don't have to minimize everything just to check them
- Pin a single widget to always stay on top of other apps (browser, games, etc.)
- Gentle nudge notifications for unfinished to-dos and D-day items (fully optional, respects do-not-disturb hours)
- Installer now supports both Korean and English (auto-detects your OS language)

It's still a work in progress and I'm actively maintaining it, so I'd genuinely appreciate any feedback — bugs, rough edges, "this widget would be useful" ideas, anything.

Download / homepage: https://dortomyork09-cyber.github.io/Wobi/
GitHub: https://github.com/dortomyork09-cyber/Wobi

(Heads up: since I don't have a paid code-signing certificate yet as a solo dev, Windows SmartScreen may show a warning on first install. The full source is public if you want to check it yourself, and I've also run it through VirusTotal — 0/67 detections.)

Happy to answer anything about the tech stack (Electron) or what's coming next.

---

## Body (한국어 번역 — 참고용, 이해하기 편하라고 붙여둠)

안녕하세요 r/SideProject 여러분,

저는 한국에 사는 1인 개발자이고, **Wobi**라는 윈도우용 무료 데스크톱 위젯 앱을 만들고 있어요.

시계, 할일 목록, 메모, D-day 카운터, 날씨, 단위 변환기, 빠른 실행기, 환율/주식 시세, 그리고 작은 게임(2048, 지뢰찾기, 틱택토)까지 바탕화면에 바로 올려두고 원하는 대로 배치·크기조절·테마 적용을 할 수 있어요. 지금 위젯 31개고 계속 늘려가는 중입니다.

**왜 만들었냐면:** 써본 위젯 앱들이 죄다 유료거나, 광고 범벅이거나, 아무것도 안 해도 컴퓨터를 느리게 만들 정도로 무겁더라고요. 완전 무료면서 가볍고, 회사가 정한 로드맵이 아니라 실제 피드백 받아서 계속 다듬어갈 수 있는 걸 만들고 싶었어요. 처음엔 그냥 제 필요 때문에 혼자 여유시간에 시작한 거였는데, 하다보니 제대로 만들어서 계속 발전시키고 싶어졌어요.

**자랑하고 싶은 부분:**
- 완전 무료, 광고 없음, 유료 등급 없음, 계정 가입도 필요없음
- 오픈소스 — 코드 전부 깃허브에 공개
- 가벼움 (Electron 기반이지만 켜놓기만 했을 때 CPU/RAM 거의 안 먹게 튜닝함)
- 단축키(Alt+W)로 다른 창들 위에 위젯 화면을 잠깐 띄우는 "소환" 기능 — 확인하려고 다 최소화할 필요 없음
- 위젯 하나만 다른 프로그램(브라우저, 게임 등) 위에 항상 떠있게 고정 가능
- 안 끝낸 할일/D-day 부드럽게 알려주는 알림 (완전 선택사항, 방해금지 시간대엔 안 옴)
- 설치 프로그램이 이제 한국어/영어 둘 다 지원 (OS 언어 자동 감지)

아직 계속 만들어가는 중이고 꾸준히 관리하고 있어서, 버그든 거친 부분이든 "이런 위젯 있으면 좋겠다" 같은 의견이든 뭐든 피드백 정말 환영합니다.

다운로드/홈페이지: https://dortomyork09-cyber.github.io/Wobi/
깃허브: https://github.com/dortomyork09-cyber/Wobi

(참고: 1인 개발자라 아직 유료 코드서명 인증서가 없어서 설치할 때 윈도우 SmartScreen 경고가 뜰 수 있어요. 코드는 전부 공개돼있어서 직접 확인 가능하고, VirusTotal 검사에서도 67개 보안업체 전부 탐지 없음으로 나왔습니다.)

Electron 기술스택이나 다음 계획에 대해서도 편하게 물어보셔도 됩니다.

---

## 예상 댓글 & 답변 (English 답변 + 한국어 참고 번역)

**Q1. "SmartScreen 경고 뜨는데 안전함?" / "Is this safe? SmartScreen is warning me."**

영어 답변:
> Yeah, totally understand the hesitation — I'm a solo dev without a paid code-signing cert yet, so Windows flags unsigned installers by default regardless of what's actually inside them. The full source is public on GitHub if you want to check, and it's scanned clean on VirusTotal (0/67). Planning to get a proper cert once there's more traction to justify the cost.

한국어 번역:
> 네, 그 걱정 충분히 이해해요 — 저는 아직 유료 코드서명 인증서가 없는 1인 개발자라, 실제 내용물이랑 상관없이 윈도우가 서명 안 된 설치파일은 기본적으로 경고를 띄워요. 원하시면 깃허브에서 전체 소스코드 확인 가능하고, VirusTotal 검사에서도 67개 보안업체 전부 탐지 없음이었어요. 어느 정도 트래픽이 쌓이면 제대로 된 인증서 구매할 계획입니다.

**Q2. "왜 Electron이야, 너무 무겁지 않아?" / "Why Electron, isn't that heavy?"**

영어 답변:
> Fair point — Electron does have some inherent overhead, but since the app is just sitting idle on the desktop most of the time (not constantly re-rendering), memory/CPU usage stays low in practice. I've spent a fair amount of time specifically tuning that. Might explore a lighter native rewrite down the line if it grows enough to justify the effort.

한국어 번역:
> 맞는 지적이에요 — Electron 자체가 어느 정도 오버헤드는 있어요. 근데 이 앱은 대부분의 시간에 바탕화면에 그냥 가만히 떠있는 상태라(계속 다시 그리는 게 아니라), 실제로는 메모리/CPU 사용량이 낮게 유지돼요. 이 부분 튜닝하는 데 시간 꽤 썼습니다. 나중에 앱이 더 커지면 더 가벼운 네이티브로 다시 만드는 것도 고려는 하고 있어요.

**Q3. "Mac/Linux 버전은?" / "Any Mac/Linux version?"**

영어 답변:
> Windows-only for now — that's the OS I actually use daily and wanted to fix this problem for. If there's enough interest I'd consider porting it.

한국어 번역:
> 지금은 윈도우 전용이에요 — 제가 매일 쓰는 OS라 이 문제를 직접 해결하고 싶었거든요. 관심 많으면 다른 OS로도 포팅하는 거 고려해볼게요.

**Q4. "왜 한국 시장 전용 위젯(환율/주식/날씨)이 있어?" / "Why do exchange rate/stock/weather widgets seem Korea-specific?"** *(나올 수도 있는 질문이라 미리 준비)*

영어 답변:
> Good catch — a few widgets (exchange rate, stock, weather) were originally built around Korean data sources since that's what I use daily. They still work fine once added, they're just not offered as options for new installs outside Korean mode right now. Open to hearing what data sources would make sense for a wider audience if there's demand.

한국어 번역:
> 좋은 지적이에요 — 환율/주식/날씨 몇몇 위젯은 제가 매일 쓰는 한국 데이터 소스 기준으로 처음 만들었어요. 이미 추가한 사람한텐 그대로 잘 작동하고, 지금은 그냥 한국어 모드가 아닐 때 새로 추가하는 옵션에서만 빠져있는 거예요. 수요 있으면 더 넓은 사용자층에 맞는 데이터 소스도 고민해볼게요.
