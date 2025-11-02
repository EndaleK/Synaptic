#!/usr/bin/env node

/**
 * Apply database migrations by executing SQL directly
 * Uses PostgreSQL connection string from Supabase
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Extract project reference from URL
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

// Migrations to run (in order)
const migrations = [
  '003_add_essays_table.sql',
  '004_add_videos_table.sql'
];

async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${projectRef}.supabase.co`,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

async function runMigrations() {
  console.log('🚀 Applying database migrations...\n');
  console.log('📋 Note: Since we cannot execute raw SQL via the REST API,');
  console.log('   please run these migrations manually in the Supabase SQL Editor:\n');

  for (const migrationFile of migrations) {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    console.log(`📄 ${migrationFile}`);
    console.log(`   Path: ${migrationPath}\n`);
  }

  console.log(`\n🔗 Supabase SQL Editor:`);
  console.log(`   https://app.supabase.com/project/${projectRef}/editor/sql\n`);

  console.log(`📝 Instructions:`);
  console.log(`   1. Open the SQL Editor link above`);
  console.log(`   2. Copy and paste the contents of each migration file`);
  console.log(`   3. Run each migration in order (003, then 004)`);
  console.log(`   4. Verify tables were created successfully\n`);

  // Let's also print the SQL content for convenience
  console.log('═'.repeat(80));
  console.log('📋 MIGRATION SQL (copy and paste into Supabase SQL Editor)');
  console.log('═'.repeat(80) + '\n');

  for (const migrationFile of migrations) {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`-- ${migrationFile}`);
    console.log('-- ' + '-'.repeat(76));
    console.log(sql);
    console.log('\n' + '═'.repeat(80) + '\n');
  }
}

runMigrations().catch(console.error);
