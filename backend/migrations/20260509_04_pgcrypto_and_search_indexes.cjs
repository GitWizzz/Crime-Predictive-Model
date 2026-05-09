/**
 * Migration: pgcrypto extension + GIN trigram indexes for FIR search
 *
 * pgcrypto is required by fir.model.js → createFIR (pgp_sym_encrypt for sensitive_notes_enc).
 * GIN indexes on text columns enable efficient ILIKE '%...%' queries via pg_trgm.
 */

exports.up = (pgm) => {
  pgm.createExtension("pgcrypto", { ifNotExists: true });

  // GIN trigram indexes for fir full-text search
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_firs_fir_no_trgm
      ON firs USING GIN (fir_no gin_trgm_ops);
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_firs_crime_type_trgm
      ON firs USING GIN (crime_type gin_trgm_ops);
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_firs_description_trgm
      ON firs USING GIN (description gin_trgm_ops);
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_firs_location_name_trgm
      ON firs USING GIN (location_name gin_trgm_ops);
  `);

  pgm.sql(`
    INSERT INTO schema_versions (version, description)
    VALUES ('2026-05-09-v4', 'pgcrypto extension + GIN trigram indexes for FIR full-text search')
    ON CONFLICT (version) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_firs_fir_no_trgm;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_firs_crime_type_trgm;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_firs_description_trgm;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_firs_location_name_trgm;`);
  pgm.dropExtension("pgcrypto", { ifExists: true });
};
