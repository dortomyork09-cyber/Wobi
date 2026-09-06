# r/SideProject 게시용 (자연스러운 톤)

## Title

I got tired of my empty Windows desktop, so I built a free widget app (31 widgets, open source)

## Body (English)

Hey everyone,

I'm a solo developer based in South Korea. For the past while I've been working on **Wobi**, a free desktop widget app for Windows, and I figured I'd finally share it here.

The whole thing started because my desktop was just... empty. No matter what I searched for, the widget apps out there were either paid, stuffed with ads, or so heavy they'd noticeably slow my PC down just sitting there doing nothing. So I started building my own version, mostly just for myself, in whatever spare time I had. It slowly turned into something bigger than I expected — right now it has 31 widgets (clock, to-do list, notes, D-day counter, weather, unit converter, a quick app launcher, currency/stock tickers, even a couple of tiny games like 2048 and Minesweeper), and you can arrange, resize, and theme all of it however you want.

A few things I care about with this project: it's completely free, no ads, no premium tier, no account needed. The code is fully open source on GitHub. And since Electron apps have a reputation for being heavy, I spent a good chunk of time making sure it stays light when it's just idling on your desktop.

There's a shortcut (Alt+W) that briefly pulls your widgets to the front over whatever else you're doing, so you don't have to minimize everything just to glance at them. You can also pin a single widget to always float above other apps, and there's an optional gentle nudge for unfinished to-dos or upcoming D-days if you want that kind of thing.

This is still very much a work in progress, and I'm the only one building and maintaining it, so I know there are rough edges. I'd really appreciate any feedback — bugs, things that feel clunky, or widget ideas you'd actually use.

Homepage: https://dortomyork09-cyber.github.io/Wobi/
GitHub: https://github.com/dortomyork09-cyber/Wobi

One heads-up: since I don't have a paid code-signing certificate as a solo dev, Windows SmartScreen might throw a warning on first install. Totally understand the hesitation there — the source is public if you want to check it yourself, and it came back clean on VirusTotal (0/67).

Happy to talk about the tech stack or what I'm planning next if anyone's curious.

---

## 한국어 번역 (참고용)

안녕하세요,

저는 한국에 사는 1인 개발자입니다. 얼마 전부터 윈도우용 무료 데스크톱 위젯 앱 **Wobi**를 만들어왔는데, 이제 여기에도 한번 공유해보려고요.

시작은 단순했어요 — 제 바탕화면이 그냥... 텅 비어있었거든요. 뭘 찾아봐도 위젯 앱들은 죄다 유료거나, 광고로 도배돼있거나, 아무것도 안 하고 그냥 켜놓기만 해도 컴퓨터가 눈에 띄게 느려질 정도로 무겁더라고요. 그래서 그냥 제가 쓸 거 하나 만들자 싶어서, 여유시간에 조금씩 시작했어요. 하다 보니 생각보다 커져서, 지금은 위젯이 31개예요(시계, 할일 목록, 메모, D-day 카운터, 날씨, 단위 변환기, 빠른 실행기, 환율/주식 시세, 심지어 2048이나 지뢰찾기 같은 미니 게임까지). 다 원하는 대로 배치하고, 크기 조절하고, 테마도 입힐 수 있어요.

이 프로젝트에서 신경 쓴 부분들이 있는데요 — 완전 무료고, 광고 없고, 유료 등급도 없고, 계정 가입도 필요 없어요. 코드는 깃허브에 전부 공개돼있고요. Electron 앱이 무겁다는 얘기가 많아서, 바탕화면에 그냥 켜놓고 있을 때 가볍게 유지되도록 시간 꽤 들였어요.

단축키(Alt+W)로 다른 작업 위에 위젯을 잠깐 띄울 수 있어서, 확인하려고 다 최소화할 필요가 없어요. 위젯 하나만 다른 프로그램 위에 항상 떠있게 고정할 수도 있고, 원하면 안 끝낸 할일이나 다가오는 D-day를 부드럽게 알려주는 기능도 있어요(선택사항이에요).

아직 계속 만들어가는 중이고, 저 혼자 개발·관리하고 있어서 거친 부분들이 분명 있을 거예요. 버그든, 어색한 부분이든, "이런 위젯 있으면 좋겠다" 하는 아이디어든 뭐든 피드백 정말 환영합니다.

홈페이지: https://dortomyork09-cyber.github.io/Wobi/
깃허브: https://github.com/dortomyork09-cyber/Wobi

참고로, 1인 개발자라 아직 유료 코드서명 인증서가 없어서 처음 설치할 때 윈도우 SmartScreen 경고가 뜰 수 있어요. 그 걱정 충분히 이해해요 — 원하시면 소스코드 직접 확인 가능하고, VirusTotal 검사에서도 67개 보안업체 전부 탐지 없음으로 나왔어요.

기술 스택이나 앞으로 계획 궁금하신 분 있으면 편하게 물어보셔도 됩니다.
