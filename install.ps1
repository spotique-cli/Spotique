$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repository = 'spotique-cli/Spotique'
$installDirectory = Join-Path $env:LOCALAPPDATA 'Spotique'
$latestReleaseUrl = "https://api.github.com/repos/$repository/releases/latest"

$processorArchitecture = @($env:PROCESSOR_ARCHITEW6432, $env:PROCESSOR_ARCHITECTURE) -join ','
switch -Regex ($processorArchitecture) {
  'ARM64' { $architecture = 'arm64'; break }
  'AMD64' { $architecture = 'amd64'; break }
  'x86' { $architecture = '386'; break }
  default { throw "Unsupported processor architecture: $env:PROCESSOR_ARCHITECTURE" }
}

$headers = @{
  Accept = 'application/vnd.github+json'
  'User-Agent' = 'Spotique-Installer'
}
$release = Invoke-RestMethod -Uri $latestReleaseUrl -Headers $headers
if ($release.tag_name -notmatch '^v?(\d+\.\d+\.\d+)$') {
  throw "The latest GitHub release has an invalid tag: $($release.tag_name)"
}

$tag = $release.tag_name
$assetName = "spotique-windows-$architecture.zip"
$downloadUrl = "https://github.com/$repository/releases/download/$tag/$assetName"
$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "spotique-install-$([guid]::NewGuid())"
$archivePath = Join-Path $temporaryDirectory $assetName
$extractedDirectory = Join-Path $temporaryDirectory 'extracted'

try {
  New-Item -ItemType Directory -Path $extractedDirectory -Force | Out-Null
  Invoke-WebRequest -Uri $downloadUrl -Headers $headers -OutFile $archivePath
  Expand-Archive -LiteralPath $archivePath -DestinationPath $extractedDirectory -Force

  $executable = Join-Path $extractedDirectory 'spotique.exe'
  if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) {
    throw "The release archive does not contain spotique.exe: $downloadUrl"
  }

  New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
  Copy-Item -Path (Join-Path $extractedDirectory '*') -Destination $installDirectory -Recurse -Force

  $installedExecutable = Join-Path $installDirectory 'spotique.exe'
  if (-not (Test-Path -LiteralPath $installedExecutable -PathType Leaf)) {
    throw "Spotique was not installed to $installDirectory"
  }

  $spotiqueDataDirectory = Join-Path $env:APPDATA 'spotique'
  $discordAppSource = Join-Path $extractedDirectory 'CustomApps\DiscordRPC'
  $discordAppTarget = Join-Path $spotiqueDataDirectory 'CustomApps\DiscordRPC'
  New-Item -ItemType Directory -Path $discordAppTarget -Force | Out-Null
  Copy-Item -Path (Join-Path $discordAppSource '*') -Destination $discordAppTarget -Recurse -Force

  $extensionSource = Join-Path $extractedDirectory 'Extensions\discordRPC.js'
  $extensionsTarget = Join-Path $spotiqueDataDirectory 'Extensions'
  New-Item -ItemType Directory -Path $extensionsTarget -Force | Out-Null
  Copy-Item -LiteralPath $extensionSource -Destination $extensionsTarget -Force

  $userPath = [Environment]::GetEnvironmentVariable('Path', [EnvironmentVariableTarget]::User)
  $pathEntries = @($userPath -split ';' | Where-Object { $_ })
  if (-not ($pathEntries | Where-Object { $_.TrimEnd('\') -ieq $installDirectory.TrimEnd('\') })) {
    $pathEntries += $installDirectory
    [Environment]::SetEnvironmentVariable('Path', ($pathEntries -join ';'), [EnvironmentVariableTarget]::User)
  }
  if (-not (($env:Path -split ';') | Where-Object { $_.TrimEnd('\') -ieq $installDirectory.TrimEnd('\') })) {
    $env:Path = "$env:Path;$installDirectory"
  }

  & $installedExecutable config extensions discordRPC.js
  if ($LASTEXITCODE -ne 0) {
    throw "Could not enable the Discord Rich Presence extension (exit code $LASTEXITCODE)."
  }
  & $installedExecutable config custom_apps DiscordRPC
  if ($LASTEXITCODE -ne 0) {
    throw "Could not enable the Discord Rich Presence app (exit code $LASTEXITCODE)."
  }

  Write-Host "Spotique $tag installed to $installDirectory"
  Write-Host 'Run "spotique apply" once, then launch Spotify with "spotique auto" to enable Discord Rich Presence.'
  Write-Host 'Discord Rich Presence is experimental and may be rejected until OAuth authorization is implemented.'
  Write-Host 'Open a new terminal to use the updated PATH.'
}
finally {
  if (Test-Path -LiteralPath $temporaryDirectory) {
    Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
  }
}
