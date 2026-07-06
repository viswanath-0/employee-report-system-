"""
utils/emailcheck.py

Personal emails must come from one of a fixed set of accepted providers.
`email_domain_error` returns None when the domain is accepted, or a human-readable
error message otherwise (suggesting the closest provider when it looks like a typo).
"""

# The ONLY email domains the app accepts for a personal email.
ALLOWED_DOMAINS = (
    "gmail.com", "yahoo.com", "yahoo.co.in", "outlook.com", "hotmail.com",
    "icloud.com", "protonmail.com", "proton.me", "rediffmail.com", "ymail.com",
)

_ACCEPTED_LABEL = "Gmail, Yahoo, Outlook, Hotmail, iCloud, Proton, Rediffmail"


def _damerau_levenshtein(a: str, b: str) -> int:
    """Edit distance where a transposition (e.g. gmial->gmail) counts as one edit."""
    la, lb = len(a), len(b)
    d = [[0] * (lb + 1) for _ in range(la + 1)]
    for i in range(la + 1):
        d[i][0] = i
    for j in range(lb + 1):
        d[0][j] = j
    for i in range(1, la + 1):
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1)
    return d[la][lb]


def email_domain_error(email: str) -> str | None:
    """None if the email's domain is an accepted provider; otherwise an error
    message (with a 'did you mean…?' hint when the domain is a near-miss typo)."""
    email = (email or "").strip().lower()
    if "@" not in email:
        return "Please enter a valid email address."
    local, _, domain = email.rpartition("@")
    if not local or not domain:
        return "Please enter a valid email address."
    if domain in ALLOWED_DOMAINS:
        return None
    # Not accepted — if it's a close typo of an allowed provider, suggest it.
    for d in ALLOWED_DOMAINS:
        if len(d.split(".")[0]) >= 5 and _damerau_levenshtein(domain, d) <= 2:
            return f"Did you mean {local}@{d}? Only common email providers are accepted."
    return f"Please use an email from an accepted provider ({_ACCEPTED_LABEL})."
