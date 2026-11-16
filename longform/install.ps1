# install.ps1 - one-line install of Long-Form Studio on Windows.
# The Windows twin of tools/install.sh.
#
# Students paste ONE line into PowerShell (Start menu, type PowerShell, press Enter):
#
#   irm https://builds.digicuratoragency.com/longform/install.ps1 | iex
#
# What it does, skipping anything already done:
#   1. Finds the Long-Form Studio ZIP in Downloads and puts the app in %USERPROFILE%\long-form-studio.
#      If the app is already there and a newer ZIP is in Downloads, it updates the app and keeps
#      the data folder (settings and videos).
#   2. A private copy of Node inside the app folder (runtime\node). No admin prompt, nothing installed system-wide.
#   3. The app's own packages (npm install). Slides render with Chrome or with Edge, which every PC has.
#   4. Speech to text: whisper.cpp (pinned release, checked) and the English speech model (about 470 MB) in runtime.
#   5. Claude Code (only when missing, plus Git for Windows, which it needs) and the Claude login.
#   6. A "Long-Form Studio" shortcut on the Desktop, then it starts the app.
#
# It never downloads the app itself: it only unzips the ZIP the student already has.
# Safe to re-run: "paste the same line again" is the fix for most problems.
#
# Testing / support, set before the one-liner:
#   $env:STUDIO_DRY_RUN = '1'          say what would happen, change nothing
#   $env:STUDIO_NO_CLAUDE = '1'        skip Claude Code and the login
#   $env:STUDIO_NO_CLAUDE_LOGIN = '1'  skip only the login
#   $env:STUDIO_NO_START = '1'         don't start the app at the end
#   $env:STUDIO_NO_WINGET = '1'        ignore winget and use direct downloads
#
# Canonical copy: LongFormStudio/tools/install.ps1. The hosted copy at
# ness-build/longform/install.ps1 is copied from it by hand.
#
# Rules for this file: ASCII only (Windows PowerShell 5.1 reads text without a BOM as ANSI,
# and irm decodes a text/plain download as Latin-1), Windows PowerShell 5.1 syntax, and no
# "exit" outside the function (with "| iex" it would close the student's window).

function Install-LongFormStudio {
  $DryRun = ($env:STUDIO_DRY_RUN -eq '1')
  $Claude = ($env:STUDIO_NO_CLAUDE -ne '1')
  $ClaudeLogin = ($env:STUDIO_NO_CLAUDE_LOGIN -ne '1')
  $StartApp = ($env:STUDIO_NO_START -ne '1')
  $ErrorActionPreference = 'Continue'
  $ProgressPreference = 'SilentlyContinue'
  try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

  $NodeLine = 'latest-v22.x'   # Node 22 LTS
  $Support = 'ness@digicuratoragency.com'
  $HubUrl = 'https://hub.digicuratoragency.com/content-engine'
  $FolderName = 'long-form-studio'
  $Home_ = $env:USERPROFILE
  $Project = Join-Path $Home_ $FolderName
  $LogDir = Join-Path $env:LOCALAPPDATA 'LongFormStudio'
  $Log = Join-Path $LogDir 'install.log'
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  Add-Content -Path $Log -Value "`r`n===== install.ps1 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') dry_run=$DryRun ====="

  $script:Warned = $false
  function Say($t)  { Write-Host $t; Add-Content -Path $Log -Value $t }
  function Step($t) { Write-Host ''; Write-Host ">> $t" -ForegroundColor Cyan; Add-Content -Path $Log -Value "`r`n>> $t" }
  function Ok($t)   { Write-Host "[OK] $t" -ForegroundColor Green; Add-Content -Path $Log -Value "[OK] $t" }
  function Warn($t) { Write-Host "[!] $t" -ForegroundColor Yellow; Add-Content -Path $Log -Value "[!] $t"; $script:Warned = $true }
  function Fail($t) {
    Write-Host ''; Write-Host "STOP: $t" -ForegroundColor Red; Add-Content -Path $Log -Value "STOP: $t"
    Say "   Need help? Email $Support and attach this file: $Log"
  }

  # Runs a program with its output on screen AND in the log. Returns the exit code.
  function Invoke-Logged([string]$Exe, [string[]]$Arguments) {
    if ($DryRun) { Say "   (dry run) would run: $Exe $($Arguments -join ' ')"; return 0 }
    & $Exe @Arguments 2>&1 | ForEach-Object { $line = "$_"; Write-Host $line; Add-Content -Path $Log -Value $line }
    return $LASTEXITCODE
  }

  # Programs installed a moment ago are not on this window's PATH yet: reload it from Windows.
  function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user;$env:USERPROFILE\.local\bin"
  }

  # Is a program listed in Settings > Apps?
  function Test-AppInstalled([string]$NamePattern) {
    $keys = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
            'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
            'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
    foreach ($k in $keys) {
      $hit = Get-ItemProperty $k -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like $NamePattern } | Select-Object -First 1
      if ($hit) { return $true }
    }
    return $false
  }

  $Winget = $null
  if ($env:STUDIO_NO_WINGET -ne '1') { $Winget = Get-Command winget.exe -ErrorAction SilentlyContinue }
  function Install-Winget([string]$Id) {
    if (-not $Winget) { return $false }
    $a = @('install', '--id', $Id, '-e', '--silent', '--accept-source-agreements', '--accept-package-agreements', '--disable-interactivity')
    $code = Invoke-Logged 'winget.exe' $a
    Update-SessionPath
    return ($code -eq 0 -or $code -eq -1978335189 -or $code -eq -1978335135)
  }

  function Get-Download([string]$Url, [string]$OutFile) {
    try { Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing; return $true } catch { Add-Content -Path $Log -Value "download failed: $Url $($_.Exception.Message)"; return $false }
  }

  # Unpack a ZIP. tar.exe (built into Windows 10 and 11) is much faster than Expand-Archive.
  function Expand-Zip([string]$Zip, [string]$Dest) {
    New-Item -ItemType Directory -Force -Path $Dest | Out-Null
    $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    if (Test-Path $tar) {
      & $tar -xf $Zip -C $Dest 2>&1 | ForEach-Object { Add-Content -Path $Log -Value "$_" }
      if ($LASTEXITCODE -eq 0) { return $true }
    }
    try { Expand-Archive -Path $Zip -DestinationPath $Dest -Force; return $true } catch { Add-Content -Path $Log -Value "Expand-Archive: $($_.Exception.Message)"; return $false }
  }

  Write-Host ''
  Write-Host 'Long-Form Studio installer' -ForegroundColor White
  Say 'This sets up Long-Form Studio on your PC. It takes about 5 minutes.'
  Say 'Leave this window open until you see the green "installed" message.'
  if ($DryRun) { Say '(Dry run: nothing will be installed or changed.)' }

  # ---------------------------------------------------------------- Checks
  $arch = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
  $NodeArch = if ($arch -eq 'ARM64') { 'arm64' } else { 'x64' }
  try {
    $drive = (Get-Item $Home_).PSDrive
    if ($drive.Free -and $drive.Free -lt 2GB) { Fail 'Your PC has less than 2 GB free. Free up some space, then paste the same line again.'; return }
  } catch {}
  try { Invoke-WebRequest -Uri 'https://nodejs.org/dist/' -Method Head -UseBasicParsing -TimeoutSec 15 | Out-Null }
  catch { Fail 'No internet connection (nodejs.org did not answer). Check your connection, then paste the same line again.'; return }

  # ---------------------------------------------------------------- 1. The app folder
  Step '1/6 Long-Form Studio'
  $Downloads = Join-Path $Home_ 'Downloads'
  try { $dl = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders' -ErrorAction Stop).'{374DE290-123F-4565-9164-39C4925E467B}'; if ($dl) { $Downloads = [Environment]::ExpandEnvironmentVariables($dl) } } catch {}

  # Where the new copy comes from: the newest ZIP in Downloads, or a folder already extracted there.
  $SrcZip = Get-ChildItem $Downloads -File -Filter "$FolderName*.zip" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $SrcDir = $null
  if (-not $SrcZip) {
    # "Extract All" in File Explorer makes Downloads\<zip name>\long-form-studio.
    $cands = @(Join-Path $Downloads $FolderName) + @(Get-ChildItem $Downloads -Directory -Filter "$FolderName*" -ErrorAction SilentlyContinue | ForEach-Object { Join-Path $_.FullName $FolderName })
    $SrcDir = $cands | Where-Object { (Test-Path (Join-Path $_ 'Start Studio.cmd')) -and ($_ -ne $Project) } | Select-Object -First 1
  }
  $SrcId = ''
  if ($SrcZip) { $SrcId = "$($SrcZip.Name) $($SrcZip.Length)" }
  elseif ($SrcDir) { $SrcId = "folder $((Get-Item (Join-Path $SrcDir 'server.js')).LastWriteTimeUtc.Ticks)" }

  $InstalledId = ''
  $marker = Join-Path $Project '.install-source'
  if (Test-Path $marker) { $InstalledId = (Get-Content $marker -Raw).Trim() }
  $NeedNpm = $false
  $HaveApp = Test-Path (Join-Path $Project 'server.js')

  if ($HaveApp -and ((-not $SrcId) -or ($SrcId -eq $InstalledId))) {
    Ok "The app is already in $Project"
  } elseif (-not $SrcId) {
    Fail "No Long-Form Studio ZIP in your Downloads folder. Download it from the hub, then paste the same line again:`r`n   $HubUrl"
    return
  } else {
    if ($HaveApp) { Say 'A newer copy is in Downloads. Updating the app (your data folder stays as it is).' }
    else { Say "Putting the app in $Project" }
    if ($DryRun) {
      $from = if ($SrcZip) { $SrcZip.FullName } else { $SrcDir }
      Say "   (dry run) would copy the app from $from into $Project"
    } else {
      $tmp = Join-Path $env:TEMP ("studio-" + [guid]::NewGuid().ToString('N'))
      if ($SrcZip) {
        Unblock-File -Path $SrcZip.FullName -ErrorAction SilentlyContinue
        if (-not (Expand-Zip $SrcZip.FullName $tmp)) { Fail 'The ZIP in Downloads did not unzip. Download it again from the hub, then paste the same line again.'; return }
        $New = Join-Path $tmp $FolderName
      } else { $New = $SrcDir }
      if (-not (Test-Path (Join-Path $New 'server.js'))) { Fail 'That ZIP does not look like Long-Form Studio. Download it again from the hub, then paste the same line again.'; return }
      New-Item -ItemType Directory -Force -Path $Project | Out-Null
      # Clear out the old app files, but never the student's data, packages or private Node.
      $keep = @('data', 'node_modules', 'runtime', '.install-source')
      Get-ChildItem $Project -Force | Where-Object { $keep -notcontains $_.Name } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
      & robocopy.exe $New $Project /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
      if ($LASTEXITCODE -ge 8) { Fail "Could not copy the app into $Project."; return }
      # Someone who ran the app by hand from Downloads first keeps their work.
      if ($SrcDir -and (Test-Path (Join-Path $SrcDir 'data')) -and -not (Test-Path (Join-Path $Project 'data'))) {
        & robocopy.exe (Join-Path $SrcDir 'data') (Join-Path $Project 'data') /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
        Say 'Brought your existing data folder along from Downloads'
      }
      if ($SrcZip) { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
      Get-ChildItem $Project -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "*\node_modules\*" } | Unblock-File -ErrorAction SilentlyContinue
      Set-Content -Path $marker -Value $SrcId -NoNewline
      Ok "The app is in $Project"
      $NeedNpm = $true
    }
  }

  # ---------------------------------------------------------------- 2. Node
  Step '2/6 Node (a private copy inside the app folder)'
  $NodeDir = Join-Path $Project 'runtime\node'
  $NodeExe = Join-Path $NodeDir 'node.exe'
  $nodeOk = $false
  if (Test-Path $NodeExe) {
    $v = (& $NodeExe -v 2>$null)
    if ($v -and ([int]($v.TrimStart('v').Split('.')[0]) -ge 20)) { $nodeOk = $true; Ok "Node $v is ready" }
  }
  if (-not $nodeOk) {
    if ($DryRun) { Say "   (dry run) would download Node from nodejs.org/dist/$NodeLine into $NodeDir" }
    else {
      try { $sums = (Invoke-WebRequest -Uri "https://nodejs.org/dist/$NodeLine/SHASUMS256.txt" -UseBasicParsing).Content } catch { $sums = $null }
      if (-not $sums) { Fail 'Could not reach nodejs.org. Check your internet, then paste the same line again.'; return }
      $m = [regex]::Match($sums, "(?m)^([0-9a-f]{64})\s+(node-v[\d.]+-win-$NodeArch\.zip)\s*$")
      if (-not $m.Success) { Fail 'Could not find Node for this PC on nodejs.org.'; return }
      $sha = $m.Groups[1].Value; $file = $m.Groups[2].Value
      $tmp = Join-Path $env:TEMP ("studio-node-" + [guid]::NewGuid().ToString('N'))
      New-Item -ItemType Directory -Force -Path $tmp | Out-Null
      $zip = Join-Path $tmp $file
      Say "Downloading $file"
      if (-not (Get-Download "https://nodejs.org/dist/$NodeLine/$file" $zip)) { Fail 'The Node download failed. Paste the same line again.'; return }
      $got = (Get-FileHash -Path $zip -Algorithm SHA256).Hash
      if ($got -ne $sha) { Fail 'The Node download was damaged (checksum did not match). Paste the same line again.'; return }
      if (-not (Expand-Zip $zip $tmp)) { Fail 'Could not unpack Node.'; return }
      New-Item -ItemType Directory -Force -Path (Join-Path $Project 'runtime') | Out-Null
      if (Test-Path $NodeDir) { Remove-Item $NodeDir -Recurse -Force -ErrorAction SilentlyContinue }
      Move-Item -Path (Join-Path $tmp ($file -replace '\.zip$', '')) -Destination $NodeDir
      Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
      if (-not (Test-Path $NodeExe)) { Fail 'Could not put Node in the app folder.'; return }
      Ok "Node $(& $NodeExe -v) is ready"
      $NeedNpm = $true
    }
  }
  $env:Path = "$NodeDir;$env:Path"

  # ---------------------------------------------------------------- 3. Packages
  Step "3/6 The app's packages"
  if ($DryRun) { Say "   (dry run) would run npm install in $Project" }
  elseif ((Test-Path (Join-Path $Project 'node_modules\express')) -and -not $NeedNpm) { Ok 'Packages already installed' }
  else {
    Say 'Installing packages. This takes a minute.'
    Push-Location $Project
    & (Join-Path $NodeDir 'npm.cmd') install --no-audit --no-fund --no-update-notifier 2>&1 | ForEach-Object { Add-Content -Path $Log -Value "$_" }
    Pop-Location
    if (-not (Test-Path (Join-Path $Project 'node_modules\express'))) { Fail 'The packages did not install. Paste the same line again.'; return }
    Ok 'Packages installed'
  }
  $edge = Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'
  if (Test-AppInstalled 'Google Chrome') { Ok 'Google Chrome is there, so B-roll renders with it' }
  elseif ((Test-Path $edge) -or (Test-Path (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'))) { Ok 'B-roll renders with Microsoft Edge' }
  elseif ($DryRun) { Say '   (dry run) would download a rendering browser (npm run setup)' }
  else {
    Say 'No Chrome or Edge found, so downloading a rendering browser for the B-roll.'
    Push-Location $Project
    & (Join-Path $NodeDir 'npm.cmd') run setup 2>&1 | ForEach-Object { Add-Content -Path $Log -Value "$_" }
    Pop-Location
    if ($LASTEXITCODE -eq 0) { Ok 'Rendering browser installed' } else { Warn 'The rendering browser did not install. Install Google Chrome from https://www.google.com/chrome instead.' }
  }

  # ---------------------------------------------------------------- 4. Speech to text
  Step '4/6 Speech to text (whisper, runs on this PC for free)'
  # whisper.cpp Windows build (CPU, x64). Pinned so every student gets the same, checked file (same as Content Engine).
  $WhisperUrl = 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-x64.zip'
  $WhisperSha256 = '49dcc16de826f20bd53d44f947a1ae49dfa81f86cad67a64d80820cb192d674a'
  $ModelUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin'
  $WhisperDir = Join-Path $Project 'runtime\whisper'
  $WhisperExe = Join-Path $WhisperDir 'whisper-cli.exe'
  if (Test-Path $WhisperExe) { Ok 'whisper is ready' }
  elseif ($DryRun) { Say "   (dry run) would download whisper.cpp into $WhisperDir" }
  else {
    try {
      $zip = Join-Path $env:TEMP 'lfs-whisper-bin-x64.zip'
      $tmp = Join-Path $env:TEMP 'lfs-whisper-bin-x64'
      Invoke-WebRequest -Uri $WhisperUrl -OutFile $zip -UseBasicParsing
      $hash = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
      if ($hash -ne $WhisperSha256) { throw "download check failed (sha256 $hash)" }
      if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
      Expand-Archive -Path $zip -DestinationPath $tmp -Force
      $cli = Get-ChildItem $tmp -Recurse -Filter 'whisper-cli.exe' | Select-Object -First 1
      if (-not $cli) { throw 'whisper-cli.exe is not in the download' }
      New-Item -ItemType Directory -Force -Path $WhisperDir | Out-Null
      Copy-Item (Join-Path $cli.DirectoryName '*') $WhisperDir -Recurse -Force
      Get-ChildItem $WhisperDir -Recurse | Unblock-File
      Remove-Item $zip, $tmp -Recurse -Force -ErrorAction SilentlyContinue
      Ok 'whisper installed'
    } catch {
      Warn "whisper did not install ($($_.Exception.Message)). You can still use the app: in Settings, pick ElevenLabs for speech to text and add your key."
    }
  }
  $ModelDir = Join-Path $Project 'runtime\models'
  $Model = Join-Path $ModelDir 'ggml-small.en.bin'
  if ((Test-Path $Model) -and (Get-Item $Model).Length -gt 400MB) { Ok 'The speech model is there' }
  elseif ($DryRun) { Say "   (dry run) would download the speech model (about 470 MB) into $ModelDir" }
  else {
    New-Item -ItemType Directory -Force -Path $ModelDir | Out-Null
    Say 'Downloading the speech model (about 470 MB). This takes a few minutes.'
    $part = "$Model.part"
    if (Get-Command curl.exe -ErrorAction SilentlyContinue) { & curl.exe -fL --progress-bar -o $part $ModelUrl }
    else { try { Invoke-WebRequest -Uri $ModelUrl -OutFile $part -UseBasicParsing } catch {} }
    if ((Test-Path $part) -and (Get-Item $part).Length -gt 400MB) { Move-Item $part $Model -Force; Ok 'Speech model downloaded' }
    else { Remove-Item $part -Force -ErrorAction SilentlyContinue; Warn 'The speech model did not download. Paste the same line again to retry.' }
  }

  # ---------------------------------------------------------------- 5. Claude Code
  Step '5/6 Claude Code (plans and draws your B-roll with your Claude plan)'
  $LocalBin = Join-Path $Home_ '.local\bin'
  $ClaudeExe = Join-Path $LocalBin 'claude.exe'
  Update-SessionPath
  $env:Path = "$NodeDir;$env:Path"
  $hasClaude = { (Test-Path $ClaudeExe) -or [bool](Get-Command claude.exe -ErrorAction SilentlyContinue) }
  if (-not $Claude) { Say "Skipped. The app needs Claude Code for the B-roll plan and scenes." }
  else {
    if (& $hasClaude) { Ok 'Claude Code is already installed' }
    elseif ($DryRun) { Say '   (dry run) would install Git for Windows if missing, then run the Claude Code installer' }
    else {
      # Claude Code on Windows needs Git for Windows.
      if (-not ((Get-Command git.exe -ErrorAction SilentlyContinue) -or (Test-AppInstalled 'Git') -or (Test-AppInstalled 'Git version *'))) {
        Say 'Installing Git for Windows first (Claude Code needs it).'
        $done = Install-Winget 'Git.Git'
        if (-not $done) {
          try {
            $rel = Invoke-RestMethod 'https://api.github.com/repos/git-for-windows/git/releases/latest' -UseBasicParsing
            $asset = $rel.assets | Where-Object { $_.name -match '^Git-[\d.]+-64-bit\.exe$' } | Select-Object -First 1
            $f = Join-Path $env:TEMP 'git-64-bit.exe'
            if (Get-Download $asset.browser_download_url $f) {
              $p = Start-Process -FilePath $f -ArgumentList @('/VERYSILENT', '/NORESTART', '/SP-', '/CURRENTUSER') -Wait -PassThru
            }
          } catch { Add-Content -Path $Log -Value "git install: $($_.Exception.Message)" }
        }
        Update-SessionPath
        $env:Path = "$NodeDir;$env:Path"
        if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) { Warn 'Git for Windows did not install. Download it from https://git-scm.com/download/win, then paste the same line again.' }
      }
      # Its own PowerShell process, so nothing in Anthropic's script can close this window.
      $code = Invoke-Logged 'powershell.exe' @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'irm https://claude.ai/install.ps1 | iex')
      Update-SessionPath
      $env:Path = "$NodeDir;$env:Path"
      if (& $hasClaude) { Ok 'Claude Code installed' }
      else { Warn 'Claude Code did not install. The app needs it for the B-roll. Paste the same line again to retry.' }
    }
    # New windows (and the app) should find claude without a full path.
    if (& $hasClaude) {
      $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
      if (($userPath -split ';') -notcontains $LocalBin -and (Test-Path $ClaudeExe)) {
        if ($DryRun) { Say "   (dry run) would add $LocalBin to your PATH" }
        else { [Environment]::SetEnvironmentVariable('Path', ($(if ($userPath) { "$userPath;" } else { '' }) + $LocalBin), 'User') }
      }
    }
    $claudeCmd = if (Test-Path $ClaudeExe) { $ClaudeExe } else { 'claude.exe' }
    $loggedIn = { ((& $claudeCmd auth status 2>$null) -join ' ') -match '"loggedIn":\s*true' }
    if ($DryRun) { Say '   (dry run) would check the Claude login and open it if needed' }
    elseif (-not (& $hasClaude)) { }
    elseif (& $loggedIn) { Ok 'Claude Code is logged in' }
    elseif (-not $ClaudeLogin) { Warn 'Not logged in to Claude yet. Run: claude auth login' }
    else {
      Say 'Your browser opens next. Log in with the account that has your Claude Pro or Max plan and click Authorize.'
      Say 'If the browser shows a code instead, copy it, come back here, paste it and press Enter.'
      & $claudeCmd auth login --claudeai
      if (& $loggedIn) { Ok 'Claude Code is logged in' } else { Warn "Claude login did not finish. Paste the same line again to retry, or log in later from the app's Settings." }
    }
  }

  # ---------------------------------------------------------------- 6. Desktop shortcut + start
  Step '6/6 Desktop shortcut'
  $Desktop = [Environment]::GetFolderPath('Desktop')
  $lnk = Join-Path $Desktop 'Long-Form Studio.lnk'
  $StartCmd = Join-Path $Project 'Start Studio.cmd'
  if ($DryRun) { Say '   (dry run) would add "Long-Form Studio" to your Desktop' }
  else {
    try {
      $sh = New-Object -ComObject WScript.Shell
      $s = $sh.CreateShortcut($lnk); $s.TargetPath = $StartCmd; $s.WorkingDirectory = $Project
      $s.Save()
      Ok 'Added "Long-Form Studio" to your Desktop'
    } catch { Warn "Could not add the Desktop shortcut. Start the app with Start Studio.cmd in $Project instead." }
  }

  Write-Host ''
  if ($DryRun) {
    Write-Host 'Dry run finished. Nothing was installed or changed.' -ForegroundColor Green
    return
  }
  if ($script:Warned) {
    Write-Host 'Almost done. Something above is yellow. The app works, but read the yellow line. Pasting the same line again retries it.' -ForegroundColor Yellow
    Say "Still stuck? Email $Support and attach this file: $Log"
  } else {
    Write-Host 'Long-Form Studio is installed.' -ForegroundColor Green
  }
  Say "Your app folder: $Project"
  Say 'To start it any time, double-click "Long-Form Studio" on your Desktop.'
  Say 'A black window opens with it. Keep that window open while you use the app.'
  if ($StartApp) {
    Say ''
    Say 'Starting it now. Your browser opens in a few seconds.'
    Start-Process -FilePath $StartCmd -WorkingDirectory $Project
  }
}

Install-LongFormStudio
