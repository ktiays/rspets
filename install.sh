#!/usr/bin/env bash

set -euo pipefail

REPO="ktiays/rspets"
INSTALL_DIR="${HOME}/.rspets/bin"
BIN_PATH="${INSTALL_DIR}/rspets"
PLIST_PATH="${HOME}/Library/LaunchAgents/me.ktiays.rspets.plist"
SYSTEMD_SERVICE_PATH="${HOME}/.config/systemd/user/rspets.service"

get_target() {
    local os arch
    os=$(uname -s)
    arch=$(uname -m)

    case "$os" in
        Darwin)
            case "$arch" in
                arm64)  echo "aarch64-apple-darwin" ;;
                x86_64) echo "x86_64 macOS is not supported. Please use an Apple Silicon Mac or Linux." >&2; exit 1 ;;
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
    echo "Next steps:"
    echo "  1. Create your configuration file in ~/.rspets/"
    echo "     Example ~/.rspets/config.toml:"
    echo "       session_id = \"my-sanctuary\""
    echo "       pet_server_port = 3000"
    if [ "$(uname -s)" = "Darwin" ]; then
        echo "  2. Run the following command to start rspets at login:"
        echo "     launchctl load -w ~/Library/LaunchAgents/me.ktiays.rspets.plist"
        echo ""
        echo "Manage rspets:"
        echo "  launchctl list | grep me.ktiays.rspets   # check service status"
        echo "  launchctl unload ~/Library/LaunchAgents/me.ktiays.rspets.plist"
    else
        echo "  2. Run the following command to start rspets at login:"
        echo "     systemctl --user enable --now rspets"
        echo ""
        echo "Manage rspets:"
        echo "  systemctl --user status rspets"
        echo "  systemctl --user stop rspets"
        echo "  systemctl --user disable rspets"
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

is_service_running() {
    if [ "$(uname -s)" = "Darwin" ]; then
        launchctl list me.ktiays.rspets >/dev/null 2>&1
    else
        systemctl --user is-active --quiet rspets 2>/dev/null
    fi
}

cmd_install() {
    local target tag asset_name download_url was_running=false is_upgrade=false
    target=$(get_target)
    tag=$(get_latest_tag)

    if [ -z "$tag" ]; then
        echo "Failed to get latest release tag." >&2
        exit 1
    fi

    if [ -f "$BIN_PATH" ]; then
        is_upgrade=true
        echo "Upgrading rspets to ${tag} for ${target} ..."
    else
        echo "Installing rspets ${tag} for ${target} ..."
    fi

    if is_service_running; then
        was_running=true
        echo "Service is currently running."
    fi

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
        if [ "$is_upgrade" = true ]; then
            echo "LaunchAgent plist updated."
        else
            echo "LaunchAgent plist created."
        fi
    else
        mkdir -p "$(dirname "$SYSTEMD_SERVICE_PATH")"
        cat > "$SYSTEMD_SERVICE_PATH" <<EOF
[Unit]
Description=rspets daemon

[Service]
ExecStart=${BIN_PATH}
Restart=on-failure

[Install]
WantedBy=default.target
EOF
        if [ "$is_upgrade" = true ]; then
            echo "systemd user service updated."
        else
            echo "systemd user service created."
        fi
    fi

    if [ "$was_running" = true ]; then
        echo "Restarting service ..."
        if [ "$(uname -s)" = "Darwin" ]; then
            launchctl unload "$PLIST_PATH" 2>/dev/null || true
            launchctl load -w "$PLIST_PATH"
        else
            systemctl --user daemon-reload
            systemctl --user restart rspets
        fi
        echo "Service restarted."
    fi

    echo "Installation complete: ${BIN_PATH}"

    if [ "$is_upgrade" = true ]; then
        echo ""
        echo "Upgrade complete!"
        if [ "$was_running" = true ]; then
            echo "The service has been seamlessly restarted with the new version."
        fi
    else
        print_tip
    fi
}

cmd_uninstall() {
    if [ "$(uname -s)" = "Darwin" ] && [ -f "$PLIST_PATH" ]; then
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
        rm -f "$PLIST_PATH"
        echo "Removed LaunchAgent."
    fi

    if [ -f "$SYSTEMD_SERVICE_PATH" ]; then
        systemctl --user stop rspets 2>/dev/null || true
        systemctl --user disable rspets 2>/dev/null || true
        rm -f "$SYSTEMD_SERVICE_PATH"
        echo "Removed systemd user service."
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
    echo "Usage: $0 [install|uninstall]"
    echo "  install is the default when no command is provided."
    exit 1
}

case "${1:-}" in
    ""|install) cmd_install ;;
    uninstall) cmd_uninstall ;;
    *) usage ;;
esac
