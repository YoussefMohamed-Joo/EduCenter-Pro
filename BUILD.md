# بناء EduCenter Pro لأنظمة متعددة

## 🪟 ويندوز (من أي جهاز)
```bash
npm run electron:build
```
بني الـ NSIS Installer في `release/`

## 🍎 ماك (يحتاج جهاز Mac)
### الطريقة 1 — GitHub Actions (موصى به)
1. اعمل commit
2. اعمل tag:
```bash
git tag v1.0.2
git push origin v1.0.2
```
GitHub Actions هتبني Windows + macOS تلقائياً وترفعهم على GitHub Releases

### الطريقة 2 — من Mac مباشرة
```bash
git clone https://github.com/YoussefMohamed-Joo/EduCenter-Pro.git
cd EduCenter-Pro
npm install
npm run electron:build
```
هيبني `.dmg` + `.zip` في `release/`
