#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [switch]$Json,
    [Alias('h')]
    [switch]$Help,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$FeatureDescription
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Output "Usage: ./create-new-feature.ps1 [--json] <feature_description>"
    exit 0
}

$descriptionText = ($FeatureDescription -join ' ').Trim()
if (-not $descriptionText) {
    Write-Error "Usage: ./create-new-feature.ps1 [--json] <feature_description>"
    exit 1
}

function Find-RepositoryRoot {
    param(
        [string]$StartDir,
        [string[]]$Markers = @('.git', '.specify')
    )

    $current = (Resolve-Path $StartDir).ProviderPath
    while ($true) {
        foreach ($marker in $Markers) {
            if (Test-Path (Join-Path $current $marker)) {
                return $current
            }
        }

        $parent = Split-Path $current -Parent
        if ($parent -eq $current) {
            return $null
        }
        $current = $parent
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = $null
$hasGit = $false

try {
    $gitRoot = git rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $gitRoot) {
        $repoRoot = ($gitRoot | Select-Object -First 1).Trim()
        $hasGit = $true
    }
} catch {
    # ignore git errors and fall back to marker search
}

if (-not $repoRoot) {
    $repoRoot = Find-RepositoryRoot -StartDir $scriptDir
    if (-not $repoRoot) {
        Write-Error "Error: Could not determine repository root. Please run this script from within the repository."
        exit 1
    }
}

Set-Location $repoRoot

$specsDir = Join-Path $repoRoot 'specs'
New-Item -ItemType Directory -Path $specsDir -Force | Out-Null

$highest = 0
if (Test-Path $specsDir) {
    Get-ChildItem -Path $specsDir -Directory | ForEach-Object {
        if ($_.Name -match '^(\d{3})') {
            $number = [int]$matches[1]
            if ($number -gt $highest) {
                $highest = $number
            }
        }
    }
}

$next = $highest + 1
$featureNum = '{0:000}' -f $next

$normalized = $descriptionText.ToLower() `
    -replace '[^a-z0-9]', '-' `
    -replace '-{2,}', '-' `
    -replace '^-', '' `
    -replace '-$', ''

$words = $normalized -split '-' | Where-Object { $_ }
$wordSegment = ($words | Select-Object -First 3) -join '-'

if ($wordSegment) {
    $branchName = "$featureNum-$wordSegment"
} else {
    $branchName = "$featureNum-"
}

if ($hasGit) {
    git checkout -b $branchName | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create git branch: $branchName"
        exit $LASTEXITCODE
    }
} else {
    Write-Warning "[specify] Warning: Git repository not detected; skipped branch creation for $branchName"
}

$featureDir = Join-Path $specsDir $branchName
New-Item -ItemType Directory -Path $featureDir -Force | Out-Null

$template = Join-Path $repoRoot '.specify/templates/spec-template.md'
$specFile = Join-Path $featureDir 'spec.md'
if (Test-Path $template) {
    Copy-Item $template $specFile -Force
} else {
    New-Item -ItemType File -Path $specFile -Force | Out-Null
}

$env:SPECIFY_FEATURE = $branchName

if ($Json) {
    [PSCustomObject]@{
        BRANCH_NAME = $branchName
        SPEC_FILE   = $specFile
        FEATURE_NUM = $featureNum
    } | ConvertTo-Json -Compress
} else {
    Write-Output "BRANCH_NAME: $branchName"
    Write-Output "SPEC_FILE: $specFile"
    Write-Output "FEATURE_NUM: $featureNum"
    Write-Output "SPECIFY_FEATURE environment variable set to: $branchName"
}
