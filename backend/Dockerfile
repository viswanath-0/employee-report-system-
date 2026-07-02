FROM python:3.12-slim

WORKDIR /app

# System deps (mysqlclient/connector build not needed for mysql-connector-python)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p uploads

EXPOSE 8000

# Railway/Render inject $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
