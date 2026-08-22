# ==============================================================================
# Browser Agent - Windows 1-Click PowerShell Installer
# ==============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  🪟 BROWSER AGENT - WINDOWS POWERSHELL 1-CLICK INSTALLER" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Check Python
$pythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonPath) {
    $pythonPath = (Get-Command py -ErrorAction SilentlyContinue).Source
}

if (-not $pythonPath) {
    Write-Host "[-] Python 3 belum terinstall di Windows Anda." -ForegroundColor Yellow
    Write-Host "[*] Mencoba install Python via winget..." -ForegroundColor Green
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
        Write-Host "[!] Harap buka kembali PowerShell setelah instalasi Python selesai." -ForegroundColor Yellow
        Read-Host "Tekan Enter untuk keluar..."
        exit
    } else {
        Write-Host "[!] Silakan unduh dan install Python dari: https://www.python.org/downloads/" -ForegroundColor Red
        Write-Host "    Penting: Centang 'Add Python to PATH' saat install!" -ForegroundColor Red
        Read-Host "Tekan Enter untuk keluar..."
        exit
    }
}

Write-Host "[+] Menjalankan setup.py..." -ForegroundColor Green
& python "$ScriptDir\setup.py"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  🎉 INSTALASI BERHASIL!" -ForegroundColor Green
Write-Host "  1. Buka Chrome -> chrome://extensions" -ForegroundColor White
Write-Host "  2. Aktifkan 'Developer mode' di pojok kanan atas." -ForegroundColor White
Write-Host "  3. Klik 'Load unpacked' lalu pilih folder 'extension'." -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Tekan Enter untuk selesai..."
