# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
# These are required for WeasyPrint, PostgreSQL, and PDF processing
# Install system dependencies
# These are required for WeasyPrint, PostgreSQL, and PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-xlib-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libxml2-dev \
    libxslt1-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container at /app
COPY requirements-full.txt .

# Install any needed packages specified in requirements-full.txt
RUN pip install --no-cache-dir -r requirements-full.txt

# Copy the rest of the application code into the container at /app
COPY . .

# Expose the port the app runs on
# Cloud Run uses the PORT environment variable, usually 8080
EXPOSE 8080

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8080

# Command to run the application
# Use the PORT environment variable provided by Cloud Run, falling back to 8080
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT}
