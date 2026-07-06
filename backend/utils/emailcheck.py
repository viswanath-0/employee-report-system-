"""
utils/emailcheck.py

Catch likely typos of common email providers (e.g. "gomail.com" -> "gmail.com").
EmailStr already guarantees a well-formed address; this adds a "did you mean…?"
guard so an obviously-mistyped domain doesn't sail through.
"""

# The big consumer providers people usually mean. Kept intentionally to
# longer names (SLD >= 5 chars) so short custom company domains don't false-match.
COMMON_DOMAINS = (
    "gmail.com", "yahoo.com", "yahoo.co.in", "outlook.com", "hotmail.com",
    "icloud.com", "protonmail.com", "proton.me", "rediffmail.com", "ymail.com",
)


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


def email_domain_suggestion(email: str) -> str | None:
    """If the email's domain is a near-miss typo of a common provider (but not
    exactly one), return the corrected full email; otherwise None."""
    email = (email or "").strip().lower()
    if "@" not in email:
        return None
    local, _, domain = email.rpartition("@")
    if not local or not domain or domain in COMMON_DOMAINS:
        return None
    for d in COMMON_DOMAINS:
        if len(d.split(".")[0]) >= 5 and _damerau_levenshtein(domain, d) <= 2:
            return f"{local}@{d}"
    return None
