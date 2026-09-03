@echo off
chcp 65001 >nul
cd /d "C:\Users\HP\antigravity\Pantry-OS-&-Kitchen-Co-pilot"

:: Stop any old processes on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Stop any old cloudflared instances
taskkill /F /IM cloudflared.exe >nul 2>&1

:: Start Pantry OS server in background
start /b "" node.exe "C:\Users\HP\antigravity\Pantry-OS-&-Kitchen-Co-pilot\node_modules\tsx\dist\cli.mjs" server.ts > "C:\Users\HP\antigravity\Pantry-OS-&-Kitchen-Co-pilot\server.log" 2>&1

:: Wait 3 seconds for server to start
timeout /t 3 /nobreak >nul

:: Start Cloudflare tunnel in background
start /b "" "C:\Users\HP\.gemini\antigravity\cloudflared.exe" tunnel --url http://localhost:3000 > "C:\Users\HP\antigravity\Pantry-OS-&-Kitchen-Co-pilot\tunnel.log" 2>&1
