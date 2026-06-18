$ErrorActionPreference = "Continue"
$repoName = "EduCenter-Pro"
$username = "YoussefMohamed-Joo"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EduCenter Pro - نشر على Vercel + GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 0. Check if setup exe exists
$exePath = "release\EduCenter Pro Setup 1.0.0.exe"
if (Test-Path $exePath) {
  Write-Host "[✓] Setup file found at $exePath" -ForegroundColor Green
  Write-Host "    لرفع الملف على GitHub Releases:" -ForegroundColor Yellow
  Write-Host "    1. اذهب إلى https://github.com/$username/$repoName/releases/new" -ForegroundColor White
  Write-Host "    2. Tag: v1.0.0" -ForegroundColor White
  Write-Host "    3. Release title: EduCenter Pro v1.0.0" -ForegroundColor White
  Write-Host "    4. ارفع الملف: $exePath" -ForegroundColor White
  Write-Host "    5. اضغط Publish release" -ForegroundColor White
} else {
  Write-Host "[!] Setup file not found at $exePath — ابني البرنامج أولاً (npm run build)" -ForegroundColor Yellow
}

# 1. Deploy to Vercel directly
Write-Host ""
Write-Host ">>> نشر على Vercel..." -ForegroundColor Cyan
try {
  vercel --prod --yes 2>&1
  Write-Host "[✓] Vercel deploy complete!" -ForegroundColor Green
} catch {
  Write-Host "[!] فشل نشر Vercel — تأكد من تثبيت Vercel CLI (npm i -g vercel)" -ForegroundColor Red
}

# 2. Git
Write-Host ""
Write-Host ">>> رفع على GitHub..." -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
  git init
  Write-Host "[✓] Git initialized" -ForegroundColor Green
}

git add .
git commit -m "EduCenter Pro v1.0 - $(Get-Date -Format 'yyyy-MM-dd')"

try {
  $ghCheck = Get-Command gh.exe -ErrorAction SilentlyContinue
  if ($ghCheck) {
    gh repo create $repoName --public --source=. --remote=origin --push 2>&1
    Write-Host "[✓] GitHub repo created and pushed!" -ForegroundColor Green
  } else {
    Write-Host ""
    Write-Host "--- إنشاء GitHub Repo يدوياً ---" -ForegroundColor Yellow
    Write-Host "1. https://github.com/new" -ForegroundColor White
    Write-Host "2. Repository name: $repoName" -ForegroundColor White
    Write-Host "3. Public → Create repository" -ForegroundColor White
    Write-Host ""
    Write-Host "ثم شغّل:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/$username/$repoName.git" -ForegroundColor Gray
    Write-Host "  git push -u origin master" -ForegroundColor Gray
  }
} catch {
  Write-Host "[!] خطأ في إنشاء GitHub repo" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  تم ✅" -ForegroundColor Green
Write-Host "  الموقع: https://educenter-pro-murex.vercel.app" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
