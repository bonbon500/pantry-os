Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File ""C:\Users\HP\antigravity\Pantry-OS-&-Kitchen-Co-pilot\start_pantry_os.ps1""", 0, False
Set WshShell = Nothing
