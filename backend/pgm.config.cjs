require("dotenv").config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DATABASE_URL } = process.env;

const encodedUser = DB_USER ? encodeURIComponent(DB_USER) : undefined;
const encodedPassword = DB_PASSWORD ? encodeURIComponent(DB_PASSWORD) : undefined;
const derivedConnectionString =
  DB_HOST && DB_PORT && encodedUser && encodedPassword && DB_NAME
    ? `postgres://${encodedUser}:${encodedPassword}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
    : undefined;

const connectionString = DATABASE_URL || derivedConnectionString;

if (!connectionString) {
  throw new Error("Missing DB connection config. Set DATABASE_URL or DB_* variables.");
}

module.exports = {
  migrationsDir: "migrations",
  databaseUrl: connectionString,
  direction: "up",
};
