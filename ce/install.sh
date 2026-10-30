#!/bin/bash
#
# install.sh — one-command install of everything Content Engine needs on a Mac (Phase 0).
#
# Students paste ONE line into Terminal:
#
#   /bin/bash -c "$(curl -fsSL https://builds.digicuratoragency.com/ce/install.sh)"
#
# (Same form Homebrew uses: the keyboard stays connected, so the Mac password and the
#  Claude login can be typed. `curl … | bash` would break both.)
#
# What it does, skipping anything already installed:
#   1. Homebrew (asks for the Mac password once; also installs Apple's command line tools)
#   2. Node.js and Python 3 (only when missing or too old)
#   3. Google Chrome and Antigravity IDE (only when missing)
#   4. Claude Code, plus the ~/.local/bin PATH line
#   5. Unzips the Content Engine ZIP from Downloads into the home folder, adds a Desktop
#      shortcut, and runs tools/setup.sh
#   6. Claude login (browser), if not logged in yet
#
# It never downloads Content Engine itself: it only unzips the ZIP the student already has.
# Safe to re-run: "paste the same line again" is the fix for most problems.
#
# Flags (testing / support):  --dry-run   say what would happen, change nothing
#                             --no-claude-login
#   With the one-liner:  /bin/bash -c "$(curl -fsSL …/install.sh)" _ --dry-run
#
# Canonical copy: ContentEngine_Chrome/tools/install.sh. The hosted copy at
# ness-build/ce/install.sh is copied from it by hand. Must stay bash 3.2 compatible
# (the bash built into macOS).

DRY_RUN=0
CLAUDE_LOGIN=1
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-claude-login) CLAUDE_LOGIN=0 ;;
  esac
done

SUPPORT="ness@digicuratoragency.com"
HUB_URL="https://hub.digicuratoragency.com/classroom/content-engine-chrome-extension"
FOLDER_NAME="content-engine-chrome"
LOG_DIR="$HOME/Library/Logs/ContentEngine"
LOG="$LOG_DIR/install.log"

mkdir -p "$LOG_DIR" 2>/dev/null
{ echo ""; echo "===== install.sh $(date '+%Y-%m-%d %H:%M:%S') dry_run=$DRY_RUN ====="; } >>"$LOG" 2>/dev/null

say()  { printf '%s\n' "$*"; printf '%s\n' "$*" >>"$LOG" 2>/dev/null; }
step() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; printf '\n▶ %s\n' "$*" >>"$LOG" 2>/dev/null; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; printf '✓ %s\n' "$*" >>"$LOG" 2>/dev/null; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$*"; printf '⚠ %s\n' "$*" >>"$LOG" 2>/dev/null; WARNED=1; }
stop() {
  printf '\n\033[1;31m✋ %s\033[0m\n' "$*"; printf '✋ %s\n' "$*" >>"$LOG" 2>/dev/null
  say "   Need help? Email $SUPPORT and attach this file: $LOG"
  exit 1
}

# Runs a command with its output on screen AND in the log; returns the command's exit code.
# In --dry-run it only says what it would run.
run() {
  if [ "$DRY_RUN" = 1 ]; then say "   (dry run) would run: $*"; return 0; fi
  "$@" 2>&1 | tee -a "$LOG"
  return "${PIPESTATUS[0]}"
}

WARNED=0
INSTALLED=""
ALREADY=""
did()  { INSTALLED="$INSTALLED
   • $*"; }
had()  { ALREADY="$ALREADY
   • $*"; }

printf '\n\033[1mContent Engine installer\033[0m\n'
say "This sets up your Mac for Content Engine. It takes 10 to 30 minutes the first time."
say "Leave this window open until you see the green \"Content Engine is installed\" message."
[ "$DRY_RUN" = 1 ] && say "(Dry run: nothing will be installed or changed.)"

# ---------------------------------------------------------------- 0. Checks
step "Checking your Mac"

[ "$(uname -s)" = "Darwin" ] || stop "This installer is for Mac only. On Windows or Linux, email $SUPPORT before you start."

MACOS="$(sw_vers -productVersion)"
MACOS_MAJOR="${MACOS%%.*}"
if [ "$MACOS_MAJOR" -lt 15 ] 2>/dev/null; then
  stop "Your Mac runs macOS $MACOS. Content Engine needs macOS 15 (Sequoia) or newer. Update it in System Settings, General, Software Update, then paste the same line again."
fi
ok "macOS $MACOS"

if [ "$(uname -m)" = "arm64" ]; then BREW_PREFIX="/opt/homebrew"; else BREW_PREFIX="/usr/local"; fi
BREW="$BREW_PREFIX/bin/brew"

# Where Content Engine is (or will be). Existing folders are used where they are: moving a folder
# that Chrome already loaded makes Chrome treat it as a new extension (and ask for the key again).
PROJECT=""
ZIP=""
PROJECT_STATE=""   # existing | move | unzip
if [ -f "$HOME/$FOLDER_NAME/tools/setup.sh" ]; then
  PROJECT="$HOME/$FOLDER_NAME"; PROJECT_STATE="existing"
elif [ -f "$HOME/Desktop/$FOLDER_NAME/tools/setup.sh" ]; then
  PROJECT="$HOME/Desktop/$FOLDER_NAME"; PROJECT_STATE="existing"
elif [ -f "$HOME/Downloads/$FOLDER_NAME/tools/setup.sh" ]; then
  # Safari unzips downloads by itself. Not set up yet = not loaded in Chrome yet, so it can move home.
  if [ -d "$HOME/Downloads/$FOLDER_NAME/backend/node_modules" ]; then
    PROJECT="$HOME/Downloads/$FOLDER_NAME"; PROJECT_STATE="existing"
  else
    PROJECT="$HOME/$FOLDER_NAME"; PROJECT_STATE="move"
  fi
else
  # Newest Content Engine ZIP in Downloads (browsers add " (1)" to repeat downloads).
  ZIP="$(ls -t "$HOME"/Downloads/content-engine-chrome*.zip 2>/dev/null | head -1)"
  if [ -n "$ZIP" ]; then PROJECT="$HOME/$FOLDER_NAME"; PROJECT_STATE="unzip"; fi
fi

case "$PROJECT_STATE" in
  existing) ok "Content Engine folder found: $PROJECT" ;;
  move)     ok "Content Engine folder found in Downloads (it will move to your home folder)" ;;
  unzip)    ok "Content Engine ZIP found: $(basename "$ZIP")" ;;
  *)        warn "No Content Engine ZIP in your Downloads folder yet. The tools will still install now."
            say  "   Afterwards, download the ZIP from the hub and paste the same line again." ;;
esac

FREE_GB="$(df -g "$HOME" | awk 'NR==2 {print $4}')"
MIN_GB="${CE_MIN_FREE_GB:-10}"   # override for testing only
if [ "$PROJECT_STATE" != "existing" ] && [ "${FREE_GB:-0}" -lt "$MIN_GB" ] 2>/dev/null; then
  stop "Your Mac has ${FREE_GB} GB free and Content Engine needs about 10 GB. Free up some space (empty the Trash, delete big downloads), then paste the same line again."
fi
ok "${FREE_GB} GB free"

if [ ! -x "$BREW" ] && ! id -Gn | tr ' ' '\n' | grep -qx admin; then
  stop "Your Mac account is not an administrator, and installing the tools needs one. Use an admin account (System Settings, Users & Groups), or ask the owner of this Mac to run the installer."
fi

# ---------------------------------------------------------------- 1. Mac password (once)
SUDO_PID=""
cleanup() { [ -n "$SUDO_PID" ] && kill "$SUDO_PID" 2>/dev/null; }
trap cleanup EXIT

if [ ! -x "$BREW" ] && [ "$DRY_RUN" = 0 ]; then
  step "Your Mac password"
  say "Type the password you use to log in to this Mac, then press Enter."
  say "Nothing shows on screen while you type. That's normal."
  sudo -v || stop "The password wasn't accepted. Paste the same line again and retype it."
  # Keep the password remembered until this script ends (Homebrew can take 15 minutes).
  ( while true; do sudo -n true 2>/dev/null; sleep 50; kill -0 "$$" 2>/dev/null || exit; done ) &
  SUDO_PID=$!
fi

# ---------------------------------------------------------------- 2. Homebrew
step "1/6 Homebrew"
if [ -x "$BREW" ]; then
  ok "Homebrew already installed"; had "Homebrew"
else
  say "Installing Homebrew and Apple's command line tools. This is the slow part: 5 to 15 minutes."
  if [ "$DRY_RUN" = 1 ]; then
    say "   (dry run) would run the Homebrew installer from brew.sh"
  else
    NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" 2>&1 | tee -a "$LOG"
    [ -x "$BREW" ] || stop "Homebrew didn't finish installing. Check your internet connection, then paste the same line again."
    did "Homebrew"
  fi
fi

# Same as the "Next steps" lines Homebrew prints: brew on PATH now, and in every new Terminal.
if [ -x "$BREW" ]; then eval "$("$BREW" shellenv)"; fi
if ! grep -qs "brew shellenv" "$HOME/.zprofile"; then
  if [ "$DRY_RUN" = 1 ]; then say "   (dry run) would add Homebrew to ~/.zprofile"
  else printf '\neval "$(%s shellenv)"\n' "$BREW" >>"$HOME/.zprofile"; fi
fi

# ---------------------------------------------------------------- 3. Node.js + Python
step "2/6 Node.js and Python"
NODE_MAJOR="$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/')"
if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
  ok "Node.js $(node -v) already installed"; had "Node.js $(node -v)"
else
  run brew install node || stop "Node.js didn't install. Paste the same line again."
  hash -r; did "Node.js"
fi

if python3 -c 'import sys; sys.exit(sys.version_info < (3, 10))' >/dev/null 2>&1; then
  ok "$(python3 --version 2>&1) already installed"; had "$(python3 --version 2>&1)"
else
  # macOS's own python3 is 3.9, too old. Homebrew's comes first on PATH once installed.
  run brew install python || stop "Python didn't install. Paste the same line again."
  hash -r; did "Python 3"
fi

# ---------------------------------------------------------------- 4. Chrome + Antigravity
step "3/6 Google Chrome and Antigravity IDE"
# True when an app matching the pattern is in /Applications or ~/Applications.
app_installed() {
  local d a
  for d in /Applications "$HOME/Applications"; do
    for a in "$d"/*.app; do
      case "${a##*/}" in $1) return 0 ;; esac
    done
  done
  return 1
}

if app_installed "Google Chrome.app"; then
  ok "Google Chrome already installed"; had "Google Chrome"
elif run brew install --cask google-chrome; then
  did "Google Chrome"
else
  warn "Google Chrome didn't install. Download it from https://www.google.com/chrome instead."
fi

if app_installed "Antigravity*.app"; then
  ok "Antigravity already installed"; had "Antigravity IDE"
elif run brew install --cask antigravity-ide; then
  did "Antigravity IDE"
else
  warn "Antigravity didn't install. Download Antigravity IDE (Standalone) from https://antigravity.google/product/antigravity-ide instead."
fi

# ---------------------------------------------------------------- 5. Claude Code
step "4/6 Claude Code"
export PATH="$HOME/.local/bin:$PATH"
if command -v claude >/dev/null 2>&1; then
  ok "Claude Code already installed"; had "Claude Code"
else
  if [ "$DRY_RUN" = 1 ]; then
    say "   (dry run) would run: curl -fsSL https://claude.ai/install.sh | bash"
  else
    curl -fsSL https://claude.ai/install.sh | bash 2>&1 | tee -a "$LOG"
    hash -r
    command -v claude >/dev/null 2>&1 || stop "Claude Code didn't install. Check your internet connection, then paste the same line again."
    did "Claude Code"
  fi
fi
# The Claude Code installer doesn't add ~/.local/bin to PATH for new Terminal windows.
if ! grep -qs '\.local/bin' "$HOME/.zshrc"; then
  if [ "$DRY_RUN" = 1 ]; then say "   (dry run) would add ~/.local/bin to ~/.zshrc"
  else printf '\nexport PATH="$HOME/.local/bin:$PATH"\n' >>"$HOME/.zshrc"; fi
fi

# ---------------------------------------------------------------- 6. Content Engine folder
step "5/6 Content Engine"
SETUP_OK=0
if [ -z "$PROJECT_STATE" ]; then
  warn "Skipped: no Content Engine ZIP in Downloads yet."
else
  if [ "$PROJECT_STATE" = "unzip" ]; then
    say "Unzipping $(basename "$ZIP") into your home folder"
    run ditto -x -k "$ZIP" "$HOME"
    if [ "$DRY_RUN" = 0 ] && [ ! -f "$PROJECT/tools/setup.sh" ]; then
      stop "That ZIP doesn't look like Content Engine. Download it again from the hub, then paste the same line again."
    fi
  elif [ "$PROJECT_STATE" = "move" ]; then
    say "Moving content-engine-chrome from Downloads into your home folder"
    run mv "$HOME/Downloads/$FOLDER_NAME" "$PROJECT"
  fi

  # Files from a downloaded ZIP are marked "from the internet", so macOS would block the
  # double-click start files. This folder came from the student's own purchase.
  run xattr -dr com.apple.quarantine "$PROJECT"

  # Desktop shortcut (a Finder alias would make macOS ask permission to control Finder; a link doesn't).
  case "$PROJECT" in
    "$HOME/Desktop/"*) ;;
    *) if [ ! -e "$HOME/Desktop/Content Engine" ]; then
         run ln -s "$PROJECT" "$HOME/Desktop/Content Engine" && say "Added a \"Content Engine\" shortcut to your Desktop"
       fi ;;
  esac

  say "Installing Content Engine's own tools (captions, video renderer, web captures). 5 to 10 minutes."
  if [ "$DRY_RUN" = 1 ]; then
    say "   (dry run) would run: bash tools/setup.sh"; SETUP_OK=1
  else
    SETUP_OUT="$(mktemp -t ce-setup)"
    bash "$PROJECT/tools/setup.sh" 2>&1 | tee "$SETUP_OUT" | tee -a "$LOG"
    if [ "${PIPESTATUS[0]}" = 0 ] && ! grep -q '⚠' "$SETUP_OUT"; then
      SETUP_OK=1; ok "Content Engine set up in $PROJECT"
    else
      warn "Part of the Content Engine setup didn't finish (the yellow lines above say which)."
    fi
    rm -f "$SETUP_OUT"
  fi
fi

# ---------------------------------------------------------------- 7. Claude login
step "6/6 Claude login"
if [ "$DRY_RUN" = 1 ]; then
  say "   (dry run) would check claude auth status and open the Claude login if needed"
elif ! command -v claude >/dev/null 2>&1; then
  warn "Claude Code isn't installed, so there's nothing to log in to yet."
elif claude auth status 2>/dev/null | grep -q '"loggedIn": *true'; then
  ok "Claude Code is logged in"
elif [ "$CLAUDE_LOGIN" = 0 ]; then
  warn "Not logged in to Claude yet. Run: claude auth login"
else
  say "Your browser opens next. Log in with the account that has your Claude Pro or Max plan and click Authorize."
  say "If the browser shows a code instead, copy it, come back here, paste it and press Enter."
  claude auth login --claudeai </dev/tty
  if claude auth status 2>/dev/null | grep -q '"loggedIn": *true'; then
    ok "Claude Code is logged in"
  else
    warn "Claude login didn't finish. Paste the same line again to retry."
  fi
fi

# ---------------------------------------------------------------- Done
echo ""
if [ "$DRY_RUN" = 1 ]; then
  if [ -n "$INSTALLED" ]; then say "Would install:$INSTALLED"; fi
elif [ -n "$INSTALLED" ]; then say "Installed just now:$INSTALLED"; fi
if [ -n "$ALREADY" ];  then say "Already on your Mac:$ALREADY"; fi

if [ -z "$PROJECT_STATE" ]; then
  printf '\n\033[1;32m✅ Your tools are installed.\033[0m\n'
  say "Next: download the Content Engine ZIP from the hub into your Downloads folder,"
  say "then paste the same line into Terminal again. It picks up where it left off."
  say "   $HUB_URL"
  exit 0
fi

if [ "$WARNED" = 1 ] || [ "$SETUP_OK" = 0 ]; then
  printf '\n\033[1;33mAlmost done.\033[0m Something above is yellow. Paste the same line again: it skips what worked and retries the rest.\n'
  say "Still stuck after a second try? Email $SUPPORT and attach this file: $LOG"
  exit 1
fi

printf '\n\033[1;32m✅ Content Engine is installed.\033[0m\n'
case "$PROJECT" in
  "$HOME/Desktop/"*) say "Your folder: $PROJECT" ;;
  *) say "Your folder: $PROJECT (shortcut on your Desktop: \"Content Engine\")" ;;
esac
say ""
say "Next, in the course:"
say "  1. Phase 1 and 2: set up Airtable and paste your keys into backend/.env"
say "  2. Load the extension: chrome://extensions, Developer mode on, Load unpacked, pick the extension folder"
say "  3. Double-click \"Start at login\" in the folder once, so Content Engine starts by itself"
exit 0
