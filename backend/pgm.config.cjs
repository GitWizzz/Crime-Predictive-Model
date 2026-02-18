const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DATABASE_URL } = process.env;

const connectionString = DATABASE_URL ||
  `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

module.exports = {
  migrationsDir: "migrations",
  databaseUrl: connectionString,
  direction: "up",
};