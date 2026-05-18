FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/backend

WORKDIR /app

COPY backend/pyproject.toml /app/backend/pyproject.toml
COPY backend/app /app/backend/app
COPY data /app/data

RUN pip install --no-cache-dir -e /app/backend

CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
