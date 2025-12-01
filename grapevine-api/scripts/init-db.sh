#!/bin/bash

# Database initialization script for grapevine
# This script creates the database schema from schema.sql

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root (parent of scripts directory)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root directory
cd "$PROJECT_ROOT"

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Warning: .env file not found. Using default values from .env.example"
    if [ -f .env.example ]; then
        export $(cat .env.example | grep -v '^#' | xargs)
    fi
fi

# Default values if not set in environment
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}
DB_NAME=${DATABASE_NAME:-grapevine}
DB_USER=${DATABASE_USER:-grapevine_user}
DB_PASSWORD=${DATABASE_PASSWORD:-grapevine_password}

echo "=========================================="
echo "Database Initialization Script"
echo "=========================================="
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "=========================================="

# Check if PostgreSQL container is running
if ! docker ps | grep -q grapevine-postgres; then
    echo "Error: PostgreSQL container 'grapevine-postgres' is not running."
    echo "Please start it with: docker compose up -d"
    exit 1
fi

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0

until docker exec grapevine-postgres pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo "Error: PostgreSQL did not become ready in time"
        exit 1
    fi
    echo "Waiting for database... (attempt $attempt/$max_attempts)"
    sleep 1
done

echo "PostgreSQL is ready!"

# Check if schema.sql exists
SCHEMA_FILE="$PROJECT_ROOT/schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "Error: schema.sql file not found at $SCHEMA_FILE"
    exit 1
fi

# Create the database schema
echo "Applying schema.sql to database..."
echo "Schema file location: $SCHEMA_FILE"
docker exec -i grapevine-postgres psql -U "$DB_USER" -d "$DB_NAME" < "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
    echo "=========================================="
    echo "Database schema created successfully!"
    echo "=========================================="

    # Display created tables
    echo ""
    echo "Tables created:"
    docker exec grapevine-postgres psql -U "$DB_USER" -d "$DB_NAME" -c "\dt"

    echo ""
    echo "Views created:"
    docker exec grapevine-postgres psql -U "$DB_USER" -d "$DB_NAME" -c "\dv"
else
    echo "Error: Failed to apply schema"
    exit 1
fi
