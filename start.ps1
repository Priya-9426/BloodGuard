Write-Host "========================================================" -ForegroundColor Red
Write-Host "   🩸 Starting BloodGuard Emergency Platform..." -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Red

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

Write-Host "`n[1/3] Starting Python ML Service (Port 5001)..." -ForegroundColor Yellow
Start-Process -FilePath "$root\.venv\Scripts\python.exe" -ArgumentList "-m uvicorn fraud_detector:app --app-dir `"$root\src\backend\ml`" --host 127.0.0.1 --port 5001" -WindowStyle Minimized

Start-Sleep -Seconds 2

Write-Host "[2/3] Starting Express Backend API (Port 4000)..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "`"$root\src\backend\server.js`"" -WindowStyle Minimized

Start-Sleep -Seconds 2

Write-Host "[3/3] Opening BloodGuard Web Application..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "   ✅ BloodGuard is LIVE on http://localhost:3000" -ForegroundColor White
Write-Host "   🔑 Admin: admin@bloodguard.health / Admin@123456" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Green

& node "$root\server.js"
