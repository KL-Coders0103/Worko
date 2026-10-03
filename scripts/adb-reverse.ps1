$ErrorActionPreference = 'Stop'

Write-Host "Checking connected Android devices..."
adb devices

$deviceLines = @(adb devices | Select-String '\tdevice$')
if ($deviceLines.Count -eq 0) {
  throw "No authorized Android device found. Connect your phone, enable USB debugging, and authorize this PC."
}

Write-Host "Setting up reverse port forwarding (device localhost:3000 -> PC localhost:3000)..."
adb reverse tcp:3000 tcp:3000
if ($LASTEXITCODE -ne 0) {
  throw "adb reverse failed. Check the USB connection and device authorization."
}

Write-Host "Active reverse mappings:"
adb reverse --list
Write-Host "Done. The mobile app should use http://127.0.0.1:3000/api/v1"
