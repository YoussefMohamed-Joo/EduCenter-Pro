@echo off
title EduCenter Pro
cd /d "%~dp0"
start "" "node_modules\electron\dist\electron.exe" "."
exit
