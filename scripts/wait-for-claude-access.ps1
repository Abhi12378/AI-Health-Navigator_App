param(
  [string]$Region = "us-east-1",
  [int]$MaxAttempts = 30,
  [int]$IntervalSeconds = 120,
  [string]$EnvFilePath = ".env.local",
  [switch]$AutoApply,
  [switch]$AutoRestart,
  [string[]]$ModelIds = @(
    "us.anthropic.claude-sonnet-4-6",
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "us.anthropic.claude-opus-4-6-v1",
    "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
  )
)

$ErrorActionPreference = "Continue"
$awsExe = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"

if (-not (Test-Path $awsExe)) {
  throw "AWS CLI not found at $awsExe"
}

$payload = '{"anthropic_version":"bedrock-2023-05-31","max_tokens":32,"messages":[{"role":"user","content":[{"type":"text","text":"health check"}]}]}'
$payloadPath = Join-Path $PSScriptRoot "..\.bedrock-test-input.json"
Set-Content -Path $payloadPath -Value $payload -Encoding Ascii
$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Set-Or-AddEnvVar([string]$text, [string]$key, [string]$value) {
  $escaped = [Regex]::Escape($key)
  $line = "{0}={1}" -f $key, $value
  if ($text -match "(?m)^$escaped=.*$") {
    return [Regex]::Replace($text, "(?m)^$escaped=.*$", $line)
  }
  if ($text.Length -gt 0 -and -not $text.EndsWith("`n")) { $text += "`r`n" }
  return $text + $line + "`r`n"
}

function Update-EnvFile([string]$modelId) {
  $envPath = Join-Path $workspaceRoot $EnvFilePath
  if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
  } else {
    $content = ""
  }

  $content = Set-Or-AddEnvVar -text $content -key "BEDROCK_MODEL_ID" -value $modelId
  Set-Content -Path $envPath -Value $content -Encoding UTF8
  Write-Host "Updated $EnvFilePath with BEDROCK_MODEL_ID=$modelId"
}

function Restart-DevServer {
  $pids = Get-NetTCPConnection -LocalPort 3000,24678 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
  if ($pids) {
    $pids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  }

  Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "Set-Location '$workspaceRoot'; npm.cmd run dev"
  ) -WindowStyle Minimized | Out-Null

  Write-Host "Started dev server in a new minimized PowerShell window."
}

function Test-Model([string]$modelId) {
  $outPath = Join-Path $PSScriptRoot ("..\.bedrock-test-{0}.json" -f ($modelId -replace '[^a-zA-Z0-9\-_:]', '_'))

  $result = $null
  try {
    $result = & $awsExe --no-cli-pager bedrock-runtime invoke-model `
      --region $Region `
      --model-id $modelId `
      --content-type application/json `
      --accept application/json `
      --body ("fileb://{0}" -f $payloadPath) `
      $outPath 2>&1
  } catch {
    $result = $_.Exception.Message
  }

  if ($LASTEXITCODE -eq 0) {
    return [PSCustomObject]@{
      Success = $true
      ModelId = $modelId
      Message = "OK"
    }
  }

  return [PSCustomObject]@{
    Success = $false
    ModelId = $modelId
    Message = (($result | Out-String).Trim())
  }
}

Write-Host "Starting Claude access monitor..."
Write-Host "Region: $Region"
Write-Host "Models: $($ModelIds -join ', ')"
Write-Host "Attempts: $MaxAttempts, Interval: ${IntervalSeconds}s"
Write-Host "AutoApply: $AutoApply, AutoRestart: $AutoRestart"

for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
  Write-Host "`n[$attempt/$MaxAttempts] Checking model access at $(Get-Date -Format s)"

  foreach ($modelId in $ModelIds) {
    $test = Test-Model -modelId $modelId

    if ($test.Success) {
      Write-Host "SUCCESS: $($test.ModelId) is now accessible."
      if ($AutoApply) {
        Update-EnvFile -modelId $test.ModelId
      } else {
        Write-Host "Set BEDROCK_MODEL_ID=$($test.ModelId) in $EnvFilePath"
      }

      if ($AutoRestart) {
        Restart-DevServer
      } else {
        Write-Host "Restart app after updating model id."
      }

      exit 0
    }

    if ($test.Message -match "INVALID_PAYMENT_INSTRUMENT") {
      Write-Host "BLOCKED ($modelId): INVALID_PAYMENT_INSTRUMENT"
    } elseif ($test.Message -match "AccessDeniedException") {
      Write-Host "BLOCKED ($modelId): AccessDenied"
    } else {
      Write-Host "BLOCKED ($modelId): $($test.Message.Split([Environment]::NewLine)[0])"
    }
  }

  if ($attempt -lt $MaxAttempts) {
    Start-Sleep -Seconds $IntervalSeconds
  }
}

Write-Host "`nTimed out waiting for Claude access."
Write-Host "Please verify Billing payment method and AWS Marketplace subscription status, then rerun this script."
exit 1
