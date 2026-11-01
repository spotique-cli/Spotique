#!/usr/bin/env sh
# Copyright 2022 khanhas.
# Copyright 2023-present Spicetify contributors.
# Edited from project Denoland install script (https://github.com/denoland/deno_install)

set -e

for arg in "$@"; do
    shift
    case "$arg" in
        "--root") override_root=1 ;;
        *)
        if echo "$arg" | grep -qv "^-"; then
            tag="$arg"
        else
            echo "Invalid option $arg" >&2
            exit 1
        fi
    esac
done

is_root() {
    [ "$(id -u)" -ne 0 ]
}

if ! is_root && [ "${override_root:-0}" -eq 0 ]; then
    echo "The script was ran under sudo or as root. The script will now exit"
    echo "If you hadn't intended to do this, please execute the script without root access to avoid problems with spotique"
    echo "To override this behavior, pass the '--root' parameter to this script"
    exit
fi

spotique_install="$HOME/.spotique"
exe="$spotique_install/spotique"
installed_exe=
if [ -x "$exe" ]; then
    installed_exe="$exe"
elif command -v spotique >/dev/null 2>&1; then
    installed_exe=$(command -v spotique)
fi

if [ -n "$installed_exe" ]; then
    echo "Spotique is already installed. Do you want to fix your installation? (Y/n)"
    read -r choice < /dev/tty
    if [ "$choice" != "N" ] && [ "$choice" != "n" ]; then
        "$installed_exe" update
        exit 0
    fi
fi

# wipe existing log
> install.log :

log() {
    echo "$1"
    echo "[$(date +'%H:%M:%S %Y-%m-%d')]" "$1" >> install.log
}

case $(uname -sm) in
    "Darwin x86_64") target="darwin-amd64" ;;
    "Darwin arm64") target="darwin-arm64" ;;
    "Linux x86_64") target="linux-amd64" ;;
    "Linux aarch64") target="linux-arm64" ;;
    *) log "Unsupported platform $(uname -sm). x86_64 and arm64 binaries for Linux and Darwin are available."; exit ;;
esac

# check for dependencies
command -v curl >/dev/null || { log "curl isn't installed!" >&2; exit 1; }
command -v tar >/dev/null || { log "tar isn't installed!" >&2; exit 1; }
command -v grep >/dev/null || { log "grep isn't installed!" >&2; exit 1; }

# download uri
releases_uri=https://github.com/spotique-cli/Spotique/releases
latest_release_uri=https://api.github.com/repos/spotique-cli/Spotique/releases/latest
if [ -z "$tag" ]; then
    tag=$(curl -LsH 'Accept: application/json' "$latest_release_uri")
    tag=${tag%\,\"update_url*}
    tag=${tag##*tag_name\":\"}
    tag=${tag%\"}
fi

tag=${tag#v}

log "FETCHING Version $tag"

download_uri=$releases_uri/download/v$tag/spotique-$target.tar.gz

# locations
tar="$spotique_install/spotique.tar.gz"

# installing
[ ! -d "$spotique_install" ] && log "CREATING $spotique_install" && mkdir -p "$spotique_install"

log "DOWNLOADING $download_uri"
curl --fail --location --progress-bar --output "$tar" "$download_uri"

log "EXTRACTING $tar"
tar xzf "$tar" -C "$spotique_install"

log "SETTING EXECUTABLE PERMISSIONS TO $exe"
chmod +x "$exe"

log "REMOVING $tar"
rm "$tar"

notfound() {
    cat << EOINFO
Manually add the directory to your \$PATH through your shell profile
export SPOTIQUE_INSTALL="$spotique_install"
export PATH="\$PATH:$spotique_install"
EOINFO
}

endswith_newline() {
    [ "$(od -An -c "$1" | tail -1 | grep -o '.$')" = "\n" ]
}

check() {
    path="export PATH=\$PATH:$spotique_install"
    shellrc=$HOME/$1

    if [ "$1" = ".zshrc" ] && [ -n "${ZDOTDIR}" ]; then
        shellrc=$ZDOTDIR/$1
    fi

    # Create shellrc if it doesn't exist
    if ! [ -f "$shellrc" ]; then
        log "CREATING $shellrc"
        touch "$shellrc"
    fi

    # Still checking again, in case touch command failed
    if [ -f "$shellrc" ]; then
        if ! grep -q "$spotique_install" "$shellrc"; then
            log "APPENDING $spotique_install to PATH in $shellrc"
            if ! endswith_newline "$shellrc"; then
                echo >> "$shellrc"
            fi
            echo "${2:-$path}" >> "$shellrc"
            export PATH="$spotique_install:$PATH"
        else
            log "spotique path already set in $shellrc, continuing..."
        fi
    else
        notfound
    fi
}

case $SHELL in
    *zsh) check ".zshrc" ;;
    *bash)
        [ -f "$HOME/.bashrc" ] && check ".bashrc"
        [ -f "$HOME/.bash_profile" ] && check ".bash_profile"
    ;;
    *fish) check ".config/fish/config.fish" "fish_add_path $spotique_install" ;;
    *) notfound ;;
esac

case ":$PATH:" in
    *":$spotique_install:"*) ;;
    *) export PATH="$spotique_install:$PATH" ;;
esac

echo
log "spotique v$tag was installed successfully to $spotique_install"
if [ -n "${shellrc:-}" ] && [ -f "$shellrc" ]; then
    log "Open a new terminal or reload your shell profile to use spotique:"
    log "  source \"$shellrc\""
    log "Then run 'spotique --help' to get started"
else
    log "After adding spotique to your PATH, run 'spotique --help' to get started"
fi

echo "Do you want to install spotique Marketplace? (Y/n)"
read -r choice < /dev/tty
if [ "$choice" = "N" ] || [ "$choice" = "n" ]; then
    echo "spotique Marketplace installation aborted"
    exit 0
fi
echo "Starting the spotique Marketplace installation script.."
curl -fsSL "https://raw.githubusercontent.com/spicetify/spicetify-marketplace/main/resources/install.sh" | sh
