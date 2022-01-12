@echo off

call pkg . -t node14-linux-x64 --compress Brotli --options max-old-space-size=2048,tls-min-v1.0 --no-dict 
