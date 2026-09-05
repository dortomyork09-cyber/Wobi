const { app, BrowserWindow, screen, ipcMain, dialog, shell, desktopCapturer, clipboard, Notification } = require('electron')
const path = require('path')
const https = require('https')
const fs = require('fs')

// electron-updater는 NSIS 설치형 빌드에서만 의미가 있고(포터블 exe는 원리상
// 자기 자신을 자동으로 갈아끼울 수 없음), package.json에 새로 추가한
// 의존성이라 아직 npm install을 안 했으면 require가 실패할 수 있다.
// 그런 경우에도 앱 자체는 정상 동작해야 하므로 통째로 try/catch로 감싼다.
let autoUpdater = null
try {
  autoUpdater = require('electron-updater').autoUpdater
} catch (e) {
  autoUpdater = null
}

// electron-builder가 포터블 exe로 실행될 때는 이 환경변수를 자동으로 심어준다.
// 이 값이 있으면 "지금 포터블로 실행 중"이라는 뜻이라, 진짜 자동 업데이트
// 대신 기존의 "새 버전 나왔어요" 안내 다이얼로그로 넘어간다.
const isPortableBuild = !!process.env.PORTABLE_EXECUTABLE_DIR

// ==========================================
// 성능: GPU 셰이더 디스크 캐시 비활성화
// ==========================================
// 일부 윈도우 환경(특히 계정 폴더 권한이 꼬였거나 백신이 잠그는 경우)에서
// 크로미움이 GPU 셰이더 컴파일 결과를 디스크에 캐시하려다 실패하면서
// "Unable to create cache" 류의 로그가 반복 발생하고, 그때마다 재시도하느라
// 초기 렌더링(창이 실제로 뜨기까지)이 느려지는 사례가 있다.
// GPU 가속 자체(위젯의 블러 효과 등)는 그대로 쓰되, 디스크에 캐시만 안 남기게
// 해서 이 지연 요인을 없앤다. app이 ready 되기 전에 호출해야 적용된다.
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')

let win = null
// "항상 위에 표시"로 핀한 위젯마다 따로 뜨는 아주 작은 전용 창들.
// 위젯 id → 그 위젯만 담은 BrowserWindow.
const pinnedWindows = {}
// 핀 위젯 창 안쪽 여백(px). index.html의 PIN_MARGIN 상수와 반드시 같은 값을
// 유지해야 한다 — 창 크기와 위젯이 꽉 채우는 크기가 서로 어긋나면 위젯 주변에
// 빈 여백이 남거나 잘리는 것처럼 보인다.
const PIN_MARGIN = 24

// ==========================================
// 에러 로그
// ==========================================
// 앱이 죽거나 예상 못한 에러가 나면 로그 파일에 남긴다.
// 로그 남기는 과정 자체에서 에러가 나도 앱은 계속 돌아가야 하므로
// 이 파일 안의 모든 동작은 try/catch로 감싼다.

function getLogPath() {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs')

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    return path.join(logDir, 'error.log')
  } catch (e) {
    return null
  }
}

// toISOString()은 항상 UTC라서 로그 볼 때 실제 시각이랑 안 맞아서 헷갈림 —
// 여기 시스템(사용자 PC)의 로컬 시간대 기준으로 찍히도록 직접 포맷한다.
function localTimeString() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
    p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' +
    String(d.getMilliseconds()).padStart(3, '0')
}

function logError(context, err) {
  try {
    const logPath = getLogPath()
    if (!logPath) return

    const time = localTimeString()
    const message = err && err.stack ? err.stack : String(err)
    const line = `[${time}] [${context}] ${message}\n`

    fs.appendFileSync(logPath, line)

    // 로그 파일이 너무 커지면 잘라낸다 (1MB 넘으면 초기화)
    const stat = fs.statSync(logPath)
    if (stat.size > 1024 * 1024) {
      fs.writeFileSync(logPath, line)
    }
  } catch (e) {
    // 로그 자체가 실패해도 무시 — 앱 동작에 영향 주면 안 됨
  }

  // ── 임시 디버그용 미러 로그 ──
  // 정식 로그는 app.getPath('userData')(AppData\Roaming\...) 밑이라 원격으로
  // 못 읽는 상황이라, npm start(패키징 안 된 상태)로 돌릴 때는 __dirname이
  // 곧 프로젝트 폴더(C:\WCW)라서 거기에도 같은 줄을 하나 더 남긴다.
  // 패키징된(설치된) 앱에서는 __dirname이 asar 내부라 쓰기가 실패하는데,
  // 그래도 try/catch로 감쌌으니 조용히 무시되고 앱 동작엔 영향 없다.
  try {
    const debugPath = path.join(__dirname, 'wesk-debug.log')
    const time2 = localTimeString()
    const message2 = err && err.stack ? err.stack : String(err)
    fs.appendFileSync(debugPath, `[${time2}] [${context}] ${message2}\n`)
  } catch (e) {}
}

// logError는 "에러"만 남기는데, 지금은 에러가 아니라 정상 진행 상황도 같이
// 봐야 확인이 되는 상황(단축키가 등록은 됐는지, 눌렸을 때 핸들러까지
// 들어오긴 하는지)이라 별도로 가벼운 디버그 로그도 하나 만든다. main.js
// 안에서만 쓰고, 위 logError와 마찬가지로 __dirname(C:\WCW) 밑에 남긴다.
function debugLog(msg) {
  try {
    const debugPath = path.join(__dirname, 'wesk-debug.log')
    fs.appendFileSync(debugPath, `[${localTimeString()}] [debug] ${msg}\n`)
  } catch (e) {}
}

process.on('uncaughtException', (err) => {
  logError('uncaughtException', err)
})

process.on('unhandledRejection', (reason) => {
  logError('unhandledRejection', reason)
})

// ==========================================
// 새 버전 확인 (가벼운 버전 체크만, 자동 다운로드/교체는 안 함)
// ==========================================
// portable exe라 electron-updater식 완전 자동 업데이트는 안전하게 지원되지 않아서
// 대신 깃허브 최신 릴리즈랑 버전만 비교해서 알림창만 띄워준다.

function isNewerVersion(latest, current) {
  try {
    const l = String(latest).split('.').map(n => parseInt(n, 10) || 0)
    const c = String(current).split('.').map(n => parseInt(n, 10) || 0)

    for (let i = 0; i < Math.max(l.length, c.length); i++) {
      const a = l[i] || 0
      const b = c[i] || 0
      if (a > b) return true
      if (a < b) return false
    }

    return false
  } catch (e) {
    return false
  }
}

function getVersionFilePath() {
  try {
    return path.join(app.getPath('userData'), 'last-version.json')
  } catch (e) {
    return null
  }
}

function notifyIfJustUpdated() {
  try {
    const verPath = getVersionFilePath()
    if (!verPath) return

    const currentVersion = app.getVersion()
    let lastVersion = null

    if (fs.existsSync(verPath)) {
      try {
        const raw = fs.readFileSync(verPath, 'utf-8')
        const parsed = JSON.parse(raw)
        lastVersion = parsed && parsed.version ? String(parsed.version) : null
      } catch (e) {
        lastVersion = null
      }
    }

    if (lastVersion && lastVersion !== currentVersion) {
      try {
        if (Notification.isSupported()) {
          new Notification({
            title: 'Wesk 업데이트 완료',
            body: `v${lastVersion} -> v${currentVersion}(으)로 업데이트됐어요.`,
            icon: path.join(__dirname, 'icon.png')
          }).show()
        }
      } catch (e) {
        logError('notify-updated-show', e)
      }
    }

    fs.writeFileSync(verPath, JSON.stringify({ version: currentVersion }))
  } catch (e) {
    logError('notify-updated', e)
  }
}

function checkForUpdate() {
  try {
    const options = {
      headers: {
        'User-Agent': 'Wesk-App'
      },
      timeout: 8000
    }

    const req = https.get(
      'https://api.github.com/repos/dortomyork09-cyber/Wesk/releases/latest',
      options,
      res => {
        let data = ''

        res.on('data', chunk => {
          data += chunk
        })

        res.on('end', () => {
          try {
            if (res.statusCode !== 200) return

            const json = JSON.parse(data)
            const latestTag = json.tag_name
            if (!latestTag) return

            const latestVersion = String(latestTag).replace(/^v/i, '')
            const currentVersion = app.getVersion()

            if (isNewerVersion(latestVersion, currentVersion)) {
              const releaseUrl =
                json.html_url ||
                'https://github.com/dortomyork09-cyber/Wesk/releases/latest'

              dialog
                .showMessageBox({
                  type: 'info',
                  title: 'Wesk 업데이트 알림',
                  message: `새 버전(${latestVersion})이 나왔어요.\n지금 버전은 ${currentVersion}입니다.`,
                  buttons: ['다운로드 페이지 열기', '나중에'],
                  defaultId: 0,
                  cancelId: 1
                })
                .then(result => {
                  if (result.response === 0) {
                    shell.openExternal(releaseUrl)
                  }
                })
                .catch(e => logError('update-dialog', e))
            }
          } catch (e) {
            logError('update-check-parse', e)
          }
        })
      }
    )

    req.on('error', e => {
      logError('update-check-request', e)
    })

    req.on('timeout', () => {
      req.destroy()
    })
  } catch (e) {
    logError('update-check', e)
  }
}

// ==========================================
// 자동 업데이트 (NSIS 설치형 빌드 전용)
// ==========================================
// electron-updater는 GitHub Releases에 새 버전이 올라오면 백그라운드로 내려받고,
// 앱을 재시작(또는 종료)할 때 자동으로 설치해준다. 포터블 exe는 실행 파일
// 하나가 그냥 통째로 도는 구조라 "실행 중인 자기 자신을 갈아끼우는" 게 원리상
// 안 되기 때문에, 포터블 빌드에서는 이 함수가 아무것도 안 하고 기존
// checkForUpdate()의 "새 버전 나왔어요, 다운로드 페이지 열기" 안내로 대체된다.
// 이벤트 리스너는 앱이 켜져있는 동안 딱 한 번만 등록하면 된다(반복 등록하면
// 리스너가 계속 쌓여서 나중엔 알림이 여러 번 뜨거나 메모리 경고가 뜰 수 있음).
let autoUpdaterListenersReady = false
function setupAutoUpdaterListeners() {
  if (!autoUpdater || isPortableBuild || autoUpdaterListenersReady) return

  try {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-downloaded', info => {
      try {
        if (Notification.isSupported()) {
          new Notification({
            title: 'Wesk 업데이트 준비됨',
            body: `v${info.version} 다운로드를 마쳤어요. 앱을 재시작하면 적용돼요.`,
            icon: path.join(__dirname, 'icon.png')
          }).show()
        }
      } catch (e) {
        logError('auto-updater-notify', e)
      }
    })

    autoUpdater.on('error', err => {
      logError('auto-updater', err)
    })

    autoUpdaterListenersReady = true
  } catch (e) {
    logError('auto-updater-setup', e)
  }
}

// 실제로 새 버전이 있는지 확인을 실행한다. 앱을 켤 때 한 번, 그리고 켜놓은
// 동안에도 몇 시간마다 한 번씩 이 함수를 불러준다 — Wesk는 트레이 아이콘도
// 없이 며칠씩 계속 켜놓고 쓰는 앱이라, 시작할 때 딱 한 번만 확인하면 그 뒤에
// 나온 새 버전은 앱을 완전히 껐다 다시 켜기 전까진 영영 확인이 안 될 수 있음.
function checkForUpdateNow() {
  if (!isPortableBuild && autoUpdater) {
    setupAutoUpdaterListeners()
    try {
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        logError('auto-updater-check', err)
      })
    } catch (e) {
      logError('auto-updater-check', e)
    }
  } else {
    checkForUpdate()
  }
}

// ==========================================
// 다중 모니터 지원
// ==========================================
// 예전엔 getPrimaryDisplay()만 기준으로 창을 만들어서, 듀얼(또는 그 이상)
// 모니터를 쓰는 사람은 두 번째 화면에 위젯을 못 놓는 문제가 있었다.
// screen.getAllDisplays()로 모든 모니터를 감싸는 가상 데스크톱 전체 영역을
// 구해서, 창을 그 영역 전체(음수 좌표를 쓰는 모니터 배치도 포함) 크기로 만든다.
function getVirtualDesktopBounds() {
  try {
    const displays = screen.getAllDisplays()
    if (!displays || !displays.length) throw new Error('no displays')

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    displays.forEach(d => {
      const b = d.bounds
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.width)
      maxY = Math.max(maxY, b.y + b.height)
    })

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      throw new Error('invalid bounds')
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  } catch (e) {
    // 뭔가 잘못되면(디스플레이 정보를 못 읽는 등) 최소한 기본 모니터
    // 크기로라도 창을 띄운다.
    try {
      const p = screen.getPrimaryDisplay()
      return { x: 0, y: 0, width: p.size.width, height: p.size.height }
    } catch (e2) {
      return { x: 0, y: 0, width: 1280, height: 720 }
    }
  }
}

function createWindow() {
  const vb = getVirtualDesktopBounds()

  win = new BrowserWindow({
    width: vb.width,
    height: vb.height,
    x: vb.x,
    y: vb.y,

    frame: false,
    transparent: true,
    alwaysOnTop: false,

    skipTaskbar: false,
    resizable: false,

    // 콘텐츠가 다 그려지기 전에는 숨겨뒀다가 'ready-to-show'에서 한 번에
    // 보여준다. 이게 없으면 창이 먼저 뜨고 그 위에 위젯들이 순간적으로
    // 그려지는 깜빡임(흰 화면 또는 빈 화면 잔상)이 보여서 실제 로딩
    // 시간과 별개로 "느리다"는 인상을 준다.
    show: false,

    icon: path.join(__dirname, 'icon.png'),

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')

  win.once('ready-to-show', () => {
    if (win && !win.isDestroyed()) {
      win.show()
    }
  })

  // 창이 화면 전체(멀티모니터 포함)를 덮는 투명 오버레이라서, 위젯 없는
  // 빈 영역까지 항상 클릭을 먹어버리면 다른 창/바탕화면을 아예 조작할 수
  // 없게 된다. 그래서 기본값은 반드시 클릭 통과(ignore=true)여야 하고,
  // 위젯/패널 위에 있을 때만 렌더러가 false로 잠깐 풀어주는 구조를 유지한다.
  win.setIgnoreMouseEvents(true, {
    forward: true
  })

  // 메인 창이 닫히면(예: 상단 바의 종료 버튼) 핀돼서 따로 떠있던 위젯 창들도
  // 같이 닫는다 — 안 그러면 메인 창도 트레이도 없는 상태로 핀 위젯 창만
  // 덩그러니 남아서, 사용자가 설정이나 다른 위젯에 다시 접근할 방법이 없어진다.
  // 각 핀 창은 자기 자신의 'closed' 핸들러에서 정리되므로 여기서는 close()만
  // 호출하면 된다.
  win.on('closed', () => {
    Object.keys(pinnedWindows).forEach(id => {
      try {
        const pinWin = pinnedWindows[id]
        if (pinWin && !pinWin.isDestroyed()) pinWin.close()
      } catch (e) {}
    })
  })

  ipcMain.on('set-ignore-mouse', (e, ignore) => {
    try {
      if (win && !win.isDestroyed()) {
        win.setIgnoreMouseEvents(ignore, {
          forward: true
        })
      }
    } catch (err) {
      // 창이 이미 닫혔거나 일시적인 OS 오류인 경우 무시
    } finally {
      // sendSync로 호출된 경우 렌더러가 응답을 기다리므로
      // 반드시 returnValue를 채워줘야 함 (안 그러면 렌더러가 멈춤)
      e.returnValue = true
    }
  })

  // ── 텍스트 입력창에 실제 OS 키보드 포커스 주기 ──
  // setIgnoreMouseEvents(false)로 클릭 통과를 풀어주는 것만으론 마우스 이벤트
  // (클릭/드래그)만 이 창으로 들어올 뿐, 키보드 입력이 이 창으로 라우팅되는 데
  // 필요한 진짜 OS 레벨 포커스는 저절로 따라오지 않는다. 그래서 지금까지
  // win.focus()를 한 번도 호출한 적이 없었고, 그 결과 "레이아웃 저장" 이름
  // 입력창처럼 타이핑이 필요한 곳에서 클릭은 되는데 글자가 하나도 안 써지는
  // 버그가 있었다. 렌더러가 실제로 input/textarea 등을 마우스다운했을 때만
  // (호버만으론 절대 안 보냄 — 안 그러면 위젯 위로 커서만 스쳐도 다른 프로그램의
  // 포커스를 뺏어버림) 이 이벤트를 보내므로, 여기서는 받는 즉시 포커스만 주면
  // 된다. 메인 창/핀 창 둘 다에서 올 수 있어서 이벤트를 보낸 창을 그대로 찾아
  // focus() 한다.
  ipcMain.on('focus-window', (e) => {
    try {
      const senderWin = BrowserWindow.fromWebContents(e.sender)
      if (senderWin && !senderWin.isDestroyed() && !senderWin.isFocused()) {
        senderWin.focus()
      }
    } catch (err) {
      // 포커스 실패해도 치명적이지 않으니 조용히 무시
    }
  })

  // ── 위젯 전체 항상 위에 표시 ──
  // 위젯 하나씩 "핀"해서 따로 창을 파는 것과 달리, 메인 창(가상 데스크톱 전체를
  // 덮는 그 투명 오버레이) 자체를 통째로 always-on-top으로 걸어서 지금
  // 배치된 위젯 전부를 한 번에 다른 프로그램 위로 띄운다. 위젯이 없는 빈
  // 공간은 여전히 클릭 통과(setIgnoreMouseEvents)라서 다른 프로그램 조작에는
  // 지장이 없다. 핀 창들과 같은 'screen-saver' 레벨을 써서 전체화면 게임
  // 위에도 뜨게 한다. Electron 창의 always-on-top 상태는 매번 새로 켤 때
  // 초기화되므로, 부팅 시 렌더러가 저장해둔 설정값을 다시 보내 맞춰준다.
  ipcMain.on('set-global-ontop', (e, enabled) => {
    try {
      if (win && !win.isDestroyed()) {
        if (enabled) {
          win.setAlwaysOnTop(true, 'screen-saver')
        } else {
          win.setAlwaysOnTop(false)
        }
      }
    } catch (err) {
      logError('set-global-ontop', err)
    }
  })

  // 화면(index.html) 쪽 자바스크립트 에러도 같은 로그 파일에 남긴다.
  // "버튼을 눌러도 반응이 없다" 류의 문제는 대부분 여기서 잡힌다.
  ipcMain.on('renderer-error', (e, message) => {
    logError('renderer', new Error(message))
  })

  // ── 위젯 "항상 위에 표시"(핀) ──
  // index.html 쪽에서 위젯 하나를 핀하면, 그 위젯만 담은 아주 작은 전용 창을
  // 새로 열어서 항상 위 고정을 건다. 같은 index.html 파일을 ?pinned=<id>
  // 쿼리로 다시 불러오므로, 위젯 종류(32가지)마다 따로 코드를 만들 필요 없이
  // 기존 렌더러 로직을 그대로 재사용한다 — 그 창 쪽에서 쿼리를 보고 알아서
  // 위젯 하나만 그린다.
  ipcMain.on('pin-widget', (e, payload) => {
    try {
      if (!payload || !payload.id) return
      const id = payload.id
      // 이미 이 위젯이 핀돼있으면(예: 앱을 재시작했는데 핀 상태가 남아있어서
      // 부팅 시 다시 요청이 온 경우) 새로 만들지 않고 기존 창을 그대로 둔다.
      if (pinnedWindows[id] && !pinnedWindows[id].isDestroyed()) return
      const minW = 160 + PIN_MARGIN * 2
      const minH = 80 + PIN_MARGIN * 2
      const x = Math.round(Number(payload.x) || 0)
      const y = Math.round(Number(payload.y) || 0)
      const width = Math.max(minW, Math.round(Number(payload.width) || minW))
      const height = Math.max(minH, Math.round(Number(payload.height) || minH))
      const pinWin = new BrowserWindow({
        x,
        y,
        width,
        height,
        minWidth: minW,
        minHeight: minH,
        frame: false,
        transparent: true,
        // 생성자의 alwaysOnTop:true만으로는 기본("floating") 레벨이라, 다른
        // 앱이 전체화면으로 뜨거나 그 앱도 always-on-top을 걸어두면 이 창이
        // 뒤로 밀릴 수 있다. 전역 단축키 소환(peek)과 똑같이 가장 높은
        // 레벨인 'screen-saver'를 명시적으로 걸어서, 정말 "모든 창 위"에
        // 있도록 한다.
        alwaysOnTop: true,
        resizable: true,
        skipTaskbar: true,
        show: false,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      })
      try {
        pinWin.setAlwaysOnTop(true, 'screen-saver')
      } catch (err) {}
      // Windows에서는 다른 프로그램이 자기 창을 앞으로 가져올 때(포커스를
      // 받을 때) 같은 always-on-top 레벨이어도 그 창에 밀려 뒤로 가는
      // 경우가 있다. 포커스가 다른 곳으로 옮겨갈 때마다 다시 맨 앞으로
      // 끌어올려서, 정말로 "항상" 위에 있게 만든다.
      pinWin.on('blur', () => {
        try {
          if (pinWin && !pinWin.isDestroyed()) pinWin.setAlwaysOnTop(true, 'screen-saver')
        } catch (err) {}
      })
      pinnedWindows[id] = pinWin
      pinWin.loadFile('index.html', { query: { pinned: id } })
      pinWin.once('ready-to-show', () => {
        if (pinWin && !pinWin.isDestroyed()) {
          pinWin.show()
          try {
            pinWin.setAlwaysOnTop(true, 'screen-saver')
          } catch (err) {}
        }
      })
      // 어떻게 닫히든(핀 해제 버튼, Alt+F4, 앱 종료 등) 여기 한 곳에서만
      // 정리하면 돼서, "핀 해제" 처리를 여기저기 중복해서 두지 않아도 된다.
      pinWin.on('closed', () => {
        delete pinnedWindows[id]
        try {
          if (win && !win.isDestroyed()) {
            win.webContents.send('widget-unpinned', id)
          }
        } catch (err) {}
      })
    } catch (err) {
      logError('pin-widget', err)
    }
  })

  // 핀 해제 버튼(핀 창 쪽)을 누르면 그 창을 닫기만 하면 된다 — 실제로 메인
  // 창에 위젯을 되돌리는 처리는 위 pinWin.on('closed')에서 공통으로 한다.
  ipcMain.on('unpin-widget', (e, id) => {
    try {
      const pinWin = pinnedWindows[id]
      if (pinWin && !pinWin.isDestroyed()) pinWin.close()
    } catch (err) {
      logError('unpin-widget', err)
    }
  })

  // ── 핀 창 자유 드래그 ──
  // 예전엔 핀 창을 위젯 헤더(.wl)의 -webkit-app-region:drag로만 움직일 수
  // 있었는데, 그 좁은 줄만 정확히 잡아야 해서 "고정된 것처럼 안 움직인다"는
  // 느낌을 줬다. 이제 렌더러가 위젯 어디를 잡든(버튼·입력창처럼 클릭이 필요한
  // 요소는 렌더러 쪽에서 미리 걸러줌) 드래그 시작 시점의 창 위치를 기준으로
  // 마우스가 움직인 만큼 setPosition으로 창을 옮긴다.
  let pinDragOrigin = null // { id, x, y } — 드래그 시작 시점의 창 위치

  ipcMain.on('pinned-drag-start', (e, id) => {
    try {
      const pinWin = pinnedWindows[id]
      if (!pinWin || pinWin.isDestroyed()) return
      const b = pinWin.getBounds()
      pinDragOrigin = { id, x: b.x, y: b.y }
    } catch (err) {
      logError('pinned-drag-start', err)
    }
  })

  ipcMain.on('pinned-drag-move', (e, payload) => {
    try {
      if (!payload || !pinDragOrigin || payload.id !== pinDragOrigin.id) return
      const pinWin = pinnedWindows[payload.id]
      if (!pinWin || pinWin.isDestroyed()) return
      const nx = Math.round(pinDragOrigin.x + (Number(payload.dx) || 0))
      const ny = Math.round(pinDragOrigin.y + (Number(payload.dy) || 0))
      pinWin.setPosition(nx, ny)
    } catch (err) {
      // 드래그 도중의 일시적 오류는 무시 — 다음 mousemove에서 다시 시도됨
    }
  })

  ipcMain.on('pinned-drag-end', (e, id) => {
    if (pinDragOrigin && pinDragOrigin.id === id) pinDragOrigin = null
  })

  // ── 핀 창 리사이즈 ──
  // 프레임 없는 투명 창이라 어디가 창 가장자리인지 눈에 안 보여서, 위젯
  // 자체의 리사이즈 손잡이(.rh)를 그대로 살려두고 그걸 드래그하면 여기로
  // 델타(dw, dh)가 온다. 위와 같은 방식(시작 시점 bounds 기준으로 델타만큼
  // 계산)으로 처리하고, 렌더러 쪽 fit()이 창 크기 변화에 맞춰 위젯도 같이
  // 늘려준다. 창 위치(x, y)는 리사이즈 중엔 그대로 두고 크기만 바꾼다.
  let pinResizeOrigin = null // { id, x, y, width, height } — 리사이즈 시작 시점의 창 bounds

  ipcMain.on('pinned-resize-start', (e, id) => {
    try {
      const pinWin = pinnedWindows[id]
      if (!pinWin || pinWin.isDestroyed()) return
      const b = pinWin.getBounds()
      pinResizeOrigin = { id, x: b.x, y: b.y, width: b.width, height: b.height }
    } catch (err) {
      logError('pinned-resize-start', err)
    }
  })

  ipcMain.on('pinned-resize-move', (e, payload) => {
    try {
      if (!payload || !pinResizeOrigin || payload.id !== pinResizeOrigin.id) return
      const pinWin = pinnedWindows[payload.id]
      if (!pinWin || pinWin.isDestroyed()) return
      const minW = 160 + PIN_MARGIN * 2
      const minH = 80 + PIN_MARGIN * 2
      const nw = Math.max(minW, Math.round(pinResizeOrigin.width + (Number(payload.dw) || 0)))
      const nh = Math.max(minH, Math.round(pinResizeOrigin.height + (Number(payload.dh) || 0)))
      pinWin.setBounds({ x: pinResizeOrigin.x, y: pinResizeOrigin.y, width: nw, height: nh })
    } catch (err) {
      // 리사이즈 도중의 일시적 오류는 무시 — 다음 mousemove에서 다시 시도됨
    }
  })

  ipcMain.on('pinned-resize-end', (e, id) => {
    if (pinResizeOrigin && pinResizeOrigin.id === id) pinResizeOrigin = null
  })

  // 설정의 "초기화"(모든 위젯·데이터 삭제)를 누르면 메인 창은 localStorage를
  // 통째로 지우고 새로고침하는데, 그때 핀돼서 따로 떠있는 위젯 창들도 같이
  // 정리해야 한다 — 안 그러면 데이터는 다 지워졌는데 창만 화면에 남는다.
  ipcMain.on('close-all-pinned', () => {
    Object.keys(pinnedWindows).forEach(id => {
      try {
        const pinWin = pinnedWindows[id]
        if (pinWin && !pinWin.isDestroyed()) pinWin.close()
      } catch (err) {}
    })
  })


  // ==========================================
  // 뉴스 RSS
  // ==========================================

  ipcMain.handle(
    'fetch-news',
    async (event, lang) => {
      // lang이 'en'이면 영어권(미국) 뉴스, 그 외(기본)는 한국어 뉴스.
      const newsUrl =
        lang === 'en'
          ? 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en'
          : 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko'
      return new Promise(resolve => {
        https.get(
          newsUrl,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0'
            }
          },
          res => {
            let data = ''

            res.on(
              'data',
              chunk => {
                data += chunk
              }
            )

            res.on(
              'end',
              () => {
                resolve(data)
              }
            )
          }
        )
        .on(
          'error',
          () => {
            resolve(null)
          }
        )
      })
    }
  )

  // ==========================================
  // 범용 URL Fetch
  // ==========================================

  ipcMain.handle(
    'fetch-url',
    async (event, url) => {

      function get(u, depth) {
        return new Promise(resolve => {

          if (depth > 5) {
            resolve(null)
            return
          }

          // 네이버·Daum 스포츠 비공식 API는 자기 사이트에서 온 요청처럼
          // Referer가 있어야 정상 응답하는(또는 빈 값을 주지 않는) 경우가 있어
          // 도메인별로 Referer/Origin을 추가해준다. 특히 Daum의 /prx/ 경로는
          // robots.txt에도 크롤러 접근이 막혀있을 만큼 외부 접근에 민감한 경로라
          // Referer 없이는 빈 응답만 오는 것으로 보인다.
          const extraHeaders = {}
          try {
            const host = new URL(u).hostname
            if (/(^|\.)sports\.naver\.com$/i.test(host)) {
              extraHeaders['Referer'] = 'https://m.sports.naver.com/'
              extraHeaders['Origin'] = 'https://m.sports.naver.com'
            } else if (/(^|\.)sports\.daum\.net$/i.test(host)) {
              extraHeaders['Referer'] = 'https://sports.daum.net/schedule/kbo'
              extraHeaders['Origin'] = 'https://sports.daum.net'
              extraHeaders['X-Requested-With'] = 'XMLHttpRequest'
            }
          } catch (e) {}

          const req =
            https.get(
              u,
              {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',

                  'Accept':
                    'application/json, text/plain, */*',

                  'Accept-Language':
                    'ko-KR,ko;q=0.9,en;q=0.8',

                  ...extraHeaders
                }
              },
              res => {

                // 리다이렉트
                if (
                  res.statusCode >= 300 &&
                  res.statusCode < 400 &&
                  res.headers.location
                ) {

                  res.resume()

                  const next =
                    res.headers.location
                      .startsWith('http')
                      ? res.headers.location
                      : new URL(
                          res.headers.location,
                          u
                        ).href

                  resolve(
                    get(
                      next,
                      depth + 1
                    )
                  )

                  return
                }

                if (
                  res.statusCode !== 200
                ) {
                  res.resume()
                  resolve(null)
                  return
                }

                let data = ''

                res.setEncoding('utf8')

                res.on(
                  'data',
                  chunk => {
                    data += chunk
                  }
                )

                res.on(
                  'end',
                  () => {
                    resolve(data)
                  }
                )
              }
            )

          req.on(
            'error',
            () => {
              resolve(null)
            }
          )

          req.setTimeout(
            10000,
            () => {
              req.destroy()
              resolve(null)
            }
          )
        })
      }

      return get(url, 0)
    }
  )

  // ==========================================
  // 야후 파이낸스 전용 요청 (쿠키 + crumb)
  // ==========================================
  // 최근 야후 파이낸스 비공식 API(v8/finance/chart, v1/finance/search)는
  // 쿠키와 crumb(보안 토큰) 없이 반복 요청하면 401(Unauthorized)을 자주 돌려준다.
  // 그래서 별도로 쿠키/crumb를 발급받아 재사용하고, 401을 만나면 새로 발급받아
  // 한 번 더 시도한다. 이걸 안 하면 "주식이 뜨다 안 뜨다" 하는 현상이 생긴다.

  let yahooCookie = null
  let yahooCrumb = null
  let yahooCrumbPromise = null

  function httpsRequest(url, extraHeaders) {
    return new Promise(resolve => {
      let req
      try {
        req = https.get(
          url,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Accept': 'application/json, text/plain, */*',
              ...extraHeaders
            }
          },
          res => {
            let data = ''
            res.setEncoding('utf8')
            res.on('data', c => { data += c })
            res.on('end', () => {
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                body: data
              })
            })
          }
        )
      } catch (e) {
        resolve(null)
        return
      }

      req.on('error', () => resolve(null))
      req.setTimeout(10000, () => {
        req.destroy()
        resolve(null)
      })
    })
  }

  function pickCookie(res) {
    const raw = res && res.headers && res.headers['set-cookie']
    if (!raw || !raw.length) return ''
    return raw.map(c => c.split(';')[0]).join('; ')
  }

  async function issueYahooCrumb() {
    try {
      // 1) 쿠키 발급
      const r1 = await httpsRequest('https://fc.yahoo.com')
      const cookie = pickCookie(r1)
      if (!cookie) return null

      // 2) 위 쿠키를 실어서 crumb 발급
      const r2 = await httpsRequest(
        'https://query2.finance.yahoo.com/v1/test/getcrumb',
        { 'Cookie': cookie }
      )
      if (!r2 || r2.statusCode !== 200) return null

      const crumb = String(r2.body || '').trim()
      if (!crumb || crumb.length > 100) return null

      return { cookie, crumb }
    } catch (e) {
      return null
    }
  }

  async function getYahooAuth(forceRefresh) {
    if (!forceRefresh && yahooCookie && yahooCrumb) {
      return { cookie: yahooCookie, crumb: yahooCrumb }
    }
    if (yahooCrumbPromise) return yahooCrumbPromise

    yahooCrumbPromise = issueYahooCrumb().then(auth => {
      yahooCrumbPromise = null
      if (auth) {
        yahooCookie = auth.cookie
        yahooCrumb = auth.crumb
      }
      return auth || { cookie: null, crumb: null }
    })

    return yahooCrumbPromise
  }

  function buildYahooUrl(kind, param) {
    if (kind === 'search') {
      return 'https://query1.finance.yahoo.com/v1/finance/search?q=' +
        encodeURIComponent(param) + '&quotesCount=10&newsCount=0'
    }
    // kind === 'chart' (기본값)
    return 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(param) + '?interval=1d&range=1d'
  }

  ipcMain.handle(
    'fetch-yahoo',
    async (event, kind, param) => {
      if (!param) return null

      for (let attempt = 0; attempt < 2; attempt++) {
        const auth = await getYahooAuth(attempt > 0)
        let url = buildYahooUrl(kind, param)
        if (auth && auth.crumb) {
          url += '&crumb=' + encodeURIComponent(auth.crumb)
        }

        const res = await httpsRequest(
          url,
          auth && auth.cookie ? { 'Cookie': auth.cookie } : {}
        )

        if (res && res.statusCode === 200) {
          return res.body
        }

        // 401/403이면 crumb가 만료됐을 가능성이 크므로 새로 발급받아 한 번 더 시도한다.
        if (!res || (res.statusCode !== 401 && res.statusCode !== 403)) {
          break
        }
      }

      return null
    }
  )

  // ==========================================
  // 날씨
  // ==========================================

  ipcMain.handle(
    'fetch-weather',
    async (event, lat, lon) => {

      return new Promise(resolve => {

        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&forecast_days=1`

        https.get(
          url,
          res => {

            let data = ''

            res.on(
              'data',
              chunk => {
                data += chunk
              }
            )

            res.on(
              'end',
              () => {
                try {
                  resolve(
                    JSON.parse(data)
                  )
                } catch (e) {
                  resolve(null)
                }
              }
            )
          }
        )
        .on(
          'error',
          () => {
            resolve(null)
          }
        )
      })
    }
  )

  // ==========================================
  // 번역
  // ==========================================

  ipcMain.handle(
    'translate',
    async (event, text, from, to) => {

      return new Promise(resolve => {

        const q =
          encodeURIComponent(text)

        const url =
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${q}`

        https.get(
          url,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0'
            }
          },
          res => {

            let data = ''

            res.on(
              'data',
              c => {
                data += c
              }
            )

            res.on(
              'end',
              () => {

                try {

                  const j =
                    JSON.parse(data)

                  let out = ''

                  if (j && j[0]) {

                    j[0].forEach(
                      seg => {

                        if (
                          seg &&
                          seg[0]
                        ) {
                          out += seg[0]
                        }
                      }
                    )
                  }

                  resolve(
                    out || null
                  )

                } catch (e) {
                  resolve(null)
                }
              }
            )
          }
        )
        .on(
          'error',
          () => {
            resolve(null)
          }
        )
      })
    }
  )

  // ==========================================
  // 축구 경기
  // ==========================================

  ipcMain.handle(
    'fetch-football',
    async (event, league) => {

      return new Promise(resolve => {

        const today =
          new Date()

        const from =
          new Date(
            today.getTime() -
            7 * 86400000
          )
            .toISOString()
            .slice(0, 10)

        const to =
          new Date(
            today.getTime() +
            14 * 86400000
          )
            .toISOString()
            .slice(0, 10)

        const url =
          `https://api.football-data.org/v4/competitions/${league}/matches?dateFrom=${from}&dateTo=${to}`

        https.get(
          url,
          {
            headers: {
              'X-Auth-Token': '',
              'User-Agent':
                'Mozilla/5.0'
            }
          },
          res => {

            let data = ''

            res.on(
              'data',
              c => {
                data += c
              }
            )

            res.on(
              'end',
              () => {

                try {

                  const j =
                    JSON.parse(data)

                  if (
                    j.errorCode ||
                    !j.matches
                  ) {

                    resolve({
                      error:
                        'API 키가 필요해요'
                    })

                    return
                  }

                  const matches =
                    j.matches.map(
                      m => ({

                        home:
                          m.homeTeam.shortName ||
                          m.homeTeam.name,

                        away:
                          m.awayTeam.shortName ||
                          m.awayTeam.name,

                        hs:
                          m.score.fullTime.home,

                        as:
                          m.score.fullTime.away,

                        status:
                          m.status,

                        date:
                          new Date(
                            m.utcDate
                          )
                            .toLocaleDateString(
                              'ko-KR',
                              {
                                month:
                                  'numeric',

                                day:
                                  'numeric'
                              }
                            )
                      })
                    )

                  resolve({
                    matches
                  })

                } catch (e) {

                  resolve({
                    error:
                      '데이터 오류'
                  })
                }
              }
            )
          }
        )
        .on(
          'error',
          () => {

            resolve({
              error:
                '연결 실패'
            })
          }
        )
      })
    }
  )

  // ==========================================
  // 자동 시작
  // ==========================================

  ipcMain.handle(
    'get-autostart',
    async () => {
      try {
        return app
          .getLoginItemSettings()
          .openAtLogin
      } catch (err) {
        return false
      }
    }
  )

  ipcMain.handle(
    'set-autostart',
    async (event, enabled) => {
      try {
        app.setLoginItemSettings({
          openAtLogin: !!enabled,
          path: process.execPath,
          args: []
        })
      } catch (err) {
        // 일부 환경(권한 제한 등)에서 등록 실패 가능 - 무시하고
        // 실제 반영된 상태를 그대로 반환해 UI가 항상 실제 상태와 일치하게 함
      }

      try {
        return app
          .getLoginItemSettings()
          .openAtLogin
      } catch (err) {
        return false
      }
    }
  )



  // ==========================================
  // 화면 캡처 / 녹화
  // ==========================================
  // 스크린샷은 메인 프로세스에서 desktopCapturer로 화면 원본을 받아 PNG로 저장하고
  // 클립보드에도 복사한다. 녹화는 브라우저 표준 MediaRecorder API가 렌더러(화면) 쪽
  // 에서만 동작하므로, 여기서는 녹화할 화면의 소스 id만 내려주고 실제 인코딩/저장은
  // 렌더러가 하되, 완성된 파일 저장만 이 프로세스가 담당한다(파일시스템 경로 접근은
  // 메인 프로세스에서 하는 게 안전하고 일관적이라서).

  function getMediaDir() {
    const dir = path.join(app.getPath('pictures'), 'Wesk')

    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    } catch (e) {
      // 폴더 생성 실패 시 기본 사진 폴더로라도 저장되도록 fallback
      return app.getPath('pictures')
    }

    return dir
  }

  function timestampName() {
    const d = new Date()
    const p = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  }

  async function captureScreenshotToFile() {
    try {
      const display = screen.getPrimaryDisplay()
      const width = Math.round(display.size.width * display.scaleFactor)
      const height = Math.round(display.size.height * display.scaleFactor)

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      })

      if (!sources || !sources.length) {
        return { success: false, error: '화면을 찾을 수 없어요' }
      }

      const img = sources[0].thumbnail
      if (!img || img.isEmpty()) {
        return { success: false, error: '캡처된 이미지가 비어있어요' }
      }

      const dir = getMediaDir()
      const filename = `Wesk_캡처_${timestampName()}.png`
      const filePath = path.join(dir, filename)

      fs.writeFileSync(filePath, img.toPNG())

      try {
        clipboard.writeImage(img)
      } catch (e) {
        // 클립보드 복사가 실패해도 파일 저장은 이미 됐으니 무시
      }

      return { success: true, filename, dir, path: filePath }
    } catch (err) {
      logError('capture-screenshot', err)
      return { success: false, error: '스크린샷 캡처 중 오류가 발생했어요' }
    }
  }

  ipcMain.handle(
    'capture-screenshot',
    async () => captureScreenshotToFile()
  )

  // ── 공유용 스크린샷(위젯 영역만 잘라서 + 워터마크와 함께) ──
  // 워터마크는 여기서 그리는 게 아니라, 렌더러가 캡처 직전에 실제 DOM에
  // 잠깐 띄운 배지를 화면 원본과 함께 그대로 찍는 방식이라(오버레이 창이
  // 항상 다른 프로그램들 위에 떠있어서 desktopCapturer가 캡처하는 화면
  // 원본에도 그대로 포함됨), 여기선 화면을 찍고 rect만큼 잘라내기만 하면 된다.
  ipcMain.handle(
    'capture-share-screenshot',
    async (event, rect) => {
      try {
        const display = screen.getPrimaryDisplay()
        const scaleFactor = display.scaleFactor
        const width = Math.round(display.size.width * scaleFactor)
        const height = Math.round(display.size.height * scaleFactor)

        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width, height }
        })

        if (!sources || !sources.length) {
          return { success: false, error: '화면을 찾을 수 없어요' }
        }

        let img = sources[0].thumbnail
        if (!img || img.isEmpty()) {
          return { success: false, error: '캡처된 이미지가 비어있어요' }
        }

        // rect가 정상적인 값이면(위젯들이 모여있는 영역) 그 부분만 물리 픽셀
        // 좌표로 환산해서 잘라낸다. 값이 이상하거나 화면 밖으로 완전히
        // 벗어나면 크롭을 포기하고 전체 화면 그대로 저장한다(기존 스크린샷
        // 기능과 같은 동작이라 새로운 실패 케이스가 아님).
        if (rect && typeof rect.x === 'number' && typeof rect.y === 'number' && rect.width > 0 && rect.height > 0) {
          let cx = Math.round((rect.x - display.bounds.x) * scaleFactor)
          let cy = Math.round((rect.y - display.bounds.y) * scaleFactor)
          let cw = Math.round(rect.width * scaleFactor)
          let ch = Math.round(rect.height * scaleFactor)
          if (cx < 0) { cw += cx; cx = 0 }
          if (cy < 0) { ch += cy; cy = 0 }
          if (cx + cw > width) cw = width - cx
          if (cy + ch > height) ch = height - cy
          if (cw > 0 && ch > 0) {
            img = img.crop({ x: cx, y: cy, width: cw, height: ch })
          }
        }

        const dir = getMediaDir()
        const filename = `Wesk_공유_${timestampName()}.png`
        const filePath = path.join(dir, filename)

        fs.writeFileSync(filePath, img.toPNG())

        try {
          clipboard.writeImage(img)
        } catch (e) {
          // 클립보드 복사가 실패해도 파일 저장은 이미 됐으니 무시
        }

        return { success: true, filename, dir, path: filePath }
      } catch (err) {
        logError('capture-share-screenshot', err)
        return { success: false, error: '공유용 캡처 중 오류가 발생했어요' }
      }
    }
  )

  ipcMain.handle(
    'get-screen-source',
    async () => {
      try {
        const display = screen.getPrimaryDisplay()

        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 1, height: 1 }
        })

        if (!sources || !sources.length) {
          return null
        }

        return {
          id: sources[0].id,
          width: Math.round(display.size.width * display.scaleFactor),
          height: Math.round(display.size.height * display.scaleFactor)
        }
      } catch (err) {
        logError('get-screen-source', err)
        return null
      }
    }
  )

  ipcMain.handle(
    'save-recording',
    async (event, buffer) => {
      try {
        if (!buffer || !buffer.length) {
          return { success: false, error: '저장할 녹화 데이터가 없어요' }
        }

        const dir = getMediaDir()
        const filename = `Wesk_녹화_${timestampName()}.webm`
        const filePath = path.join(dir, filename)

        fs.writeFileSync(filePath, buffer)

        return { success: true, filename, dir, path: filePath }
      } catch (err) {
        logError('save-recording', err)
        return { success: false, error: '녹화 저장 중 오류가 발생했어요' }
      }
    }
  )

  ipcMain.handle(
    'open-capture-folder',
    async () => {
      try {
        const dir = getMediaDir()
        await shell.openPath(dir)
        return { success: true }
      } catch (err) {
        logError('open-capture-folder', err)
        return { success: false }
      }
    }
  )

  ipcMain.handle(
    'open-log-folder',
    async () => {
      try {
        const logPath = getLogPath()
        if (!logPath) return { success: false, error: '로그 폴더를 열 수 없어요' }
        // 로그 파일이 있으면 탐색기에서 그 파일을 바로 선택해서 보여주고,
        // 없으면(아직 에러가 한 번도 안 난 경우) 폴더만 열어준다.
        if (fs.existsSync(logPath)) {
          shell.showItemInFolder(logPath)
        } else {
          await shell.openPath(path.dirname(logPath))
        }
        return { success: true }
      } catch (err) {
        logError('open-log-folder', err)
        return { success: false, error: '로그 폴더를 여는 중 오류가 발생했어요' }
      }
    }
  )

  // ==========================================
  // 설정 백업 내보내기 / 가져오기
  // 렌더러가 localStorage 전체를 JSON 문자열로 만들어서 넘겨주면
  // 그걸 사용자가 고른 위치에 파일로 저장/읽기만 담당한다 (내용 자체는 모른다).
  // ==========================================
  ipcMain.handle(
    'export-backup',
    async (event, jsonStr) => {
      try {
        if (typeof jsonStr !== 'string' || !jsonStr) {
          return { success: false, error: '내보낼 데이터가 없어요' }
        }
        const defaultName =
          'wcw-backup-' +
          new Date().toISOString().slice(0, 10) +
          '.json'
        const win = BrowserWindow.getAllWindows()[0]
        const result = await dialog.showSaveDialog(win, {
          title: 'Wesk 백업 저장',
          defaultPath: defaultName,
          filters: [{ name: 'Wesk 백업 파일', extensions: ['json'] }]
        })
        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true }
        }
        fs.writeFileSync(result.filePath, jsonStr, 'utf-8')
        return { success: true, filePath: result.filePath }
      } catch (err) {
        logError('export-backup', err)
        return { success: false, error: '백업 파일을 저장하는 중 오류가 발생했어요' }
      }
    }
  )

  ipcMain.handle(
    'import-backup',
    async () => {
      try {
        const win = BrowserWindow.getAllWindows()[0]
        const result = await dialog.showOpenDialog(win, {
          title: 'Wesk 백업 불러오기',
          properties: ['openFile'],
          filters: [{ name: 'Wesk 백업 파일', extensions: ['json'] }]
        })
        if (result.canceled || !result.filePaths || !result.filePaths[0]) {
          return { success: false, canceled: true }
        }
        const content = fs.readFileSync(result.filePaths[0], 'utf-8')
        return { success: true, content }
      } catch (err) {
        logError('import-backup', err)
        return { success: false, error: '백업 파일을 읽는 중 오류가 발생했어요' }
      }
    }
  )

}

// ==========================================
// 앱 시작
// ==========================================

app.whenReady().then(() => {
  debugLog(`앱 시작 — 버전 ${app.getVersion()}, __dirname=${__dirname}, PID=${process.pid}`)

  createWindow()

  // 모니터를 연결/해제하거나 배치·해상도를 바꾸면 위젯을 놓을 수 있는 전체
  // 영역도 바뀌므로, 창 크기를 다시 계산해서 맞춰준다.
  function resizeWindowForDisplays() {
    try {
      if (!win || win.isDestroyed()) return
      const vb = getVirtualDesktopBounds()
      win.setBounds(vb)
    } catch (e) {
      logError('resize-window-for-displays', e)
    }
  }
  try {
    screen.on('display-added', resizeWindowForDisplays)
    screen.on('display-removed', resizeWindowForDisplays)
    screen.on('display-metrics-changed', resizeWindowForDisplays)
  } catch (e) {
    logError('display-listener-register', e)
  }

  // 창이 뜨고 조금 지난 뒤, 지난 실행 때와 버전이 달라졌으면(=방금 업데이트를
  // 끝낸 상태) 완료 알림을 띄운다.
  setTimeout(() => {
    notifyIfJustUpdated()
  }, 2000)

  // 시작하고 3초 후에 새 버전 있는지 확인 (부팅 직후 부하 안 주려고 살짝 지연).
  // NSIS 설치형으로 실행 중이고 electron-updater가 설치돼있으면 진짜 자동
  // 업데이트를, 아니면(포터블 exe) 기존의 "새 버전 나왔어요" 안내만 띄운다.
  setTimeout(() => {
    checkForUpdateNow()
  }, 3000)

  // 앱을 켜놓은 동안에도 1시간마다 한 번씩 다시 확인한다 (위 이유로 시작할
  // 때 한 번만으론 며칠씩 켜놓는 사용 패턴에서 부족함). 원래 6시간이었는데,
  // 새 버전 낸 직후에도 유저들이 너무 늦게 알아채길래 더 짧게 줄임.
  setInterval(() => {
    checkForUpdateNow()
  }, 60 * 60 * 1000)

  // 렌더러(화면) 프로세스가 죽으면 왜 죽었는지 로그로 남긴다
  app.on('render-process-gone', (event, webContents, details) => {
    logError(
      'render-process-gone',
      new Error(`reason: ${details.reason}, exitCode: ${details.exitCode}`)
    )
  })

})

app.on(
  'window-all-closed',
  () => {

    if (
      process.platform !==
      'darwin'
    ) {
      app.quit()
    }
  }
)

app.on(
  'activate',
  () => {

    if (
      BrowserWindow
        .getAllWindows()
        .length === 0
    ) {
      createWindow()
    }
  }
)