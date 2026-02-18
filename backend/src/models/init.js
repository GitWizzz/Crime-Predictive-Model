import { pool } from "../config/db.js";

export const initDB = async () => {
    try {
        
        await pool.query("CREATE EXTENSION IF NOT EXISTS postgis;");

        
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'OFFICER', 'ANALYST')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        
        await pool.query(`
      CREATE TABLE IF NOT EXISTS firs (
        id SERIAL PRIMARY KEY,
        fir_no VARCHAR(50) UNIQUE NOT NULL,
        crime_type VARCHAR(100) NOT NULL,
        section VARCHAR(100),
        date_time TIMESTAMP WITH TIME ZONE NOT NULL,
        location GEOGRAPHY(POINT, 4326),
        police_station VARCHAR(100),
        zone VARCHAR(100),
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log("✅ Database tables initialized successfully");
    } catch (error) {
        console.error("❌ Database initialization failed", error);
        process.exit(1);
    }
};
