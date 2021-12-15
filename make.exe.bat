@echo off

: call pkg . -t node12-win-x64
call pkg . -t node14-win-x64 --compress Brotli --options max-old-space-size=2048,tls-min-v1.0

move /Y baixar_lista.exe ./FINAL/baixar_lista.exe 