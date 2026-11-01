<h3 align="center"><a href="https://github.com/spotique-cli/Spotique"><img src=".github/assets/discord-logo-by-yvonn.png" width="180px" alt="Spotique"></a></h3>
<p align="center">
  <a href="https://github.com/spotique-cli/Spotique/releases/latest"><img src="https://img.shields.io/github/release/spotique-cli/Spotique/all.svg?colorB=97CA00&label=latest%20version"></a>
  <a href="https://github.com/spotique-cli/Spotique/releases"><img src="https://img.shields.io/github/downloads/spotique-cli/Spotique/total.svg?colorB=97CA00&label=total%20downloads"></a>
</p>

---

Command-line tool to customize the official Spotify client.
Supports Windows, MacOS and Linux.

### Features

- Change colors across the User Interface
- Inject CSS for advanced customization
- Inject Extensions to extend functionalities, manipulate UI and control player
- Inject Custom Apps
- Make yourself in control of the Spotify client

### Install on Windows

```powershell
iwr -useb https://raw.githubusercontent.com/spotique-cli/Spotique/main/install.ps1 | iex
```

The installer enables the Discord Rich Presence extension and app. Run
`spotique apply` once, then launch Spotify with `spotique auto` to start the
local Discord IPC bridge. Discord must be running for presence updates.

> **Experimental:** Current Discord IPC documentation requires OAuth
> authorization before `SET_ACTIVITY`. This release does not implement that
> authorization flow, so Discord may reject presence updates. No Discord client
> secret is included in this public repository or its releases.

### Links

- [Installation](#install-on-windows)
- [Release downloads](https://github.com/spotique-cli/Spotique/releases)

---

### Code Signing Policy

Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org/).
