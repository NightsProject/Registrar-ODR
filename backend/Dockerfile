FROM python:3.13-slim

# Install system dependencies for Postgres
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use Gunicorn for production-ready serving
RUN pip install gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "run:app"]