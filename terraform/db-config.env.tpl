# db-config.env.tpl
# Save this file as db-config.env.tpl in your terraform directory

export DB_NAME="${db_name}"
export DB_USER="${db_user}"
export DB_PASSWORD="${db_password}"
export DB_HOST="localhost"
export DB_PORT="5432"

# PostgreSQL connection URL for applications
export DATABASE_URL="postgresql://${db_user}:${db_password}@localhost:5432/${db_name}"

# Judge0 configuration
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export JUDGE0_API_URL="http://localhost:2358"

echo "Database configuration loaded:"
echo "- Database: ${db_name}"
echo "- User: ${db_user}"
echo "- Host: localhost:5432"