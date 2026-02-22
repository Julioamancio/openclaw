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
- App Password: REDACTED_GMAIL_PERSONAL_APP_PASSWORD
- IMAP: imap.gmail.com:993 (SSL)

**Gmail (profissional - CSA):**
- E-mail: julio.amancio@colegiosantoantonio.com.br
- App Password: REDACTED_GMAIL_CSA_APP_PASSWORD
- IMAP: imap.gmail.com:993 (SSL)

**Comando de verificação (openssl):**
```bash
# Gmail pessoal
echo -e "a login julioamancio2014@gmail.com 'PASSWORD'\na select inbox\na search unseen\na logout" | openssl s_client -connect imap.gmail.com:993 -crlf 2>/dev/null | grep -E "^\* SEARCH|^a OK"

# Gmail CSA
echo -e "a login julio.amancio@colegiosantoantonio.com.br 'PASSWORD'\na select inbox\na search unseen\na logout" | openssl s_client -connect imap.gmail.com:993 -crlf 2>/dev/null | grep -E "^\* SEARCH|^a OK"
```

---

Add whatever helps you do your job. This is your cheat sheet.
