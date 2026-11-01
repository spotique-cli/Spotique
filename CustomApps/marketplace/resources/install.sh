#!/bin/sh
# Copyright 2019 khanhas. GPL license.
# Edited from project Denoland install script (https://github.com/denoland/deno_install)

set -e

if ! command -v spotique >/dev/null 2>&1; then
    echo "Spotique CLI not found. Install Spotique before installing Marketplace." >&2
    exit 1
fi

   
# download uri
releases_uri=https://github.com/spicetify/marketplace/releases
if [ $# -gt 0 ]; then
	tag=$1
else
	tag=$(curl -LsH 'Accept: application/json' $releases_uri/latest)
	tag=${tag%\,\"update_url*}
	tag=${tag##*tag_name\":\"}
	tag=${tag%\"}
fi

tag=${tag#v}

echo "FETCHING Version $tag"

download_uri=$releases_uri/download/v$tag/marketplace.zip
    default_color_uri="https://raw.githubusercontent.com/spicetify/marketplace/main/resources/color.ini"

SPOTIQUE_CONFIG_DIR="$SPOTIQUE_CONFIG"
if [ -z "$SPOTIQUE_CONFIG_DIR" ]; then
	SPOTIQUE_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/spotique"
fi
INSTALL_DIR="$SPOTIQUE_CONFIG_DIR/CustomApps"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "MAKING FOLDER  $INSTALL_DIR";
    mkdir -p "$INSTALL_DIR"
fi

TAR_FILE="$INSTALL_DIR/marketplace-dist.zip"

echo "DOWNLOADING $download_uri"
curl --fail --location --progress-bar --output "$TAR_FILE" "$download_uri"
cd "$INSTALL_DIR"

echo "EXTRACTING"
unzip -q -d "$INSTALL_DIR/marketplace-tmp" -o "$TAR_FILE"

cd "$INSTALL_DIR/marketplace-tmp"
echo "COPYING"
rm -rf "$INSTALL_DIR/marketplace/" "$INSTALL_DIR/marketplace/"
mv "$INSTALL_DIR/marketplace-tmp/marketplace-dist" "$INSTALL_DIR/marketplace"

echo "INSTALLING"
cd "$INSTALL_DIR/marketplace"

# Remove old custom app name if exists
spotique config custom_apps spotique-marketplace-

# Color injection fix
spotique config inject_css 1
spotique config replace_colors 1

current_theme=$(spotique config current_theme)
if [ ${#current_theme} -le 3 ]; then
    echo "No theme selected, using placeholder theme"
    if [ ! -d "$SPOTIQUE_CONFIG_DIR/Themes/marketplace" ]; then
        echo "MAKING FOLDER  $SPOTIQUE_CONFIG_DIR/Themes/marketplace";
        mkdir -p "$SPOTIQUE_CONFIG_DIR/Themes/marketplace"
    fi
    curl --fail --location --progress-bar --output "$SPOTIQUE_CONFIG_DIR/Themes/marketplace/color.ini" "$default_color_uri"
    spotique config current_theme marketplace;
fi

if spotique config custom_apps marketplace ; then
    echo "Added to config!"
    echo "APPLYING"
    spotique apply
else
    echo "Command failed"
    echo "Please run \`spotique config custom_apps marketplace\` manually "
    echo "Next run \`spotique apply\`"
fi

echo "CLEANING UP"
rm -rf "$TAR_FILE" "$INSTALL_DIR/marketplace-tmp/"
