"""
validation.py

All validation functions — reused from original project.
"""


class Validation:

    # ---------------- Email ---------------- #

    @staticmethod
    def validate_email(email):
        if "@gmail.com" not in email.lower():
            return False
        return True

    # ---------------- Password ---------------- #

    @staticmethod
    def validate_password(password):
        if len(password) != 8:
            return False
        has_upper   = False
        has_lower   = False
        has_digit   = False
        has_special = False
        for char in password:
            if char.isupper():
                has_upper = True
            elif char.islower():
                has_lower = True
            elif char.isdigit():
                has_digit = True
            else:
                has_special = True
        return has_upper and has_lower and has_digit and has_special

    # ---------------- Department ---------------- #

    @staticmethod
    def validate_department(department):
        departments = [
            "AI", "HR", "IT", "Finance",
            "Testing", "Development", "Sales", "Marketing"
        ]
        return department.upper() in [d.upper() for d in departments]

    # ---------------- Session ---------------- #

    @staticmethod
    def validate_session(session):
        sessions = ["Morning", "Afternoon", "Evening", "Leave"]
        return session.title() in sessions

    # ---------------- Date (DD-MM-YYYY) ---------------- #

    @staticmethod
    def validate_date(date):
        parts = date.split("-")
        if len(parts) != 3:
            return False
        day, month, year = parts
        if not (day.isdigit() and month.isdigit() and year.isdigit()):
            return False
        if len(day) != 2 or len(month) != 2 or len(year) != 4:
            return False
        return True
