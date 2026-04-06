$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
npm.cmd run dev
