#!/bin/sh
# entrypoint.sh

set -e

echo "▶️  Applying database migrations..."
npx prisma migrate deploy

echo "🚀 Starting application..."
exec "$@"
