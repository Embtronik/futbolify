#!/bin/sh
set -e

echo "Starting Notificacion-Service container..."

# Apply SQL fix if file and DB credentials are available
if [ -f "/app/fix_template.sql" ]; then
  if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ] && [ -n "$DB_NAME" ] && [ -n "$DB_USERNAME" ] && [ -n "$DB_PASSWORD" ]; then
    echo "Applying fix_template.sql to $DB_HOST:$DB_PORT/$DB_NAME..."
    # -v ON_ERROR_STOP=1 ensures the script stops on SQL errors
    PGPASSWORD="$DB_PASSWORD" psql \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USERNAME" \
      -d "$DB_NAME" \
      -v ON_ERROR_STOP=1 \
      -f "/app/fix_template.sql" \
      && echo "fix_template.sql applied successfully" \
      || echo "Warning: fix_template.sql execution failed; service will still start"
  else
    echo "Skipping fix_template.sql: required DB env vars not set (DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD)"
  fi
else
  echo "No fix_template.sql found; skipping database fix"
fi

# Start the application
exec java -jar app.jar
