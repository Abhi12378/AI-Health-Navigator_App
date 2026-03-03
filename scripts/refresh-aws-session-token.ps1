param(
  [string]$Profile = "default",
  [int]$DurationSeconds = 43200,
  [string]$EnvFilePath = ".env.local"
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $workspaceRoot $EnvFilePath

function Set-Or-AddEnvVar([string]$text, [string]$key, [string]$value) {
  $escaped = [Regex]::Escape($key)
  $line = "{0}={1}" -f $key, $value
  if ($text -match "(?m)^$escaped=.*$") {
    return [Regex]::Replace($text, "(?m)^$escaped=.*$", $line)
  }
  if ($text.Length -gt 0 -and -not $text.EndsWith("`n")) { $text += "`r`n" }
  return $text + $line + "`r`n"
}

if (Test-Path $envPath) {
  $envContent = Get-Content $envPath -Raw
} else {
  $envContent = ""
}

Write-Host "Trying AWS SSO/exported credentials for profile '$Profile'..."
$credentialJson = $null

try {
  $exportResult = aws configure export-credentials --profile $Profile --format process 2>$null
  if ($LASTEXITCODE -eq 0 -and $exportResult) {
    $credentialJson = $exportResult | ConvertFrom-Json
  }
} catch {
}

if (-not $credentialJson) {
  Write-Host "Falling back to STS GetSessionToken for profile '$Profile'..."
  try {
    $stsResult = aws sts get-session-token --profile $Profile --duration-seconds $DurationSeconds --output json
    if ($LASTEXITCODE -ne 0) {
      throw "aws sts get-session-token failed"
    }
    $stsJson = $stsResult | ConvertFrom-Json
    $credentialJson = [PSCustomObject]@{
      AccessKeyId = $stsJson.Credentials.AccessKeyId
      SecretAccessKey = $stsJson.Credentials.SecretAccessKey
      SessionToken = $stsJson.Credentials.SessionToken
      Expiration = $stsJson.Credentials.Expiration
    }
  } catch {
    Write-Error "Unable to get temporary credentials for profile '$Profile'. If this is an SSO profile, run: aws sso login --profile $Profile"
    exit 1
  }
}

if (-not $credentialJson.AccessKeyId -or -not $credentialJson.SecretAccessKey -or -not $credentialJson.SessionToken) {
  Write-Error "Received incomplete credentials. Aborting."
  exit 1
}

$envContent = Set-Or-AddEnvVar -text $envContent -key "AWS_ACCESS_KEY_ID" -value $credentialJson.AccessKeyId
$envContent = Set-Or-AddEnvVar -text $envContent -key "AWS_SECRET_ACCESS_KEY" -value $credentialJson.SecretAccessKey
$envContent = Set-Or-AddEnvVar -text $envContent -key "AWS_SESSION_TOKEN" -value $credentialJson.SessionToken

Set-Content -Path $envPath -Value $envContent -Encoding UTF8

if ($credentialJson.Expiration) {
  Write-Host "Updated $EnvFilePath with temporary AWS credentials. Expires: $($credentialJson.Expiration)"
} else {
  Write-Host "Updated $EnvFilePath with temporary AWS credentials."
}
