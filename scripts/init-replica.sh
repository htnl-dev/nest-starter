#!/bin/zsh

# Default environment
ENV="dev"

# Parse command line arguments
while [ $# -gt 0 ]; do
  case "$1" in
    --env)
      ENV="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Load environment variables from .env file based on environment
ENV_FILE=".env.local"
if [ -f "$ENV_FILE" ]; then
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
fi

# Get MongoDB configuration from environment
MONGO_CONTAINER="nest-starter-mongodb-$ENV"
MONGO_HOST=${MONGO_HOST:-"nest-starter-mongodb-$ENV"}
MONGO_PORT=${MONGODB_PORT:-"27017"}
DB_NAME="nest-starter-$ENV"

# Construct MongoDB connection string
MONGO_URI="mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${DB_NAME}?authSource=admin"

echo "Initializing replica set for $ENV environment..."
echo "Using connection string: ${MONGO_URI}"

# Initialize replica set
docker compose exec "$MONGO_CONTAINER" mongosh "${MONGO_URI}" --eval "
rs.initiate()"

if [ $? -eq 0 ]; then
    echo "Replica set initialized successfully in $ENV environment!"
    echo "Waiting for replica set to be ready..."
    sleep 5
    echo "Replica set status:"
    docker compose exec "$MONGO_CONTAINER" mongosh "${MONGO_URI}" --eval 'rs.status()'
else
    echo "Error initializing replica set in $ENV environment!"
    exit 1
fi 