Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

appPath = FSO.GetParentFolderName(WScript.ScriptFullName)

WshShell.Run "cmd /c cd /d """ & appPath & "\backend"" && node server.js", 0, False