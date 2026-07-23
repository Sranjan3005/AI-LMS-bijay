"""
send_daily_reports — compose (and optionally send) the daily guardian progress
report for every opted-in student.

Run manually or on a schedule (cron / Azure Container Apps job), e.g. every
evening:  python manage.py send_daily_reports

By default it runs in DRY-RUN mode and just prints each message — safe to try
locally with no credentials. To actually deliver over WhatsApp, set the Twilio
environment variables below and pass --send:

    TWILIO_ACCOUNT_SID=...           # Twilio account SID
    TWILIO_AUTH_TOKEN=...            # Twilio auth token
    TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   # your WhatsApp-enabled sender

    python manage.py send_daily_reports --send

(Any provider works — swap `_send_whatsapp` for Meta's WhatsApp Cloud API,
Gupshup, etc. The report text is identical.)
"""

import os

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from assignments.reports import build_daily_report, report_to_whatsapp_text

User = get_user_model()


class Command(BaseCommand):
    help = 'Compose and (optionally) send the daily guardian progress report.'

    def add_arguments(self, parser):
        parser.add_argument('--send', action='store_true',
                            help='Actually send via the configured provider (default: dry-run/print).')
        parser.add_argument('--email', type=str, default=None,
                            help='Limit to a single student by email (for testing).')
        parser.add_argument('--only-active', action='store_true',
                            help='Skip students with no activity today.')

    def handle(self, *args, **opts):
        # Reports contain emoji (🔥) and bullets — make sure a legacy Windows
        # console (cp1252) can print them in dry-run mode instead of crashing.
        import sys
        for stream in (sys.stdout, sys.stderr):
            try:
                stream.reconfigure(encoding='utf-8', errors='replace')
            except Exception:
                pass

        qs = User.objects.filter(role='student', daily_report_opt_in=True).exclude(parent_phone='')
        if opts['email']:
            qs = qs.filter(email=opts['email'])

        sent = skipped = 0
        for student in qs:
            report = build_daily_report(student)
            if opts['only_active'] and not report['active']:
                skipped += 1
                continue
            text = report_to_whatsapp_text(report)

            if opts['send']:
                ok = self._send_whatsapp(student.parent_phone, text)
                sent += 1 if ok else 0
                skipped += 0 if ok else 1
            else:
                self.stdout.write(self.style.HTTP_INFO(
                    f"\n── To {student.parent_name or 'Parent'} <{student.parent_phone}> "
                    f"for {student.name} ──"))
                self.stdout.write(text)
                sent += 1

        mode = 'sent' if opts['send'] else 'previewed'
        self.stdout.write(self.style.SUCCESS(f"\nDone. {sent} report(s) {mode}, {skipped} skipped."))

    # ── provider integration (Twilio WhatsApp) ──────────────────────────────
    def _send_whatsapp(self, to_phone, body):
        sid   = os.environ.get('TWILIO_ACCOUNT_SID')
        token = os.environ.get('TWILIO_AUTH_TOKEN')
        sender = os.environ.get('TWILIO_WHATSAPP_FROM')  # e.g. whatsapp:+14155238886
        if not (sid and token and sender):
            self.stderr.write(self.style.WARNING(
                'TWILIO_* env vars not set — cannot send. Run without --send to preview.'))
            return False
        try:
            from twilio.rest import Client   # pip install twilio
        except ImportError:
            self.stderr.write(self.style.ERROR('twilio package not installed. `pip install twilio`.'))
            return False

        digits = ''.join(c for c in to_phone if c.isdigit())
        try:
            Client(sid, token).messages.create(
                from_=sender, to=f'whatsapp:+{digits}', body=body)
            self.stdout.write(self.style.SUCCESS(f'Sent to +{digits}'))
            return True
        except Exception as e:   # provider/network errors shouldn't kill the batch
            self.stderr.write(self.style.ERROR(f'Failed for +{digits}: {e}'))
            return False
