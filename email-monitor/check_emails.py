#!/usr/bin/env python3
"""
Email Monitor - Check specific senders from multiple accounts
Runs: 08:00 and 16:00 daily
Outputs: Telegram message with sender + subject
"""

import os
import sys
import imaplib
import email
from email.header import decode_header
from datetime import datetime, timedelta
from dotenv import load_dotenv
import re

# Load environment
load_dotenv()

# Config
ACCOUNTS = [
    {
        "name": "Gmail Pessoal",
        "user": os.getenv("GMAIL_USER"),
        "pass": os.getenv("GMAIL_PASS"),
        "server": os.getenv("IMAP_SERVER", "imap.gmail.com"),
        "port": int(os.getenv("IMAP_PORT", "993")),
        "enabled": os.getenv("GMAIL_USER") and os.getenv("GMAIL_PASS")
    },
    {
        "name": "Santo Antonio",
        "user": os.getenv("CSA_USER"),
        "pass": os.getenv("CSA_PASS"),
        "server": os.getenv("IMAP_SERVER", "imap.gmail.com"),
        "port": int(os.getenv("IMAP_PORT", "993")),
        "enabled": os.getenv("CSA_USER") and os.getenv("CSA_PASS")
    },
    {
        "name": "CSJBH",
        "user": os.getenv("CSJBH_USER"),
        "pass": os.getenv("CSJBH_PASS"),
        "server": os.getenv("IMAP_SERVER", "imap.gmail.com"),
        "port": int(os.getenv("IMAP_PORT", "993")),
        "enabled": os.getenv("CSJBH_USER") and os.getenv("CSJBH_PASS")
    }
]

# Filter to only enabled accounts
ACCOUNTS = [a for a in ACCOUNTS if a["enabled"]]

# Monitored senders
MONITORED_SENDERS = [s.strip().lower() for s in os.getenv("MONITORED_SENDERS", "").split(",") if s.strip()]

# Check window (hours)
CHECK_HOURS = int(os.getenv("CHECK_HOURS", "12"))


def decode_subject(subject):
    """Decode email subject"""
    if subject is None:
        return "(sem assunto)"
    decoded, charset = decode_header(subject)[0]
    if isinstance(decoded, bytes):
        return decoded.decode(charset or "utf-8", errors="replace")
    return decoded


def get_sender_email(from_field):
    """Extract email from From field"""
    if from_field is None:
        return ""
    # Pattern: email@domain.com or Name <email@domain.com>
    match = re.search(r'<([^>]+)>', from_field)
    if match:
        return match.group(1).lower()
    # Just email
    if re.match(r'[^@]+@[^@]+\.[^@]+', from_field):
        return from_field.lower().strip()
    return ""


def check_account(account):
    """Check emails for a specific account"""
    results = []
    
    try:
        print(f"Connecting to {account['name']}...")
        mail = imaplib.IMAP4_SSL(account["server"], account["port"])
        mail.login(account["user"], account["pass"])
        mail.select("inbox")
        
        # Calculate since date
        since_date = (datetime.now() - timedelta(hours=CHECK_HOURS)).strftime("%d-%b-%Y")
        
        # Search for UNSEEN emails since date
        # For Gmail: search by date
        status, messages = mail.search(None, f'(SINCE "{since_date}" UNSEEN)')
        
        if status != "OK" or not messages[0]:
            print(f"  No new emails in {account['name']}")
            mail.logout()
            return []
        
        email_ids = messages[0].split()[-20:]  # Last 20 emails max
        
        for email_id in email_ids:
            try:
                status, data = mail.fetch(email_id, "(RFC822)")
                if status != "OK":
                    continue
                    
                raw_email = data[0][1]
                msg = email.message_from_bytes(raw_email)
                
                from_field = msg.get("From", "")
                subject = decode_subject(msg.get("Subject", ""))
                
                sender_email = get_sender_email(from_field)
                sender_name = from_field if not re.search(r'<[^>]+>', from_field) else re.sub(r'<[^>]+>', '', from_field).strip()
                
                # Check if sender is monitored
                if any(s in sender_email for s in MONITORED_SENDERS):
                    results.append({
                        "account": account["name"],
                        "sender": sender_name or sender_email,
                        "sender_email": sender_email,
                        "subject": subject,
                        "date": msg.get("Date", "")
                    })
                    
            except Exception as e:
                print(f"  Error processing email: {e}")
                continue
        
        mail.logout()
        print(f"  Found {len(results)} matching emails in {account['name']}")
        
    except Exception as e:
        print(f"  ERROR connecting to {account['name']}: {e}")
        return []
    
    return results


def format_telegram_message(all_results):
    """Format results for Telegram"""
    if not all_results:
        return "📧 *Monitor de Emails*\n\nNenhum email dos remetentes monitorados nas últimas 12h."
    
    lines = ["📧 *Monitor de Emails*", ""]
    lines.append(f"🕐 *Verificação:* {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    lines.append("")
    
    # Group by account
    by_account = {}
    for r in all_results:
        acc = r["account"]
        if acc not in by_account:
            by_account[acc] = []
        by_account[acc].append(r)
    
    for account_name, emails in by_account.items():
        lines.append(f"*📁 {account_name}*")
        for e in emails:
            lines.append(f"  • {e['sender']}")
            lines.append(f"    → _{e['subject']}_")
        lines.append("")
    
    lines.append(f"*Total: {len(all_results)} emails*")
    
    return "\n".join(lines)


def main():
    """Main entry point"""
    print(f"Starting email check at {datetime.now()}")
    
    if not ACCOUNTS:
        print("No accounts configured. Check your .env file.")
        sys.exit(1)
    
    if not MONITORED_SENDERS:
        print("No monitored senders configured. Check your .env file.")
        sys.exit(1)
    
    all_results = []
    for account in ACCOUNTS:
        results = check_account(account)
        all_results.extend(results)
    
    # Format message
    message = format_telegram_message(all_results)
    
    # Output for Telegram
    print("\n" + "="*50)
    print("OUTPUT FOR TELEGRAM:")
    print("="*50)
    print(message)
    print("="*50)
    
    # Could integrate with Telegram bot here
    # For now, just print
    
    return 0 if all_results else 0  # Exit code 0 = success


if __name__ == "__main__":
    sys.exit(main())
