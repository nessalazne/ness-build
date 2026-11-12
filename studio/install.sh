#!/bin/bash
#
# install.sh: one-line install of Reel & Carousel Studio on a Mac.
#
# Students paste ONE line into Terminal:
#
#   /bin/bash -c "$(curl -fsSL https://builds.digicuratoragency.com/studio/install.sh)"
#
# (Same form Homebrew uses: the keyboard stays connected, so the Claude login works.)
#
# What it does, skipping anything already done:
#   1. Finds the Reel & Carousel Studio ZIP in Downloads and puts the app in ~/reel-carousel-studio.
#      If the app is already there and a newer ZIP is in Downloads, it updates the app and keeps
#      the data folder (settings, keys, carousels, trial reels).
#   2. A private copy of Node inside the app folder (runtime/node). No Mac password, no Homebrew,
#      nothing installed system-wide.
#   3. The app's own packages (npm install), plus a rendering browser if Google Chrome is missing.
#   4. Claude Code (only when missing) and the Claude login.
#   5. A "Reel & Carousel Studio" launcher on the Desktop, then it starts the app.
#
# It never downloads the app itself: it only unzips the ZIP the student already has.
# Safe to re-run: "paste the same line again" is the fix for most problems.
#
# Flags (testing / support):  --dry-run          say what would happen, change nothing
#                             --no-claude        skip installing Claude Code and the login
#                             --no-claude-login  skip only the login
#                             --no-start         don't start the app at the end
#   With the one-liner:  /bin/bash -c "$(curl -fsSL …/install.sh)" _ --dry-run
#
# Canonical copy: ReelCarouselStudio/tools/install.sh. The hosted copy at
# ness-build/studio/install.sh is copied from it by hand. Must stay bash 3.2 compatible.

DRY_RUN=0
CLAUDE=1
CLAUDE_LOGIN=1
START=1
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-claude) CLAUDE=0 ;;
    --no-claude-login) CLAUDE_LOGIN=0 ;;
    --no-start) START=0 ;;
  esac
done

NODE_LINE="latest-v22.x"   # Node 22 LTS: runs on macOS 11 and newer
SUPPORT="ness@digicuratoragency.com"
HUB_URL="https://hub.digicuratoragency.com/content-engine"
FOLDER_NAME="reel-carousel-studio"
PROJECT="$HOME/$FOLDER_NAME"
DOWNLOADS="$HOME/Downloads"
LOG_DIR="$HOME/Library/Logs/ReelCarouselStudio"
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
run() {
  if [ "$DRY_RUN" = 1 ]; then say "   (dry run) would run: $*"; return 0; fi
  "$@" 2>&1 | tee -a "$LOG"
  return "${PIPESTATUS[0]}"
}
WARNED=0

printf '\n\033[1mReel & Carousel Studio installer\033[0m\n'
say "This sets up Reel & Carousel Studio on your Mac. It takes about 5 minutes."
say "Leave this window open until you see the green \"installed\" message."
[ "$DRY_RUN" = 1 ] && say "(Dry run: nothing will be installed or changed.)"

# ---------------------------------------------------------------- Checks
[ "$(uname -s)" = "Darwin" ] || stop "This line is for a Mac. On Windows, use the PowerShell line from the lesson instead."
case "$(uname -m)" in
  arm64) NODE_ARCH="arm64" ;;
  x86_64) NODE_ARCH="x64" ;;
  *) stop "This Mac's processor ($(uname -m)) isn't supported." ;;
esac
FREE_GB="$(df -g "$HOME" | awk 'NR==2 {print $4}')"
if [ -n "$FREE_GB" ] && [ "$FREE_GB" -lt 2 ]; then
  stop "Your Mac has less than 2 GB free. Free up some space, then paste the same line again."
fi
curl -fsS -o /dev/null --max-time 15 "https://nodejs.org/dist/" || stop "No internet connection (nodejs.org didn't answer). Check your Wi-Fi, then paste the same line again."

# ---------------------------------------------------------------- 1. The app folder
step "1/5 Reel & Carousel Studio"

# Where the new copy comes from: the newest ZIP in Downloads, or a folder Safari already unzipped there.
SRC_ZIP="$(ls -t "$DOWNLOADS"/${FOLDER_NAME}*.zip 2>/dev/null | head -1)"
SRC_DIR=""
if [ -z "$SRC_ZIP" ]; then
  for d in "$DOWNLOADS/$FOLDER_NAME" "$DOWNLOADS"/${FOLDER_NAME}*/"$FOLDER_NAME"; do
    if [ -f "$d/Start Studio.command" ] && [ "$d" != "$PROJECT" ]; then SRC_DIR="$d"; break; fi
  done
fi
SRC_ID=""
if [ -n "$SRC_ZIP" ]; then SRC_ID="$(basename "$SRC_ZIP") $(stat -f %z "$SRC_ZIP")"
elif [ -n "$SRC_DIR" ]; then SRC_ID="folder $(stat -f %m "$SRC_DIR/server.js" 2>/dev/null)"; fi

INSTALLED_ID="$(cat "$PROJECT/.install-source" 2>/dev/null)"
if [ -f "$PROJECT/server.js" ] && { [ -z "$SRC_ID" ] || [ "$SRC_ID" = "$INSTALLED_ID" ]; }; then
  ok "The app is already in $PROJECT"
elif [ -z "$SRC_ID" ]; then
  stop "No Reel & Carousel Studio ZIP in your Downloads folder. Download it from the hub, then paste the same line again:
   $HUB_URL"
else
  if [ -f "$PROJECT/server.js" ]; then say "A newer copy is in Downloads. Updating the app (your data folder stays as it is)."
  else say "Putting the app in $PROJECT"; fi
  if [ "$DRY_RUN" = 1 ]; then
    say "   (dry run) would copy the app from ${SRC_ZIP:-$SRC_DIR} into $PROJECT"
  else
    TMP="$(mktemp -d)"
    if [ -n "$SRC_ZIP" ]; then
      ditto -x -k "$SRC_ZIP" "$TMP" 2>>"$LOG" || stop "The ZIP in Downloads didn't unzip. Download it again from the hub, then paste the same line again."
      NEW="$TMP/$FOLDER_NAME"
    else
      NEW="$SRC_DIR"
    fi
    [ -f "$NEW/server.js" ] || stop "That ZIP doesn't look like Reel & Carousel Studio. Download it again from the hub, then paste the same line again."
    mkdir -p "$PROJECT"
    # Copy the app over, but never touch the student's data, packages or private Node.
    rsync -a --delete --exclude '/data/' --exclude '/node_modules/' --exclude '/runtime/' --exclude '/.install-source' \
      "$NEW/" "$PROJECT/" 2>>"$LOG" || stop "Couldn't copy the app into $PROJECT."
    # Someone who ran the app by hand from Downloads first keeps their work.
    if [ -n "$SRC_DIR" ] && [ -d "$SRC_DIR/data" ] && [ ! -d "$PROJECT/data" ]; then
      cp -R "$SRC_DIR/data" "$PROJECT/data" && say "Brought your existing data folder along from Downloads"
    fi
    rm -rf "$TMP"
    xattr -dr com.apple.quarantine "$PROJECT" 2>/dev/null
    chmod +x "$PROJECT/Start Studio.command"
    printf '%s' "$SRC_ID" > "$PROJECT/.install-source"
    ok "The app is in $PROJECT"
    NEED_NPM=1   # a new copy may need different packages
  fi
fi

# ---------------------------------------------------------------- 2. Node
step "2/5 Node (a private copy inside the app folder)"
NODE_DIR="$PROJECT/runtime/node"
if [ -x "$NODE_DIR/bin/node" ] && "$NODE_DIR/bin/node" -e 'process.exit(+process.versions.node.split(".")[0] >= 20 ? 0 : 1)' 2>/dev/null; then
  ok "Node $("$NODE_DIR/bin/node" -v) is ready"
elif [ "$DRY_RUN" = 1 ]; then
  say "   (dry run) would download Node from nodejs.org/dist/$NODE_LINE into $NODE_DIR"
else
  SUMS="$(curl -fsSL "https://nodejs.org/dist/$NODE_LINE/SHASUMS256.txt")" || stop "Couldn't reach nodejs.org. Check your internet, then paste the same line again."
  LINE="$(printf '%s\n' "$SUMS" | grep -E "  node-v[0-9.]+-darwin-$NODE_ARCH\.tar\.gz$" | head -1)"
  [ -n "$LINE" ] || stop "Couldn't find Node for this Mac on nodejs.org."
  SHA="${LINE%% *}"; FILE="${LINE##* }"
  TMP="$(mktemp -d)"
  say "Downloading $FILE"
  curl -fL --progress-bar -o "$TMP/$FILE" "https://nodejs.org/dist/$NODE_LINE/$FILE" || stop "The Node download failed. Paste the same line again."
  GOT="$(shasum -a 256 "$TMP/$FILE" | awk '{print $1}')"
  [ "$GOT" = "$SHA" ] || stop "The Node download was damaged (checksum didn't match). Paste the same line again."
  tar -xzf "$TMP/$FILE" -C "$TMP" || stop "Couldn't unpack Node."
  rm -rf "$NODE_DIR"; mkdir -p "$PROJECT/runtime"
  mv "$TMP/${FILE%.tar.gz}" "$NODE_DIR" || stop "Couldn't move Node into the app folder."
  rm -rf "$TMP"
  ok "Node $("$NODE_DIR/bin/node" -v) is ready"
  NEED_NPM=1
fi
export PATH="$NODE_DIR/bin:$PATH"

# ---------------------------------------------------------------- 3. Packages + rendering browser
step "3/5 The app's packages"
if [ "$DRY_RUN" = 1 ]; then
  say "   (dry run) would run npm install in $PROJECT"
elif [ -d "$PROJECT/node_modules/express" ] && [ -z "$NEED_NPM" ]; then
  ok "Packages already installed"
else
  say "Installing packages. This takes a minute."
  ( cd "$PROJECT" && npm install --no-audit --no-fund --no-update-notifier 2>&1 | tee -a "$LOG" | tail -3 )
  [ -d "$PROJECT/node_modules/express" ] || stop "The packages didn't install. Paste the same line again."
  ok "Packages installed"
fi

if [ -d "/Applications/Google Chrome.app" ] || [ -d "$HOME/Applications/Google Chrome.app" ]; then
  ok "Google Chrome is there, so slides render with it"
elif [ -d "$HOME/Library/Caches/ms-playwright" ] && ls "$HOME/Library/Caches/ms-playwright" | grep -q '^chromium'; then
  ok "The rendering browser is already installed"
elif [ "$DRY_RUN" = 1 ]; then
  say "   (dry run) would download a rendering browser (npm run setup), since Google Chrome isn't installed"
else
  say "Google Chrome isn't installed, so downloading a rendering browser for the slides."
  ( cd "$PROJECT" && npm run setup 2>&1 | tee -a "$LOG" | tail -2 ) || true
  ls "$HOME/Library/Caches/ms-playwright" 2>/dev/null | grep -q '^chromium' && ok "Rendering browser installed" \
    || warn "The rendering browser didn't install. Install Google Chrome from https://www.google.com/chrome instead."
fi

# ---------------------------------------------------------------- 4. Claude Code
step "4/5 Claude Code (writes your slides and hooks with your Claude plan)"
export PATH="$HOME/.local/bin:$PATH"
if [ "$CLAUDE" = 0 ]; then
  say "Skipped. In the app, pick Anthropic or OpenRouter under Settings and add a key."
else
  if command -v claude >/dev/null 2>&1; then
    ok "Claude Code is already installed"
  elif [ "$DRY_RUN" = 1 ]; then
    say "   (dry run) would run: curl -fsSL https://claude.ai/install.sh | bash"
  else
    curl -fsSL https://claude.ai/install.sh | bash 2>&1 | tee -a "$LOG"
    if command -v claude >/dev/null 2>&1; then ok "Claude Code installed"
    else warn "Claude Code didn't install. You can still use the app with an Anthropic or OpenRouter key."; fi
  fi
  if [ "$DRY_RUN" = 1 ]; then
    say "   (dry run) would check the Claude login and open it if needed"
  elif ! command -v claude >/dev/null 2>&1; then
    :
  elif claude auth status 2>/dev/null | grep -q '"loggedIn": *true'; then
    ok "Claude Code is logged in"
  elif [ "$CLAUDE_LOGIN" = 0 ]; then
    warn "Not logged in to Claude yet. Run: claude auth login"
  else
    say "Your browser opens next. Log in with the account that has your Claude Pro or Max plan and click Authorize."
    say "If the browser shows a code instead, copy it, come back here, paste it and press Enter."
    claude auth login --claudeai </dev/tty
    if claude auth status 2>/dev/null | grep -q '"loggedIn": *true'; then ok "Claude Code is logged in"
    else warn "Claude login didn't finish. Paste the same line again to retry, or use an API key in the app's Settings."; fi
  fi
fi

# ---------------------------------------------------------------- 5. Desktop launcher + start
step "5/5 Desktop launcher"
LAUNCHER="$HOME/Desktop/Reel & Carousel Studio.command"
if [ "$DRY_RUN" = 1 ]; then
  say "   (dry run) would add \"Reel & Carousel Studio\" to your Desktop"
else
  mkdir -p "$HOME/Desktop"
  printf '#!/bin/bash\n# Starts Reel & Carousel Studio. Made by the installer.\nexec "%s/Start Studio.command"\n' "$PROJECT" > "$LAUNCHER"
  chmod +x "$LAUNCHER"
  ok "Added \"Reel & Carousel Studio\" to your Desktop"
fi

echo ""
if [ "$DRY_RUN" = 1 ]; then
  printf '\033[1;32mDry run finished. Nothing was installed or changed.\033[0m\n'
  exit 0
fi
if [ "$WARNED" = 1 ]; then
  printf '\033[1;33mAlmost done.\033[0m Something above is yellow. The app works, but read the yellow line. Pasting the same line again retries it.\n'
  say "Still stuck? Email $SUPPORT and attach this file: $LOG"
else
  printf '\033[1;32m✅ Reel & Carousel Studio is installed.\033[0m\n'
fi
say "Your app folder: $PROJECT"
say "To start it any time, double-click \"Reel & Carousel Studio\" on your Desktop."
say "A Terminal window opens with it. Keep that window open while you use the app."
if [ "$START" = 1 ]; then
  say ""
  say "Starting it now. Your browser opens in a few seconds."
  open "$LAUNCHER"
fi
exit 0
