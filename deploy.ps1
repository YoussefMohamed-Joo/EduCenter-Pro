Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EduCenter Pro - نشر على GitHub + Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Git init (if not already done)
if (-not (Test-Path ".git")) {
  git init
  Write-Host "[✓] Git initialized" -ForegroundColor Green
} else {
  Write-Host "[✓] Git already initialized" -ForegroundColor Green
}

# 2. Add all files
git add .
Write-Host "[✓] Files staged" -ForegroundColor Green

# 3. Commit
$commitMsg = "EduCenter Pro v1.0 - " + (Get-Date -Format "yyyy-MM-dd")
git commit -m $commitMsg
Write-Host "[✓] Files committed" -ForegroundColor Green

# 4. Create GitHub repo via API
$repoName = "EduCenter-Pro"
$username = "YoussefMohamed-Joo"

try {
  # Try using gh CLI if available
  $ghCheck = Get-Command gh.exe -ErrorAction SilentlyContinue
  if ($ghCheck) {
    gh repo create $repoName --public --source=. --remote=origin --push
    Write-Host "[✓] GitHub repo created and pushed!" -ForegroundColor Green
  } else {
    # Manual instructions
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  إنشاء GitHub Repo يدوياً" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. افتح: https://github.com/new" -ForegroundColor White
    Write-Host "2. اسم الـ repo: $repoName" -ForegroundColor White
    Write-Host "3. اختار Public" -ForegroundColor White
    Write-Host "4. اضغط Create repository" -ForegroundColor White
    Write-Host ""
    Write-Host "ثم شغّل هذه الأوامر يدوياً:" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    Write-Host "git remote add origin https://github.com/$username/$repoName.git"
    Write-Host "git push -u origin main"
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
  }
} catch {
  Write-Host "[!] خطأ في إنشاء الـ repo" -ForegroundColor Red
}

# 5. Vercel instructions
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  نشر على Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. افتح: https://vercel.com/new" -ForegroundColor White
Write-Host "2. اختر الـ repo: $username/$repoName" -ForegroundColor White
Write-Host "3. في Root Directory اختر: website" -ForegroundColor White
Write-Host "4. اضغط Deploy" -ForegroundColor White
Write-Host ""
Write-Host "رابط الموقع بعد النشر:" -ForegroundColor Green
Write-Host "https://educenter-pro.vercel.app" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
