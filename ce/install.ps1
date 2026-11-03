# install.ps1 - one-command install of everything Content Engine needs on Windows (Phase 0).
# The Windows twin of tools/install.sh.
#
# Students paste ONE line into PowerShell (Start menu, type PowerShell, press Enter):
#
#   irm https://builds.digicuratoragency.com/ce/install.ps1 | iex
#
# What it does, skipping anything already installed:
#   1. Microsoft Visual C++ runtime (whisper needs it)
#   2. Node.js and Python 3.12 (only when missing or too old)
#   3. Git for Windows (Claude Code needs it on Windows)
#   4. Google Chrome and Antigravity IDE (only when missing)
#   5. Claude Code, plus its folder on the PATH
#   6. Unzips the Content Engine ZIP from Downloads into the home folder, adds a Desktop
#      shortcut, and runs tools\setup.ps1
#   7. Claude login (browser), if not logged in yet
#
# It never downloads Content Engine itself: it only unzips the ZIP the student already has.
# Safe to re-run: "paste the same line again" is the fix for most problems.
#
# Testing / support, set before the one-liner:
#   $env:CE_DRY_RUN = '1'          say what would happen, change nothing
#   $env:CE_NO_CLAUDE_LOGIN = '1'  skip the Claude login step
#   $env:CE_NO_WINGET = '1'        ignore winget and use the direct downloads (what a PC without winget gets)
#
# Canonical copy: ContentEngine_Chrome/tools/install.ps1. The hosted copy at
# ness-build/ce/install.ps1 is copied from it by hand.
#
# Rules for this file: ASCII only (Windows PowerShell 5.1 reads text without a BOM as ANSI,
# and irm decodes a text/plain download as Latin-1), Windows PowerShell 5.1 syntax, and no
# "exit" outside the function (with "| iex" it would close the student's window).

function Install-ContentEngine {
  $DryRun = ($env:CE_DRY_RUN -eq '1')
  $ClaudeLogin = ($env:CE_NO_CLAUDE_LOGIN -ne '1')
  $ErrorActionPreference = 'Continue'
  $ProgressPreference = 'SilentlyContinue'
  try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

  $Support = 'ness@digicuratoragency.com'
  $HubUrl = 'https://hub.digicuratoragency.com/classroom/content-engine-chrome-extension'
  $FolderName = 'content-engine-chrome'
  $LogDir = Join-Path $env:LOCALAPPDATA 'ContentEngine'
  $Log = Join-Path $LogDir 'install.log'
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  Add-Content -Path $Log -Value "`r`n===== install.ps1 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') dry_run=$DryRun ====="

  $script:Warned = $false
  $script:Installed = @()
  $script:Already = @()
  function Say($t)  { Write-Host $t; Add-Content -Path $Log -Value $t }
  function Step($t) { Write-Host ''; Write-Host ">> $t" -ForegroundColor Cyan; Add-Content -Path $Log -Value "`r`n>> $t" }
  function Ok($t)   { Write-Host "[OK] $t" -ForegroundColor Green; Add-Content -Path $Log -Value "[OK] $t" }
  function Warn($t) { Write-Host "[!] $t" -ForegroundColor Yellow; Add-Content -Path $Log -Value "[!] $t"; $script:Warned = $true }
  function Did($t)  { $script:Installed += $t }
  function Had($t)  { $script:Already += $t }
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

  # Is a program listed in Settings > Apps (any of the three uninstall lists)?
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
  if ($env:CE_NO_WINGET -ne '1') { $Winget = Get-Command winget.exe -ErrorAction SilentlyContinue }

  # winget install, quietly. 0 = installed; -1978335189 / -1978335135 = already installed / nothing newer.
  function Install-Winget([string]$Id, [string[]]$Extra = @()) {
    if (-not $Winget) { return $false }
    $a = @('install', '--id', $Id, '-e', '--silent', '--accept-source-agreements', '--accept-package-agreements', '--disable-interactivity') + $Extra
    $code = Invoke-Logged 'winget.exe' $a
    Update-SessionPath
    return ($code -eq 0 -or $code -eq -1978335189 -or $code -eq -1978335135)
  }

  # Download a file to TEMP. Returns the path or $null.
  function Get-Download([string]$Url, [string]$Name) {
    $out = Join-Path $env:TEMP $Name
    try { Invoke-WebRequest -Uri $Url -OutFile $out -UseBasicParsing; return $out } catch { Add-Content -Path $Log -Value "download failed: $Url $($_.Exception.Message)"; return $null }
  }

  # Run an installer and wait. -Admin shows the Windows "Do you want to allow..." prompt.
  function Start-Installer([string]$File, [string[]]$Arguments, [switch]$Admin) {
    try {
      $p = if ($Admin) { Start-Process -FilePath $File -ArgumentList $Arguments -Verb RunAs -Wait -PassThru }
           else { Start-Process -FilePath $File -ArgumentList $Arguments -Wait -PassThru }
      Update-SessionPath
      return ($p.ExitCode -eq 0 -or $p.ExitCode -eq 3010)   # 3010 = done, restart later
    } catch {
      Add-Content -Path $Log -Value "installer failed: $File $($_.Exception.Message)"
      return $false
    }
  }

  # A real Python 3.10 to 3.13 (same rule as tools\setup.ps1; the Microsoft Store stand-in doesn't count,
  # and 3.14+ has no wheels yet for some packages).
  function Find-Python {
    $candidates = @()
    foreach ($v in '3.12', '3.13', '3.11', '3.10') {
      try { $p = & py "-$v" -c 'import sys; print(sys.executable)' 2>$null; if ($LASTEXITCODE -eq 0 -and $p) { $candidates += $p.Trim() } } catch {}
    }
    foreach ($d in "$env:LOCALAPPDATA\Programs\Python", "$env:ProgramFiles") {
      Get-ChildItem $d -Directory -Filter 'Python3*' -ErrorAction SilentlyContinue | Sort-Object Name -Descending |
        ForEach-Object { $exe = Join-Path $_.FullName 'python.exe'; if (Test-Path $exe) { $candidates += $exe } }
    }
    $onPath = Get-Command python.exe -ErrorAction SilentlyContinue | Where-Object { $_.Source -notmatch 'WindowsApps' }
    if ($onPath) { $candidates += $onPath.Source }
    foreach ($c in $candidates) {
      try { & $c -c 'import sys; sys.exit(0 if (3, 10) <= sys.version_info[:2] <= (3, 13) else 1)' 2>$null; if ($LASTEXITCODE -eq 0) { return $c } } catch {}
    }
    return $null
  }

  Write-Host ''
  Write-Host 'Content Engine installer' -ForegroundColor White
  Say 'This sets up your PC for Content Engine. It takes 10 to 30 minutes the first time.'
  Say 'Leave this window open until you see the green "Content Engine is installed" message.'
  Say 'Windows may ask "Do you want to allow this app to make changes?" a few times. Click Yes each time.'
  if ($DryRun) { Say '(Dry run: nothing will be installed or changed.)' }

  # ---------------------------------------------------------------- 0. Checks
  Step 'Checking your PC'
  $os = Get-CimInstance Win32_OperatingSystem
  $build = [int]$os.BuildNumber
  if ($build -lt 19045) {
    Fail "Your PC runs $($os.Caption) (build $build). Content Engine needs Windows 11, or Windows 10 version 22H2. Update it in Settings, Windows Update, then paste the same line again."
    return
  }
  $arch = (Get-CimInstance Win32_Processor | Select-Object -First 1).Architecture
  if (-not [Environment]::Is64BitOperatingSystem -or $arch -ne 9) {
    Fail "Content Engine needs 64-bit Windows on an Intel or AMD processor. This PC has a different processor (ARM). Email $Support before you go further."
    return
  }
  Ok "$($os.Caption) (build $build), 64-bit"

  # Where Content Engine is (or will be). Existing folders are used where they are: moving a folder
  # that Chrome already loaded makes Chrome treat it as a new extension (and ask for the key again).
  $Home_ = $env:USERPROFILE
  $Desktop = [Environment]::GetFolderPath('Desktop')
  $Downloads = Join-Path $Home_ 'Downloads'
  try { $dl = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders' -ErrorAction Stop).'{374DE290-123F-4565-9164-39C4925E467B}'; if ($dl) { $Downloads = [Environment]::ExpandEnvironmentVariables($dl) } } catch {}
  $Project = Join-Path $Home_ $FolderName
  $Zip = $null
  $MoveFrom = $null
  $State = ''   # existing | move | unzip
  $isCE = { param($d) (Test-Path (Join-Path $d 'backend\server.js')) -and (Test-Path (Join-Path $d 'extension\manifest.json')) }

  if (& $isCE $Project) { $State = 'existing' }
  elseif (& $isCE (Join-Path $Desktop $FolderName)) { $Project = Join-Path $Desktop $FolderName; $State = 'existing' }
  else {
    # "Extract All" in File Explorer makes Downloads\<zip name>\content-engine-chrome.
    $unzipped = @(Join-Path $Downloads $FolderName) + @(Get-ChildItem $Downloads -Directory -Filter "$FolderName*" -ErrorAction SilentlyContinue | ForEach-Object { Join-Path $_.FullName $FolderName })
    $found = $unzipped | Where-Object { & $isCE $_ } | Select-Object -First 1
    if ($found) {
      if (Test-Path (Join-Path $found 'backend\node_modules')) { $Project = $found; $State = 'existing' }
      else { $MoveFrom = $found; $State = 'move' }
    } else {
      $z = Get-ChildItem $Downloads -File -Filter "$FolderName*.zip" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      if ($z) { $Zip = $z.FullName; $State = 'unzip' }
    }
  }
  $hasWindowsSetup = { param($d) Test-Path (Join-Path $d 'tools\setup.ps1') }
  switch ($State) {
    'existing' {
      if (-not (& $hasWindowsSetup $Project)) {
        Fail "Your Content Engine folder ($Project) is an older version without Windows support. Rename that folder, download the newest ZIP from the hub into Downloads, then paste the same line again."
        return
      }
      Ok "Content Engine folder found: $Project"
    }
    'move' {
      if (-not (& $hasWindowsSetup $MoveFrom)) {
        Fail "The Content Engine folder in Downloads ($MoveFrom) is an older version without Windows support. Delete it, download the newest ZIP from the hub, then paste the same line again."
        return
      }
      Ok 'Content Engine folder found in Downloads (it will move to your home folder)'
    }
    'unzip' { Ok "Content Engine ZIP found: $(Split-Path -Leaf $Zip)" }
    default {
      Warn 'No Content Engine ZIP in your Downloads folder yet. The tools will still install now.'
      Say  '   Afterwards, download the ZIP from the hub and paste the same line again.'
    }
  }

  $drive = Get-PSDrive -Name ($Home_.Substring(0, 1)) -ErrorAction SilentlyContinue
  $freeGb = if ($drive) { [math]::Floor($drive.Free / 1GB) } else { 999 }
  $minGb = if ($env:CE_MIN_FREE_GB) { [int]$env:CE_MIN_FREE_GB } else { 10 }
  if ($State -ne 'existing' -and $freeGb -lt $minGb) {
    Fail "Your PC has $freeGb GB free and Content Engine needs about 10 GB. Free up some space (empty the Recycle Bin, delete big downloads), then paste the same line again."
    return
  }
  Ok "$freeGb GB free"

  $isAdminGroup = ((whoami /groups) -match 'S-1-5-32-544').Count -gt 0
  if (-not $isAdminGroup) {
    Warn 'Your Windows account is not an administrator. Some tools may not install. If they fail, use an admin account or ask the owner of this PC.'
  }
  if ($Winget) { Ok 'winget found' } else { Say '   winget not found: the tools download straight from their makers instead.' }

  # ---------------------------------------------------------------- 1. Visual C++ runtime
  Step '1/7 Microsoft Visual C++ runtime'
  $vc = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64' -ErrorAction SilentlyContinue
  if ($vc -and $vc.Installed -eq 1) { Ok 'Visual C++ runtime already installed'; Had 'Visual C++ runtime' }
  elseif ($DryRun) { Say '   (dry run) would install the Visual C++ runtime'; Did 'Visual C++ runtime' }
  else {
    $done = Install-Winget 'Microsoft.VCRedist.2015+.x64'
    if (-not $done) { $f = Get-Download 'https://aka.ms/vs/17/release/vc_redist.x64.exe' 'vc_redist.x64.exe'; if ($f) { $done = Start-Installer $f @('/install', '/quiet', '/norestart') -Admin } }
    if ($done) { Did 'Visual C++ runtime' } else { Warn 'The Visual C++ runtime did not install. Captions may fall back to even spacing.' }
  }

  # ---------------------------------------------------------------- 2. Node.js + Python
  Step '2/7 Node.js and Python'
  Update-SessionPath
  $nodeMajor = 0
  try { $v = & node.exe -v 2>$null; if ($v -match '^v(\d+)') { $nodeMajor = [int]$Matches[1] } } catch {}
  if ($nodeMajor -ge 18) { Ok "Node.js $v already installed"; Had "Node.js $v" }
  elseif ($DryRun) { Say '   (dry run) would install Node.js LTS'; Did 'Node.js' }
  else {
    $done = Install-Winget 'OpenJS.NodeJS.LTS'
    if (-not $done) {
      try {
        $lts = (Invoke-RestMethod 'https://nodejs.org/dist/index.json' -UseBasicParsing) | Where-Object { $_.lts } | Select-Object -First 1
        $f = Get-Download "https://nodejs.org/dist/$($lts.version)/node-$($lts.version)-x64.msi" 'node-lts-x64.msi'
        if ($f) { $done = Start-Installer 'msiexec.exe' @('/i', "`"$f`"", '/qn', '/norestart') -Admin }
      } catch {}
    }
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { Fail 'Node.js did not install. Check your internet connection, then paste the same line again.'; return }
    Did 'Node.js'
  }

  $py = Find-Python
  if ($py) { Ok "Python already installed ($py)"; Had 'Python 3' }
  elseif ($DryRun) { Say '   (dry run) would install Python 3.12'; Did 'Python 3.12' }
  else {
    $done = Install-Winget 'Python.Python.3.12' @('--scope', 'user')
    if (-not $done) {
      $f = Get-Download 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe' 'python-3.12.10-amd64.exe'
      if ($f) { $done = Start-Installer $f @('/quiet', 'InstallAllUsers=0', 'PrependPath=1', 'Include_launcher=1', 'InstallLauncherAllUsers=0', 'Include_test=0') }
    }
    if (-not (Find-Python)) { Fail 'Python did not install. Check your internet connection, then paste the same line again.'; return }
    Did 'Python 3.12'
  }

  # ---------------------------------------------------------------- 3. Git
  Step '3/7 Git for Windows'
  if ((Get-Command git.exe -ErrorAction SilentlyContinue) -or (Test-AppInstalled 'Git') -or (Test-AppInstalled 'Git version *')) { Ok 'Git already installed'; Had 'Git for Windows' }
  elseif ($DryRun) { Say '   (dry run) would install Git for Windows'; Did 'Git for Windows' }
  else {
    $done = Install-Winget 'Git.Git'
    if (-not $done) {
      try {
        $rel = Invoke-RestMethod 'https://api.github.com/repos/git-for-windows/git/releases/latest' -UseBasicParsing
        $asset = $rel.assets | Where-Object { $_.name -match '^Git-[\d.]+-64-bit\.exe$' } | Select-Object -First 1
        $f = Get-Download $asset.browser_download_url 'git-64-bit.exe'
        if ($f) { $done = Start-Installer $f @('/VERYSILENT', '/NORESTART', '/SP-', '/CURRENTUSER') }
      } catch {}
    }
    Update-SessionPath
    if (Get-Command git.exe -ErrorAction SilentlyContinue) { Did 'Git for Windows' }
    else { Warn 'Git for Windows did not install. Download it from https://git-scm.com/download/win instead.' }
  }

  # ---------------------------------------------------------------- 4. Chrome + Antigravity
  Step '4/7 Google Chrome and Antigravity IDE'
  if (Test-AppInstalled 'Google Chrome') { Ok 'Google Chrome already installed'; Had 'Google Chrome' }
  elseif ($DryRun) { Say '   (dry run) would install Google Chrome'; Did 'Google Chrome' }
  else {
    $done = Install-Winget 'Google.Chrome'
    if (-not $done) { $f = Get-Download 'https://dl.google.com/chrome/install/latest/chrome_installer.exe' 'chrome_installer.exe'; if ($f) { $done = Start-Installer $f @('/silent', '/install') } }
    if ($done -or (Test-AppInstalled 'Google Chrome')) { Did 'Google Chrome' }
    else { Warn 'Google Chrome did not install. Download it from https://www.google.com/chrome instead.' }
  }

  if (Test-AppInstalled 'Antigravity IDE*') { Ok 'Antigravity already installed'; Had 'Antigravity IDE' }
  elseif ($DryRun) { Say '   (dry run) would install Antigravity IDE'; Did 'Antigravity IDE' }
  else {
    $done = Install-Winget 'Google.AntigravityIDE'
    if ($done -or (Test-AppInstalled 'Antigravity IDE*')) { Did 'Antigravity IDE' }
    else { Warn 'Antigravity did not install. Download Antigravity IDE from https://antigravity.google/product/antigravity-ide instead.' }
  }

  # ---------------------------------------------------------------- 5. Claude Code
  Step '5/7 Claude Code'
  $LocalBin = Join-Path $Home_ '.local\bin'
  $ClaudeExe = Join-Path $LocalBin 'claude.exe'
  Update-SessionPath
  if ((Test-Path $ClaudeExe) -or (Get-Command claude.exe -ErrorAction SilentlyContinue)) { Ok 'Claude Code already installed'; Had 'Claude Code' }
  elseif ($DryRun) { Say '   (dry run) would run the Claude Code installer (irm https://claude.ai/install.ps1 | iex)'; Did 'Claude Code' }
  else {
    # Its own window process, so nothing in Anthropic's script can close this one.
    $code = Invoke-Logged 'powershell.exe' @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'irm https://claude.ai/install.ps1 | iex')
    Update-SessionPath
    if (-not ((Test-Path $ClaudeExe) -or (Get-Command claude.exe -ErrorAction SilentlyContinue))) { Fail 'Claude Code did not install. Check your internet connection, then paste the same line again.'; return }
    Did 'Claude Code'
  }
  # New windows and the Content Engine backend should find claude without a full path.
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if (($userPath -split ';') -notcontains $LocalBin) {
    if ($DryRun) { Say "   (dry run) would add $LocalBin to your PATH" }
    else { [Environment]::SetEnvironmentVariable('Path', ($(if ($userPath) { "$userPath;" } else { '' }) + $LocalBin), 'User'); Update-SessionPath }
  }

  # ---------------------------------------------------------------- 6. Content Engine folder
  Step '6/7 Content Engine'
  $SetupOk = $false
  if (-not $State) {
    Warn 'Skipped: no Content Engine ZIP in Downloads yet.'
  } else {
    if ($State -eq 'unzip') {
      Say "Unzipping $(Split-Path -Leaf $Zip) into your home folder"
      if ($DryRun) { Say "   (dry run) would unzip into $Home_" }
      else {
        Unblock-File -Path $Zip -ErrorAction SilentlyContinue
        try { Expand-Archive -Path $Zip -DestinationPath $Home_ -Force } catch { Add-Content -Path $Log -Value "Expand-Archive: $($_.Exception.Message)" }
        if (-not (& $isCE $Project) -or -not (& $hasWindowsSetup $Project)) {
          Fail "That ZIP doesn't look like the newest Content Engine. Download it again from the hub, then paste the same line again."
          return
        }
      }
    } elseif ($State -eq 'move') {
      Say 'Moving content-engine-chrome from Downloads into your home folder'
      if ($DryRun) { Say "   (dry run) would move $MoveFrom to $Project" }
      else { Move-Item -Path $MoveFrom -Destination $Project }
    }

    # Files from a downloaded ZIP are marked "from the internet", and Windows would block the
    # double-click start files. This folder came from the student's own purchase.
    if (-not $DryRun) { Get-ChildItem $Project -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue }

    # Desktop shortcut to the folder.
    $lnk = Join-Path $Desktop 'Content Engine.lnk'
    if (-not $Project.StartsWith($Desktop) -and -not (Test-Path $lnk)) {
      if ($DryRun) { Say '   (dry run) would add a "Content Engine" shortcut to your Desktop' }
      else {
        try {
          $sh = New-Object -ComObject WScript.Shell
          $s = $sh.CreateShortcut($lnk); $s.TargetPath = $Project; $s.Save()
          Say 'Added a "Content Engine" shortcut to your Desktop'
        } catch { Add-Content -Path $Log -Value "shortcut: $($_.Exception.Message)" }
      }
    }

    Say "Installing Content Engine's own tools (captions, video renderer, web captures). 5 to 10 minutes."
    if ($DryRun) { Say '   (dry run) would run tools\setup.ps1'; $SetupOk = $true }
    else {
      $code = Invoke-Logged 'powershell.exe' @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $Project 'tools\setup.ps1'))
      if ($code -eq 0) { $SetupOk = $true; Ok "Content Engine set up in $Project" }
      else { Warn "Part of the Content Engine setup didn't finish (the [!] lines above say which)." }
    }
  }

  # ---------------------------------------------------------------- 7. Claude login
  Step '7/7 Claude login'
  $claude = if (Test-Path $ClaudeExe) { $ClaudeExe } else { 'claude.exe' }
  $loggedIn = { ((& $claude auth status 2>$null) -join ' ') -match '"loggedIn":\s*true' }
  if ($DryRun) { Say '   (dry run) would check claude auth status and open the Claude login if needed' }
  elseif (-not ((Test-Path $ClaudeExe) -or (Get-Command claude.exe -ErrorAction SilentlyContinue))) { Warn "Claude Code isn't installed, so there's nothing to log in to yet." }
  elseif (& $loggedIn) { Ok 'Claude Code is logged in' }
  elseif (-not $ClaudeLogin) { Warn 'Not logged in to Claude yet. Run: claude auth login' }
  else {
    Say 'Your browser opens next. Log in with the account that has your Claude Pro or Max plan and click Authorize.'
    Say 'If the browser shows a code instead, copy it, come back here, paste it and press Enter.'
    & $claude auth login --claudeai
    if (& $loggedIn) { Ok 'Claude Code is logged in' } else { Warn "Claude login didn't finish. Paste the same line again to retry." }
  }

  # ---------------------------------------------------------------- Done
  Write-Host ''
  if ($script:Installed.Count) { Say ($(if ($DryRun) { 'Would install:' } else { 'Installed just now:' })); $script:Installed | ForEach-Object { Say "   * $_" } }
  if ($script:Already.Count) { Say 'Already on your PC:'; $script:Already | ForEach-Object { Say "   * $_" } }

  if (-not $State) {
    Write-Host ''; Write-Host 'Your tools are installed.' -ForegroundColor Green
    Say 'Next: download the Content Engine ZIP from the hub into your Downloads folder,'
    Say 'then paste the same line into PowerShell again. It picks up where it left off.'
    Say "   $HubUrl"
    return
  }

  if ($script:Warned -or -not $SetupOk) {
    Write-Host ''; Write-Host 'Almost done. Something above is yellow. Paste the same line again: it skips what worked and retries the rest.' -ForegroundColor Yellow
    Say "Still stuck after a second try? Email $Support and attach this file: $Log"
    return
  }

  if ($DryRun) {
    Write-Host ''; Write-Host 'Dry run finished. Nothing was installed or changed.' -ForegroundColor Green
    Say 'Run the same line without $env:CE_DRY_RUN in a new PowerShell window to install for real.'
    return
  }
  Write-Host ''; Write-Host 'Content Engine is installed.' -ForegroundColor Green
  if ($Project.StartsWith($Desktop)) { Say "Your folder: $Project" }
  else { Say "Your folder: $Project (shortcut on your Desktop: ""Content Engine"")" }
  Say ''
  Say 'Next, in the course:'
  Say '  1. Phase 1 and 2: set up Airtable and paste your keys into backend\.env'
  Say '  2. Load the extension: chrome://extensions, Developer mode on, Load unpacked, pick the extension folder'
  Say '  3. Double-click "Start at login" in the folder once, so Content Engine starts by itself'
}

Install-ContentEngine
