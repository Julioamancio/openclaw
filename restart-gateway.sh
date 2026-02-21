#!/bin/bash
# Reiniciar gateway OpenClaw

echo "Matando processos antigos..."
pkill -f "openclaw.*gateway" 2>/dev/null || true
sleep 2

echo "Limpando estado de dispositivo..."
rm -f ~/.openclaw/identity/device.json

echo "Iniciando gateway..."
openclaw gateway start &
sleep 3

echo "Verificando status..."
openclaw gateway status 2>&1 || echo "Ainda com problema de pareamento"

echo "Pronto!"
