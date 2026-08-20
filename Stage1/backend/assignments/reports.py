"""
assignments/reports.py

Builds the daily parent/guardian progress report for a student. Used by:
  - GET /api/v1/assignments/daily-report/     (in-app preview + WhatsApp share)
  - manage.py send_daily_reports              (scheduled push via a provider)

Everything is derived from data the platform already records (ActivityCompletion,
AssignmentSubmission), so no new tracking is needed.
"""

from datetime import timedelta

from django.utils import timezone

from .models import ActivityCompletion, AssignmentSubmission

# module_key → parent-friendly label
MODULE_LABEL = {
    'foundations':    'AI Foundations',
    'data':           'Working with Data',
    'regression':     'Prediction (Linear Regression)',
    'classification': 'Sorting things (Classification)',
    'neural':         'Neural Networks',
    'vision':         'Computer Vision',
    'agentic':        'Building AI Agents',
    'ethics':         'Responsible AI & Ethics',
}
SUB_LABEL = {'theory': 'read the briefing', 'demo': 'watched a demo',
             'hands': 'did the hands-on', 'assign': 'submitted the task'}


def _streak_days(student, today):
    """Consecutive days (ending today or yesterday) with any learning activity."""
    days = set(
        ActivityCompletion.objects.filter(student=student)
        .values_list('completed_at__date', flat=True)
    ) | set(
        AssignmentSubmission.objects.filter(student=student)
        .values_list('submitted_at__date', flat=True)
    )
    if not days:
        return 0
    # Start the count from today if active today, else yesterday.
    cursor = today if today in days else today - timedelta(days=1)
    streak = 0
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def build_daily_report(student, day=None):
    """Return a structured report dict for one student on `day` (default: today)."""
    day = day or timezone.localdate()

    acts = list(
        ActivityCompletion.objects
        .filter(student=student, completed_at__date=day)
        .order_by('completed_at')
    )
    activities_today = [
        {'module': MODULE_LABEL.get(a.module_key, a.module_key),
         'did': SUB_LABEL.get(a.sub_type, a.sub_type)}
        for a in acts
    ]

    graded = list(
        AssignmentSubmission.objects
        .filter(student=student, status='graded', graded_at__date=day)
        .select_related('assignment')
    )
    graded_today = [
        {'title': g.assignment.title,
         'score': g.score, 'max_score': g.max_score,
         'percent': round(g.score / g.max_score * 100) if g.max_score and g.score is not None else None}
        for g in graded
    ]
    percents = [g['percent'] for g in graded_today if g['percent'] is not None]
    avg_percent = round(sum(percents) / len(percents)) if percents else None

    streak = _streak_days(student, day)
    active = bool(activities_today or graded_today)

    # A warm, specific encouragement line for parents.
    if not active:
        encouragement = f"{first_name(student)} didn't log in today — a gentle nudge tomorrow would help keep the streak going."
    elif avg_percent is not None and avg_percent >= 80:
        encouragement = f"Strong day — {first_name(student)} scored an average of {avg_percent}% on graded work. Worth celebrating!"
    elif len(activities_today) >= 3:
        encouragement = f"{first_name(student)} put in a solid, focused session today. Consistency like this is exactly what builds understanding."
    else:
        encouragement = f"{first_name(student)} made progress today. A quick chat about what they learned reinforces it beautifully."

    return {
        'date': day.isoformat(),
        'student_name': student.name,
        'grade': student.grade,
        'parent_name': student.parent_name or 'Parent',
        'active': active,
        'activities_today': activities_today,
        'activities_count': len(activities_today),
        'graded_today': graded_today,
        'graded_count': len(graded_today),
        'avg_percent': avg_percent,
        'streak_days': streak,
        'encouragement': encouragement,
    }


def first_name(student):
    return (student.name or 'Your child').strip().split(' ')[0]


def report_to_whatsapp_text(report):
    """Render a report dict as a compact WhatsApp-friendly message."""
    d = report
    lines = [
        f"*Sutra · Daily Learning Report*",
        f"{_pretty_date(d['date'])}",
        "",
        f"Hi {d['parent_name']}, here's how {first_name_from(d['student_name'])} (Class {d['grade']}) did today:",
        "",
    ]
    if not d['active']:
        lines.append("• No activity logged today.")
    else:
        lines.append(f"• Chapters done: *{d['activities_count']}*")
        for a in d['activities_today'][:5]:
            lines.append(f"   – {a['module']}: {a['did']}")
        if d['graded_count']:
            avg = f" (avg *{d['avg_percent']}%*)" if d['avg_percent'] is not None else ""
            lines.append(f"• Tasks graded: *{d['graded_count']}*{avg}")
        lines.append(f"• Learning streak: *{d['streak_days']} day{'s' if d['streak_days'] != 1 else ''}* 🔥")
    lines += ["", d['encouragement'], "", "— Team Sutra"]
    return "\n".join(lines)


def _pretty_date(iso):
    from datetime import date
    try:
        return date.fromisoformat(iso).strftime('%A, %d %B %Y')
    except Exception:
        return iso


def first_name_from(name):
    return (name or 'Your child').strip().split(' ')[0]
