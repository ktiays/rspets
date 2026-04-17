#!/usr/bin/env bash

set -euo pipefail

REPO="ktiays/rspets"
INSTALL_DIR="${HOME}/.rspets/bin"
BIN_PATH="${INSTALL_DIR}/rspets"
PLIST_PATH="${HOME}/Library/LaunchAgents/me.ktiays.rspets.plist"

get_target() {
    local os arch
    os=$(uname -s)
    arch=$(uname -m)

    case "$os" in
        Darwin)
            case "$arch" in
                x86_64) echo "x86_64-apple-darwin" ;;
                arm64)  echo "aarch64-apple-darwin" ;;
                *)      echo "Unsupported macOS architecture: $arch" >&2; exit 1 ;;
            esac
            ;;
        Linux)
            case "$arch" in
                x86_64)  echo "x86_64-unknown-linux-gnu" ;;
                aarch64) echo "aarch64-unknown-linux-gnu" ;;
                arm64)   echo "aarch64-unknown-linux-gnu" ;;
                *)       echo "Unsupported Linux architecture: $arch" >&2; exit 1 ;;
            esac
            ;;
        MINGW*|CYGWIN*|MSYS*)
            echo "Windows is not supported yet. Please use WSL or a Linux/macOS machine." >&2; exit 1
            ;;
        *)
            echo "Unsupported OS: $os. Currently only macOS and Linux are supported." >&2; exit 1
            ;;
    esac
}

print_tip() {
    echo ""
    echo "Tip: You can manage rspets with the following commands:"
    echo "  ~/.rspets/bin/rspets          # run manually"
    if [ "$(uname -s)" = "Darwin" ]; then
        echo "  launchctl list | grep me.ktiays.rspets   # check service status"
        echo "  launchctl unload ~/Library/LaunchAgents/me.ktiays.rspets.plist"
        echo "  launchctl load ~/Library/LaunchAgents/me.ktiays.rspets.plist"
    fi
    echo ""
    echo "To uninstall, run:"
    echo "  curl -sL https://raw.githubusercontent.com/ktiays/rspets/main/install.sh | bash -s -- uninstall"
}

get_latest_tag() {
    curl -s "https://api.github.com/repos/${REPO}/releases/latest" \
        | grep -o '"tag_name": "[^"]*"' \
        | head -n 1 \
        | cut -d'"' -f4
}

cmd_install() {
    local target tag asset_name download_url
    target=$(get_target)
    tag=$(get_latest_tag)

    if [ -z "$tag" ]; then
        echo "Failed to get latest release tag." >&2
        exit 1
    fi

    echo "Installing rshell-host ${tag} for ${target} ..."

    mkdir -p "$INSTALL_DIR"

    asset_name="rspets-${target}"
    download_url="https://github.com/${REPO}/releases/download/${tag}/${asset_name}"

    echo "Downloading ${download_url} ..."
    if ! curl -fsL -o "$BIN_PATH" "$download_url"; then
        echo "Failed to download binary." >&2
        exit 1
    fi

    chmod +x "$BIN_PATH"

    if [ "$(uname -s)" = "Darwin" ]; then
        xattr -cr "$BIN_PATH"
        mkdir -p "$(dirname "$PLIST_PATH")"
        cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>me.ktiays.rspets</string>
    <key>ProgramArguments</key>
    <array>
        <string>${BIN_PATH}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/var/tmp</string>
</dict>
</plist>
EOF
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
        launchctl load "$PLIST_PATH"
        echo "LaunchAgent loaded."
    fi

    echo "Installation complete: ${BIN_PATH}"
    print_tip
}

cmd_uninstall() {
    if [ "$(uname -s)" = "Darwin" ] && [ -f "$PLIST_PATH" ]; then
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
        rm -f "$PLIST_PATH"
        echo "Removed LaunchAgent."
    fi

    if pkill -x rspets 2>/dev/null; then
        echo "Stopped running rspets process."
    fi

    if [ -d "${HOME}/.rspets" ]; then
        rm -rf "${HOME}/.rspets"
        echo "Removed ~/.rspets"
    fi
}

usage() {
    echo "Usage: $0 {install|uninstall}"
    exit 1
}

case "${1:-}" in
    install) cmd_install ;;
    uninstall) cmd_uninstall ;;
    *) usage ;;
esac
