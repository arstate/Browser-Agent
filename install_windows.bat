@echo off
setlocal enabledelayedexpansion
title Browser Agent - Windows 1-Click Installer
color 0B

echo ================================================================
echo   🪟 BROWSER AGENT - WINDOWS 1-CLICK INSTALLER
echo ================================================================
echo.

:: 1. Check Python installation
where python >nul 2>nul
if %errorlevel% neq 0 (
    where py >nul 2>nul
    if %errorlevel% neq 0 (
        echo [-] Python 3 belum terinstall di PC Windows Anda.
        echo [*] Mencoba mengunduh dan menginstall Python via winget...
        where winget >nul 2>nul
        if !errorlevel! equ 0 (
            echo [*] Menjalankan: winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
            winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
            echo [!] Harap restart terminal atau jalankan kembali installer ini setelah Python selesai diinstall.
            pause
            exit /b 1
        ) else (
            echo [!] Silakan install Python 3 dari: https://www.python.org/downloads/
            echo     Pastikan centang opsi 'Add Python to PATH' saat instalasi!
            pause
            exit /b 1
        )
    ) else (
        set PYTHON_CMD=py
    )
) else (
    set PYTHON_CMD=python
)

:: 2. Run Setup Script
echo [+] Menjalankan instalasi host dan konfigurasi registri...
"%PYTHON_CMD%" "%~dp0setup.py"

echo.
echo ================================================================
echo   🎉 SELESAI! Langkah Pasang di Chrome:
echo   1. Buka browser Chrome, ketik di URL bar: chrome://extensions
echo   2. Aktifkan switch 'Developer mode' di pojok kanan atas.
echo   3. Klik tombol 'Load unpacked' lalu pilih folder 'extension' ini,
echo      ATAU drag-and-drop file 'extension.crx' ke halaman ekstensi.
echo   4. Banner 'started debugging' otomatis disembunyikan permanen!
echo ================================================================
echo.
pause
