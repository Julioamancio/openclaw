# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

### E-mail Check (IMAP)
**Gmail (pessoal):**
- E-mail: julioamancio2014@gmail.com
- App Password: definido em `.env.local` (não versionado)
- IMAP: imap.gmail.com:993 (SSL)

**Gmail (profissional - CSA):**
- E-mail: julio.amancio@colegiosantoantonio.com.br
- App Password: definido em `.env.local` (não versionado)
- IMAP: imap.gmail.com:993 (SSL)

**Comando recomendado:**
```bash
/root/.openclaw/workspace/scripts/check-emails.sh
```

**Template de segredos:**
```bash
cp /root/.openclaw/workspace/.env.local.example /root/.openclaw/workspace/.env.local
# editar .env.local localmente
```

---

Add whatever helps you do your job. This is your cheat sheet.
