# Backup Técnico — OTServer + Site (MyAAC)

**Data:** 2026-02-24 (UTC)  
**Servidor:** `srv1359505`  
**Objetivo:** registrar tudo que foi configurado/instalado para facilitar restauração futura após reinstalação do agente.

---

## 1) Estado geral validado

- OpenClaw Gateway preservado e funcional (`127.0.0.1:18789`)
- Serviços ativos:
  - `otserv.service`
  - `nginx`
  - `mariadb`
- Portas ativas:
  - `80` (site)
  - `7171` e `7172` (OTServer)
- Site respondendo `HTTP 200` em:
  - `http://127.0.0.1/`
  - `http://187.77.36.21/`

---

## 2) OTServer (game)

### Binário e diretório
- Diretório do servidor: `/opt/otserv`
- Binário principal: `/opt/otserv/ots`

### Banco de dados
- Database: `otserv`
- Tabelas essenciais verificadas: `accounts`, `players`
- Usuário de app validado para DB:
  - user: `otuser`
  - senha: `senha123`

### Serviço systemd
Arquivo criado/ajustado:
- `/etc/systemd/system/otserv.service`

Conteúdo funcional:
- `User=otserv`
- `Group=otserv`
- `WorkingDirectory=/opt/otserv`
- `ExecStart=/opt/otserv/ots`
- `Restart=on-failure`
- `WantedBy=multi-user.target`

Ações executadas:
- `systemctl daemon-reload`
- `systemctl enable --now otserv.service`

Resultado:
- serviço sobe automático em reboot (autostart **enabled**)

---

## 3) Site (MyAAC + Nginx + PHP-FPM)

### Caminho do site
- `/var/www/myaac`

### Correção crítica aplicada (erro 500)
Foi identificado erro por tabela ausente (`myaac_account_actions`) no banco.

Ações:
1. Backup do banco antes da correção (`mysqldump` em `/root/backups/...`).
2. Import do schema do MyAAC:
   - arquivo: `/var/www/myaac/install/includes/schema.sql`
   - comando: import no DB `otserv`

Resultado:
- site voltou a responder `HTTP 200`

---

## 4) Limpeza de erros Lua / duplicidades

### Correções de scripts com erro fatal
1. `data/scripts/talkactions/player/resettasks.lua`
   - adicionado: `resetTasks:groupType("god")`

2. `data/scripts/creaturescripts/player/welcome_vip.lua`
   - trocado `LoginEvent()` por `CreatureEvent("welcomeVip")`

### Duplicidades desativadas
Arquivos desativados/renomeados para `.disabled`:
- `data-global/scripts/custom/top_level_highscore.lua.disabled`
- `data/scripts/actions/items/cobra_flask.lua.disabled`
- `data-global/scripts/actions/items/enchanting.lua.disabled`
- `data-global/scripts/actions/bosses_levers/magma_bubble.lua.disabled`
- `data-global/scripts/actions/bosses_levers/the_primal_manace.lua.disabled`
- `data-global/scripts/actions/items/silvered_trap.lua.disabled`
- `data-global/scripts/actions/items/falcon_escutcheon.lua.disabled`

### Eventos ausentes (Soul War / compat)
Arquivo criado:
- `data-global/scripts/creaturescripts/monster/soul_war_missing_events_fix.lua`

Função:
- registrar handlers fallback para eventos ausentes (ex.: `FourthTaintBossesPrepareDeath`, `NecromanticFocusDeath`, etc.)
- objetivo: eliminar `Unknown event name` no boot

---

## 5) Limpeza de mapa/NPC/spawn inválidos

### World Monster
Arquivo ajustado:
- `data-global/world/world-monster.xml`

Removidos spawns de monstros inexistentes (ex.: `Guard Castle`, `Titanax`, `Dreadvei`, `Ecliptus`, etc.).

### World NPC
Arquivo ajustado:
- `data-global/world/world-npc.xml`

Removidos NPCs inexistentes (ex.: `Castle War`, `battlefield`, `Snowball`, `Zombie Event`, `VipPotionsSeller`, `Obsidian Buyer`, etc.).

### Teleports inválidos
Arquivo ajustado:
- `data-global/startup/tables/teleport.lua`

Entradas removidas:
- AID `4253`
- UID `39007`

Resultado:
- eliminação de erros `Wrong item id` e `Can not find ...` relacionados a esses pontos.

---

## 6) Ferramenta de transcrição de áudio instalada

Objetivo: permitir leitura de áudios do Telegram no servidor.

Instalações:
- `ffmpeg`
- `python3-venv`
- venv: `/opt/stt-venv`
- pacote: `faster-whisper`

Script criado:
- `/root/.openclaw/workspace/scripts/transcribe-audio.sh`

Uso:
```bash
/root/.openclaw/workspace/scripts/transcribe-audio.sh /caminho/audio.ogg pt
```

---

## 7) Teste funcional de conta/personagem

Conta de teste criada no DB:
- Account: `920001`
- Senha: `Teste@1234`
- Personagem: `KnightTeste`

Validação:
- conta criada
- personagem criado e vinculado
- senha validada por hash (`PASSWORD_OK`)

> Recomendado: remover essa conta após testes finais de login.

---

## 8) Persistência em reboot (requisito principal)

Confirmado `enabled`:
- `otserv`
- `nginx`
- `mariadb`

Conclusão:
- após reboot da VPS, game + site sobem automaticamente.

---

## 9) Arquivos-chave para referência futura

- `/etc/systemd/system/otserv.service`
- `/opt/otserv/config.lua`
- `/opt/otserv/data-global/world/world-monster.xml`
- `/opt/otserv/data-global/world/world-npc.xml`
- `/opt/otserv/data-global/startup/tables/teleport.lua`
- `/opt/otserv/data-global/scripts/creaturescripts/monster/soul_war_missing_events_fix.lua`
- `/var/www/myaac/config.local.php`
- `/root/.openclaw/workspace/scripts/transcribe-audio.sh`

---

## 10) Observação operacional

Durante as mudanças, o OpenClaw foi mantido estável e sem intervenção destrutiva no gateway. Todas as alterações focaram OTServer/site e foram validadas por restart + health check.
