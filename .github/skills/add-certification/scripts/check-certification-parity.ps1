[CmdletBinding()]
param(
    [string]$PortfolioRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path,
    [string]$CvRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..\..\cv')).Path
)

$ErrorActionPreference = 'Stop'

$certificationsPath = Join-Path $PortfolioRoot 'src\data\certifications.json'
$certifications = @(Get-Content -Raw $certificationsPath | ConvertFrom-Json)
$expectedCount = $certifications.Count
$expectedKeys = @(0..($expectedCount - 1) | ForEach-Object { $_.ToString() })

$duplicateNames = $certifications |
    Group-Object { $_.name.Trim().ToLowerInvariant() } |
    Where-Object Count -gt 1
if ($duplicateNames) {
    throw "Duplicate portfolio certification names: $($duplicateNames.Name -join ', ')"
}

foreach ($locale in @('en', 'es', 'ca')) {
    $localePath = Join-Path $PortfolioRoot "locales\$locale\certifications.json"
    $localized = Get-Content -Raw $localePath | ConvertFrom-Json
    $actualKeys = @($localized.PSObject.Properties.Name)

    if ($actualKeys.Count -ne $expectedCount) {
        throw "$localePath has $($actualKeys.Count) entries; expected $expectedCount."
    }
    if (Compare-Object $expectedKeys $actualKeys) {
        throw "$localePath keys must be contiguous and ordered from 0 through $($expectedCount - 1)."
    }
}

$cvFiles = @(
    'cv\certifications.tex',
    'cv\certifications_es.tex',
    'cv\certifications_ca.tex'
)

foreach ($relativePath in $cvFiles) {
    $cvPath = Join-Path $CvRoot $relativePath
    $matches = Select-String -Path $cvPath -Pattern '^\s*\\cvhonor\{([^}]*)\}'
    $titles = @($matches | ForEach-Object { $_.Matches[0].Groups[1].Value })

    if ($titles.Count -ne $expectedCount) {
        throw "$cvPath has $($titles.Count) certifications; expected $expectedCount."
    }

    $duplicateTitles = $titles |
        Group-Object { $_.Trim().ToLowerInvariant() } |
        Where-Object Count -gt 1
    if ($duplicateTitles) {
        throw "Duplicate CV certification titles in ${cvPath}: $($duplicateTitles.Name -join ', ')"
    }
}

Write-Output "Certification parity passed: $expectedCount portfolio records and $expectedCount entries in each locale and CV section."