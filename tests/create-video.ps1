# PowerShell script to create video from test screenshots
# Requires FFmpeg to be installed

param(
    [string]$InputPath = "screenshots",
    [string]$OutputFile = "test-recording.mp4",
    [float]$FrameRate = 0.5
)

Write-Host "🎬 Creating video from screenshots..." -ForegroundColor Cyan

# Check if ffmpeg is installed
$ffmpegPath = Get-Command ffmpeg -ErrorAction SilentlyContinue

if (-not $ffmpegPath) {
    Write-Host "❌ FFmpeg not found. Installing via Chocolatey..." -ForegroundColor Yellow
    
    # Check if Chocolatey is installed
    $chocoPath = Get-Command choco -ErrorAction SilentlyContinue
    
    if (-not $chocoPath) {
        Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
    }
    
    Write-Host "Installing FFmpeg..." -ForegroundColor Yellow
    choco install ffmpeg -y
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Get the full path
$fullInputPath = Join-Path $PSScriptRoot $InputPath
$fullOutputPath = Join-Path $PSScriptRoot $OutputFile

Write-Host "📁 Input: $fullInputPath" -ForegroundColor Gray
Write-Host "📁 Output: $fullOutputPath" -ForegroundColor Gray

# Check if screenshots exist
$screenshots = Get-ChildItem -Path $fullInputPath -Filter "*.png" -ErrorAction SilentlyContinue

if (-not $screenshots) {
    Write-Host "❌ No screenshots found in $fullInputPath" -ForegroundColor Red
    exit 1
}

Write-Host "📸 Found $($screenshots.Count) screenshots" -ForegroundColor Green

# Create video with transitions
Write-Host "🎬 Creating video (this may take a moment)..." -ForegroundColor Cyan

$ffmpegArgs = @(
    "-framerate", $FrameRate,
    "-pattern_type", "glob",
    "-i", "$fullInputPath/*.png",
    "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "18",
    "-movflags", "+faststart",
    "-y",
    $fullOutputPath
)

& ffmpeg @ffmpegArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Video created successfully: $fullOutputPath" -ForegroundColor Green
    Write-Host "🎥 Duration: $(($screenshots.Count / $FrameRate).ToString('0.0')) seconds" -ForegroundColor Cyan
    
    # Open the video
    Write-Host "🎬 Opening video..." -ForegroundColor Cyan
    Start-Process $fullOutputPath
} else {
    Write-Host "❌ Failed to create video" -ForegroundColor Red
    exit 1
}
