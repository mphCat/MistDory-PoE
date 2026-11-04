param(
    [switch]$DryRun,
    [string]$NodePath
)

$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$runtime = $NodePath
$isElectronRuntime = $false
if (-not $runtime) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCommand) { $runtime = $nodeCommand.Source }
}
if (-not $runtime) {
    $codeCandidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'),
        (Join-Path $env:ProgramFiles 'Microsoft VS Code\Code.exe')
    )
    $runtime = $codeCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
}
if (-not $runtime -or -not (Test-Path -LiteralPath $runtime -PathType Leaf)) {
    throw 'Node.js was not found. Install Node.js or supply -NodePath with a Node-compatible executable. No catalog was changed.'
}
$runtime = (Resolve-Path -LiteralPath $runtime).Path
$isElectronRuntime = [IO.Path]::GetFileName($runtime) -ieq 'Code.exe'
$priorElectronMode = $env:ELECTRON_RUN_AS_NODE
$runDir = (Resolve-Path -LiteralPath ([IO.Path]::GetTempPath())).Path

function Invoke-CatalogScript {
    param([string]$ScriptName, [string[]]$ScriptArguments = @())
    $scriptPath = Join-Path $PSScriptRoot $ScriptName
    $argumentList = @('"' + $scriptPath + '"') + $ScriptArguments
    # Wait explicitly: Code.exe is a Windows GUI executable even in its Node runtime mode.
    $outputFile = Join-Path $runDir ('mistdory-release-' + [Guid]::NewGuid().ToString('N') + '.out')
    $errorFile = Join-Path $runDir ('mistdory-release-' + [Guid]::NewGuid().ToString('N') + '.err')
    try {
        $process = Start-Process -FilePath $runtime -ArgumentList $argumentList -WorkingDirectory $runDir -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput $outputFile -RedirectStandardError $errorFile
        if (Test-Path -LiteralPath $outputFile) { Get-Content -LiteralPath $outputFile | Write-Host }
        if (Test-Path -LiteralPath $errorFile) { Get-Content -LiteralPath $errorFile | Write-Host }
        if ($process.ExitCode -ne 0) { throw ($ScriptName + ' failed (exit ' + $process.ExitCode + '). Release preparation is blocked.') }
    } finally {
        if (Test-Path -LiteralPath $outputFile) { Remove-Item -LiteralPath $outputFile }
        if (Test-Path -LiteralPath $errorFile) { Remove-Item -LiteralPath $errorFile }
    }
}

try {
    if ($isElectronRuntime) { $env:ELECTRON_RUN_AS_NODE = '1' }
    $refreshArgs = @()
    if ($DryRun) { $refreshArgs += '--dry-run' }
    Invoke-CatalogScript -ScriptName 'refresh-videos.cjs' -ScriptArguments $refreshArgs
    if (-not $DryRun) {
        Invoke-CatalogScript -ScriptName 'verify-catalog.cjs' -ScriptArguments @('--require-refresh', '--max-age-hours', '24')
        Write-Host 'Catalog refresh and release verification passed. Review the diff before publishing.'
    } else {
        Write-Host 'Full online audit passed in dry-run mode. Catalogs were not changed; run without -DryRun before publishing.'
    }
} finally {
    if ($null -eq $priorElectronMode) { Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue }
    else { $env:ELECTRON_RUN_AS_NODE = $priorElectronMode }
}
