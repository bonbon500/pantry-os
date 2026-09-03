$workDir = "C:\Users\HP\antigravity\Pantry-OS-&-Kitchen-Co-pilot"
Set-Location $workDir

# Ensure data directory exists
if (-not (Test-Path "$workDir\data")) {
    New-Item -ItemType Directory -Path "$workDir\data" -Force | Out-Null
}

# 1. Stop any old processes on port 3000
try {
    $conns = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
} catch {}

# 2. Stop any old cloudflared instances
Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue

# 3. Start Node server in background
$serverProcess = Start-Process -FilePath "node.exe" -ArgumentList "`"$workDir\node_modules\tsx\dist\cli.mjs`"", "server.ts" -WorkingDirectory $workDir -PassThru -WindowStyle Hidden -RedirectStandardOutput "$workDir\data\server.log" -RedirectStandardError "$workDir\data\server_err.log"

Start-Sleep -Seconds 3

# 4. Start Cloudflare tunnel in background
$tunnelProcess = Start-Process -FilePath "C:\Users\HP\.gemini\antigravity\cloudflared.exe" -ArgumentList "tunnel", "--url", "http://localhost:3000" -WorkingDirectory $workDir -PassThru -WindowStyle Hidden -RedirectStandardOutput "$workDir\data\tunnel.log" -RedirectStandardError "$workDir\data\tunnel_err.log"

# 5. Extract URL and update Desktop link file
Start-Sleep -Seconds 6
if (Test-Path "$workDir\data\tunnel_err.log") {
    $match = Select-String -Path "$workDir\data\tunnel_err.log" -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com"
    if ($match) {
        $url = $match.Matches[0].Value
        $txt = "קישור לפתיחה מהפלאפון (מכל מקום בעולם):`r`n$url`r`n`r`nקישור קבוע לרשת ה-Wi-Fi הביתית (שלעולם אינו משתנה):`r`nhttp://192.168.1.186:3000"
        Set-Content -Path "C:\Users\HP\Desktop\קישור לאפליקציה בטלפון.txt" -Value $txt -Encoding UTF8
    }
}
