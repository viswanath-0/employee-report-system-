"""
database.py

MySQL Connection using SQLAlchemy.
Tables are auto-created on startup via Base.metadata.create_all()
"""

from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base


# -------------------- Connection URL -------------------- #

# Uses URL.create() to safely handle special characters in password
url = URL.create(
    drivername = "mysql+mysqlconnector",
    username   = "root",
    password   = "Viswanath@123",       
    host       = "localhost",
    database   = "employee_db_report"
)

engine       = create_engine(url)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base         = declarative_base()


# -------------------- DB Dependency -------------------- #

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
