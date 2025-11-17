# ⚠️ Manual Database Migration Required

The document enhancement features require adding new columns to the `documents` table. Supabase doesn't allow us to run ALTER TABLE commands via the JavaScript client for security reasons.

## 📝 Instructions

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New query"

### Step 2: Run This SQL

Copy and paste the following SQL into the editor and click "Run":

```sql
-- Add new columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP DEFAULT NOW();
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_is_starred
  ON documents(user_id, is_starred)
  WHERE is_starred = TRUE;

CREATE INDEX IF NOT EXISTS idx_documents_is_deleted
  ON documents(user_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_documents_last_accessed
  ON documents(user_id, last_accessed_at DESC)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_documents_tags
  ON documents USING GIN(tags)
  WHERE is_deleted = FALSE;
```

### Step 3: Verify the Migration

Run this query to verify the columns were added:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'documents'
AND column_name IN ('is_starred', 'is_deleted', 'deleted_at', 'last_accessed_at', 'tags')
ORDER BY column_name;
```

You should see 5 rows returned.

### Step 4: Restart Your App

After running the migration, restart your development server:

```bash
# Kill the current server (Ctrl+C)
# Then restart it
npm run dev
```

## ✅ Features Enabled After Migration

Once the migration is complete, you'll have access to:

- ⭐ **Star/Favorite Documents**: Mark important documents
- 🕐 **Recent Documents**: Quick Access to recently viewed files
- 🗑️ **Trash**: Soft delete functionality (infrastructure ready)
- 🏷️ **Tags**: Document tagging system (infrastructure ready)
- 📊 **Last Accessed Tracking**: See when documents were last opened

## 🚨 Troubleshooting

### If you see "column already exists" errors
This is normal! The `IF NOT EXISTS` clause prevents errors if columns already exist. Just ignore these messages.

### If you see permission errors
Make sure you're using the correct Supabase project and have admin access.

### If the star feature still doesn't work
1. Check that the migration ran successfully (Step 3)
2. Clear your browser cache
3. Restart the development server
4. Try again

## 📞 Need Help?

If you encounter any issues, please check:
1. You're connected to the correct Supabase project
2. You have admin/owner permissions on the project
3. The migration SQL completed without errors

---

**Current Status**: The app will work without these columns, but the star/favorite and other enhanced features will be disabled until the migration is run.
