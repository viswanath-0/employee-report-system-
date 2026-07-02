"""
main.py

Employee Report System — FastAPI + MySQL

Run  : uvicorn main:app --reload
Docs : http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from database import engine, Base
from routers import employee, manager, admin


# -------------------- Create Tables -------------------- #
# Auto-creates users and reports tables if they don't exist

Base.metadata.create_all(bind=engine)


# -------------------- FastAPI App -------------------- #

app = FastAPI(
    title       = "Employee Report System",
    description = "FastAPI + MySQL CRUD API for Employee Report Management",
    version     = "2.0.0"
)


# -------------------- Include Routers -------------------- #

app.include_router(employee.router)
app.include_router(manager.router)
app.include_router(admin.router)


# -------------------- Root -------------------- #

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Employee Report System API is running.",
        "docs":    "Visit http://127.0.0.1:8000/docs for Swagger UI"
    }
