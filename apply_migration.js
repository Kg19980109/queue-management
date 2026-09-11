const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Koushik@7003383676@db.pqcplkunijmbmnomvzan.supabase.co:5432/postgres';

async function applyMigration() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to db');

    const migrationPath = path.join(__dirname, 'supabase/migrations/20260912000011_phase15_reconciliation.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await client.end();
  }
}

applyMigration();
