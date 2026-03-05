#!/usr/bin/env python3
"""
Check e-mails de remetentes específicos via IMAP
Versão sem credenciais hardcoded (carrega de .env.local)
"""

import imaplib
import email
from email.header import decode_header
import os
import sys

ENV_PATH = "/root/.openclaw/workspace/.env.local"


def load_env(path: str) -> None:
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


load_env(ENV_PATH)

ACCOUNTS = [
    {
        "name": "PESSOAL",
        "email": os.getenv("GMAIL_PERSONAL_EMAIL", ""),
        "password": os.getenv("GMAIL_PERSONAL_APP_PASSWORD", ""),
    },
    {
        "name": "CSA",
        "email": os.getenv("GMAIL_CSA_EMAIL", ""),
        "password": os.getenv("GMAIL_CSA_APP_PASSWORD", ""),
    },
]

MONITORED_SENDERS = [
    "carlos.fonseca@colegiosantoantonio.com.br",
    "caroline.xavier@colegiosantoantonio.com.br",
    "fernanda.campos@colegiosantoantonio.com.br",
    "fernanda.horta@colegiosantoantonio.com.br",
    "ivana.pinheiro@colegiosantoantonio.com.br",
    "natalia.mendes@colegiosantoantonio.com.br",
    "renata.bahia@colegiosantoantonio.com.br",
    "secretaria@csjbh.com.br",
    "juliana.furtado@csjbh.com.br",
]


def get_sender(msg):
    return msg.get("From", "")


def check_account(account):
    results = []
    if not account["email"] or not account["password"]:
        return results
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com", 993)
        mail.login(account["email"], account["password"])
        mail.select("inbox")

        status, messages = mail.search(None, "UNSEEN")
        if status != "OK" or not messages[0]:
            return results

        msg_ids = messages[0].split()

        for msg_id in msg_ids[:20]:
            status, msg_data = mail.fetch(msg_id, "(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT)])")
            if status != "OK":
                continue

            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            sender = get_sender(msg)
            subject = msg.get("Subject", "Sem assunto")

            sender_lower = sender.lower()
            for monitored in MONITORED_SENDERS:
                if monitored.lower() in sender_lower:
                    decoded_subject = ""
                    for part, charset in decode_header(subject):
                        if isinstance(part, bytes):
                            decoded_subject += part.decode(charset or "utf-8", errors="ignore")
                        else:
                            decoded_subject += part

                    results.append(f"{account['name']}: {sender[:50]} - {decoded_subject[:60]}")
                    break

        mail.close()
        mail.logout()
    except Exception as e:
        print(f"Erro ao verificar {account['name']}: {e}", file=sys.stderr)

    return results


def main():
    all_results = []
    for account in ACCOUNTS:
        results = check_account(account)
        all_results.extend(results)

    if all_results:
        print("📧 *Novos e-mails de remetentes monitorados:*\n")
        for result in all_results:
            print(result)
    else:
        print("✅ Nenhum e-mail novo de remetentes monitorados.")


if __name__ == "__main__":
    main()
