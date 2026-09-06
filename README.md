# Wobi — 바탕화면 위젯 앱

**바탕화면에 원하는 위젯을 그대로 올려두는, 무료 오픈소스 윈도우 위젯 앱**

시계, 할일 목록, 메모, 주식, 환율, 뽀모도로 타이머 등 32가지 위젯을 클릭 한 번으로 바탕화면에 배치하고 자유롭게 꾸밀 수 있습니다.

[![Platform](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows)](https://github.com/dortomyork09-cyber/Wobi/releases)
[![License](https://img.shields.io/badge/license-see%20LICENSE.md-lightgrey)](./LICENSE.md)
[![Release](https://img.shields.io/github/v/release/dortomyork09-cyber/Wobi)](https://github.com/dortomyork09-cyber/Wobi/releases)

[웹사이트](https://dortomyork09-cyber.github.io/Wobi/) · [다운로드](https://github.com/dortomyork09-cyber/Wobi/releases) · [Instagram](https://www.instagram.com/wcw_widget)

---

## 왜 Wobi인가요

- **완전 무료** — 결제, 구독, 계정 가입 전부 없음
- **오픈소스** — 코드 전체가 공개돼 있어서 뭘 하는 앱인지 직접 확인 가능
- **가벼움** — Electron 기반 단일 실행 파일(portable), 설치 과정 없이 바로 실행
- **커스터마이징** — 위젯마다 위치/크기 자유 배치, 필요한 것만 골라서 사용. 테마도 색상/모서리/블러까지 직접 골라서 나만의 커스텀 테마로 저장 가능. 위젯 배경에 내 사진/이미지도 넣을 수 있고, 위젯 하나하나마다 포인트 컬러도 따로 정할 수 있음
- **다중 모니터** — 모니터 여러 대를 써도 어느 화면에나 위젯 배치 가능
- **정렬 스냅 + 레이아웃 저장** — 드래그 중 자석처럼 정렬되고, 배치를 이름 붙여 저장했다가 언제든 불러오기
- **백업/복원** — 위젯 배치와 설정을 파일로 저장했다가 언제든 그대로 불러오기
- **방해금지 시간대** — 정해둔 시간엔 알람·타이머 알림을 조용히 넘어가기

## 위젯 목록 (32개)

| 카테고리 | 위젯 |
|---|---|
| 기본 | 시계, 달력, 링크, 월드클락 |
| 기록 | 할일, 메모, 습관, 카운터, 클립보드 |
| 정보 | 뉴스, 환율, 주식, 스포츠, 날씨 |
| 도구 | 타이머, 뽀모도로, 계산기, 단위변환, D-day, 번역기, 색상 피커, 그래프, 바로가기 런처, 화면 캡처/녹화, 알람, 게임 타이머 |
| 재미 | 명언, 주사위, 스네이크 게임, 2048, 지뢰찾기, 틱택토 |

## 스크린샷

![Wobi 스크린샷](./screenshot.png)

## 다운로드 및 실행

1. [Releases](https://github.com/dortomyork09-cyber/Wobi/releases) 페이지에서 최신 `Wobi-x.x.x.exe` (설치 파일) 다운로드
2. 실행 후 설치 마법사 따라 설치 (Windows SmartScreen 경고가 뜰 수 있음 — 서명되지 않은 소규모 오픈소스 앱이라 발생하는 정상적인 경고이며, 아래 안내를 참고). 설치가 끝나면 바탕화면·시작메뉴에 바로가기가 자동으로 생기고, 새 버전이 나오면 백그라운드에서 자동으로 업데이트됩니다.
3. 화면 상단의 **위젯** 버튼으로 원하는 위젯 추가 (설정에서 "컴퓨터 시작 시 자동 실행"도 켤 수 있어요)

Windows SmartScreen 경고가 걱정된다면, 이 저장소의 코드를 직접 확인하거나 [VirusTotal 스캔 결과](https://www.virustotal.com)로 안전성을 검증할 수 있습니다.

> **"추가 정보" 링크도 없이 그냥 차단된다면?** SmartScreen이 아니라 Windows 11의 **스마트 앱 제어(Smart App Control)** 때문일 수 있습니다. 이 기능은 서명되지 않은 앱을 우회 옵션 없이 원천 차단합니다. `Windows 보안 → 앱 및 브라우저 컨트롤 → 스마트 앱 제어`에서 끈 뒤 설치 파일을 다시 실행하면 됩니다. (Windows 11 최신 업데이트 기준으로 이후 다시 켤 수도 있습니다.) 참고로 이 기능은 윈도우11을 클린 설치한 PC에서만 기본적으로 평가 모드로 시작되며, 업그레이드로 설치된 PC에서는 기본 꺼짐 상태입니다.

## 소스에서 직접 빌드하기

```bash
git clone https://github.com/dortomyork09-cyber/Wobi.git
cd Wobi
npm install
npm start                # 개발 모드로 실행
npm run build             # portable exe 빌드 (dist 폴더에 생성됨, 설치 불필요)
npm run build:installer   # NSIS 설치형 exe 빌드 (설치 후 자동 업데이트 지원)
npm run build:all         # 위 두 개를 한 번에 빌드
```

> 설치형(NSIS) 빌드로 실행한 앱은 새 버전이 GitHub Releases에 올라오면 백그라운드로
> 자동 다운로드했다가 앱 재시작 시 적용합니다. portable exe는 구조상 자기 자신을
> 갈아끼울 수 없어서, 새 버전이 나왔다는 안내만 뜨고 다운로드 페이지로 안내합니다.

## 기술 스택

- [Electron](https://www.electronjs.org/)
- Vanilla JavaScript / HTML / CSS

## 라이선스

[LICENSE.md](./LICENSE.md) 참고

## 링크

- 웹사이트: https://dortomyork09-cyber.github.io/Wobi/
- Instagram: [@wcw_widget](https://www.instagram.com/wcw_widget)
- 이슈 / 버그 제보: [GitHub Issues](https://github.com/dortomyork09-cyber/Wobi/issues)
