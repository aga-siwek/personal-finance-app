FROM python:3.11-slim

# Keep Python output unbuffered and skip .pyc files in the container.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# System deps for psycopg2-binary runtime are already bundled; only build
# essentials for any wheels that need compiling.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source.
COPY . .

EXPOSE 5000

# Run DB migrations, then start gunicorn against the WSGI entry point.
CMD ["sh", "-c", "flask db upgrade && gunicorn --bind 0.0.0.0:5000 wsgi:app"]
