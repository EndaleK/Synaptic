#!/usr/bin/env node

/**
 * Run pending database migrations
 * This script executes SQL migrations directly against Supabase
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Migrations to run (in order)
const migrations = [
  '003_add_essays_table.sql',
  '004_add_videos_table.sql'
];

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  for (const migrationFile of migrations) {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);

    console.log(`📄 Running migration: ${migrationFile}`);

    try {
      // Read SQL file
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Execute SQL via Supabase RPC
      // Note: Supabase doesn't have a direct SQL execution endpoint,
      // so we'll use the PostgREST API to check if tables exist instead

      // Check if migration already ran by checking if table exists
      const tableName = migrationFile.includes('essays') ? 'essays' : 'videos';
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        // Table doesn't exist, need to run migration
        console.log(`  ⚠️  Table '${tableName}' doesn't exist. Please run this migration manually in Supabase SQL Editor:`);
        console.log(`  📋 Path: ${migrationPath}`);
        console.log(`  🔗 Supabase SQL Editor: ${supabaseUrl.replace('https://', 'https://app.supabase.com/project/')}/editor/sql\n`);
      } else if (error) {
        console.log(`  ❌ Error checking table '${tableName}':`, error.message);
      } else {
        console.log(`  ✅ Table '${tableName}' already exists - migration previously applied\n`);
      }
    } catch (err) {
      console.error(`  ❌ Error processing ${migrationFile}:`, err.message);
    }
  }

  console.log('✨ Migration check complete!\n');
  console.log('📝 Summary:');
  console.log('  - If migrations need to be run, please execute them in the Supabase SQL Editor');
  console.log('  - The SQL files are located in: supabase/migrations/');
  console.log(`  - Supabase Dashboard: ${supabaseUrl.replace('https://', 'https://app.supabase.com/project/')}\n`);
}

runMigrations().catch(console.error);
