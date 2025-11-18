# Clerk Admin Role Setup Guide

**Purpose**: Configure admin roles in Clerk for accessing the Admin Dashboard at `/admin`

**Duration**: 10-15 minutes

**Prerequisites**:
- Clerk account with access to dashboard
- At least one test user account created

---

## Step 1: Create Admin Role in Clerk

### 1.1 Navigate to Roles Configuration

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application (Synaptic)
3. Click **Configure** in the left sidebar
4. Click **Roles** in the configuration menu

### 1.2 Create the Admin Role

1. Click **+ Create Role** button
2. Fill in the role details:
   - **Name**: `admin`
   - **Key**: `admin` (auto-generated)
   - **Description**: `Administrator with access to admin dashboard`

3. Click **Create Role**

### 1.3 Configure Role Permissions (Optional)

You can add specific permissions to the admin role:
- `org:sys_profile:read` - Read system profiles
- `org:sys_profile:manage` - Manage system profiles
- `org:sys_memberships:manage` - Manage user memberships

**Note**: These permissions are optional. The app uses `publicMetadata` for role checks.

---

## Step 2: Assign Admin Role to Users

You can assign the admin role using **two methods**:

### Method A: Via Clerk Dashboard (Recommended for initial setup)

1. In Clerk Dashboard, go to **Users**
2. Click on the user you want to make an admin
3. Scroll to **Public Metadata** section
4. Click **Edit**
5. Add the following JSON:

```json
{
  "role": "admin",
  "adminRole": "superadmin"
}
```

**Admin Role Types**:
- `"adminRole": "viewer"` - Can view analytics and users (read-only)
- `"adminRole": "editor"` - Can manage promo codes and view audit logs
- `"adminRole": "superadmin"` - Full admin access (recommended for you)

6. Click **Save**

### Method B: Programmatically (For bulk assignment)

**File**: `scripts/assign-admin-role.ts` (create this if needed)

```typescript
import { clerkClient } from '@clerk/nextjs/server'

async function assignAdminRole(userId: string, adminRole: 'viewer' | 'editor' | 'superadmin') {
  await clerkClient().users.updateUser(userId, {
    publicMetadata: {
      role: 'admin',
      adminRole: adminRole,
    },
  })

  console.log(`✅ Admin role assigned to user ${userId}`)
}

// Usage
assignAdminRole('user_xxx', 'superadmin')
```

---

## Step 3: Verify Admin Access

### 3.1 Update Your Local Environment

Add to `.env.local`:

```bash
# Enable admin dashboard
NEXT_PUBLIC_ENABLE_ADMIN_DASHBOARD=true

# Optional: Whitelist specific emails for extra security
ADMIN_EMAIL_WHITELIST=your-email@example.com
```

### 3.2 Test Admin Access

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Sign in** with the user you assigned admin role to

3. **Navigate to admin dashboard**:
   ```
   http://localhost:3000/admin
   ```

4. **Expected behavior**:
   - ✅ Admin users: Should see admin dashboard
   - ❌ Regular users: Should be redirected to `/dashboard`
   - ❌ Non-authenticated: Should be redirected to `/sign-in`

### 3.3 Test Different Admin Roles

**Create test users for each role**:

1. **Viewer** (read-only):
   ```json
   {
     "role": "admin",
     "adminRole": "viewer"
   }
   ```
   - Can view: System stats, user list, analytics
   - Cannot: Manage promo codes, edit users, view audit log

2. **Editor** (most admin tasks):
   ```json
   {
     "role": "admin",
     "adminRole": "editor"
   }
   ```
   - Can view: Everything viewer can + audit log
   - Can manage: Promo codes
   - Cannot: Manage other admins

3. **Superadmin** (full access):
   ```json
   {
     "role": "admin",
     "adminRole": "superadmin"
   }
   ```
   - Can do: Everything (including managing admins)

---

## Step 4: Production Setup

### 4.1 Create Admin Users in Production

**Option A: Via Clerk Dashboard (Recommended)**

1. Go to Clerk Dashboard → **Users**
2. Select your production application
3. Add `publicMetadata` to your user account:
   ```json
   {
     "role": "admin",
     "adminRole": "superadmin"
   }
   ```

**Option B: Via API (Advanced)**

Use Clerk's Backend API to programmatically assign roles:

```typescript
// app/api/admin/assign-role/route.ts
import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { userId: currentUserId } = await auth()

  // IMPORTANT: Only allow existing superadmins to assign roles
  const currentUser = await clerkClient().users.getUser(currentUserId!)
  const currentMetadata = currentUser.publicMetadata as { role?: string, adminRole?: string }

  if (currentMetadata?.adminRole !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { targetUserId, adminRole } = await req.json()

  await clerkClient().users.updateUser(targetUserId, {
    publicMetadata: {
      role: 'admin',
      adminRole: adminRole,
    },
  })

  return NextResponse.json({ success: true })
}
```

### 4.2 Set Production Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

```bash
# Production only
NEXT_PUBLIC_ENABLE_ADMIN_DASHBOARD=true

# Optional: Restrict to specific emails
ADMIN_EMAIL_WHITELIST=admin@synaptic.study,owner@synaptic.study
```

**IMPORTANT**: Only set for **Production** environment, not Preview.

### 4.3 Deploy Changes

```bash
git add .
git commit -m "feat: Phase 0 - Admin role configuration"
git push origin main
```

Vercel will automatically deploy with new environment variables.

---

## Step 5: Security Best Practices

### 5.1 Recommended Admin Role Distribution

For a team of 5 people:
- **1 Superadmin** (you, the owner)
- **1-2 Editors** (trusted team members who manage promo codes)
- **2-3 Viewers** (team members who need read-only access)

### 5.2 Admin Email Whitelist

Use `ADMIN_EMAIL_WHITELIST` for extra security:

```bash
# .env.production
ADMIN_EMAIL_WHITELIST=owner@synaptic.study,cto@synaptic.study
```

**How it works**:
1. User must have `role: "admin"` in Clerk metadata
2. User's email must be in whitelist
3. Both conditions required for admin access

**When to use**:
- ✅ Small team (<10 admins)
- ✅ High-security environments
- ❌ Large teams (hard to maintain)

### 5.3 Regular Audit

**Monthly checklist**:
- [ ] Review list of admin users
- [ ] Remove admin access for departed team members
- [ ] Check admin audit log for suspicious activity
- [ ] Verify email whitelist is up-to-date

---

## Troubleshooting

### Problem: "Access Denied" when navigating to /admin

**Possible causes**:

1. **Admin role not assigned**
   - Check Clerk Dashboard → Users → Your User → Public Metadata
   - Should contain: `{ "role": "admin", "adminRole": "superadmin" }`

2. **Feature flag disabled**
   - Check `.env.local` has: `NEXT_PUBLIC_ENABLE_ADMIN_DASHBOARD=true`
   - Restart dev server after adding

3. **Email not whitelisted**
   - If `ADMIN_EMAIL_WHITELIST` is set, your email must be in the list
   - Check `.env.local` and verify email matches exactly

4. **Browser cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or open in incognito window

### Problem: Changes to publicMetadata not reflecting

**Solutions**:
1. Sign out completely
2. Clear cookies for the domain
3. Sign back in
4. Navigate to `/admin`

**Why**: Clerk caches user metadata in the session. Signing out/in refreshes it.

### Problem: Can't assign admin role in Clerk Dashboard

**Possible causes**:
1. **Insufficient permissions**: You must be the owner of the Clerk organization
2. **Wrong application**: Make sure you're editing the correct app (Synaptic)
3. **Syntax error in JSON**: Use a JSON validator to check your metadata

---

## Next Steps

After completing Phase 0 admin setup:

1. ✅ **Verify Sentry** - Test error reporting (see [PHASE-0-VERIFICATION.md](./PHASE-0-VERIFICATION.md))
2. ✅ **Create Sentry project** - Set up monitoring dashboards
3. ✅ **Ready for Phase 1** - Implement observability stack enhancements

---

## Quick Reference

**Admin Role Metadata Format**:
```json
{
  "role": "admin",
  "adminRole": "viewer|editor|superadmin"
}
```

**Environment Variables**:
```bash
NEXT_PUBLIC_ENABLE_ADMIN_DASHBOARD=true
ADMIN_EMAIL_WHITELIST=email1@example.com,email2@example.com
```

**Admin Routes**:
- `/admin` - Dashboard home (Phase 2)
- `/admin/users` - User management (Phase 2)
- `/admin/analytics` - System analytics (Phase 2)
- `/admin/promo-codes` - Promotional codes (Phase 3)
- `/admin/audit-log` - Admin action log (Phase 2)

**Role Permissions**:
| Feature | Viewer | Editor | Superadmin |
|---------|--------|--------|------------|
| View stats | ✅ | ✅ | ✅ |
| View users | ✅ | ✅ | ✅ |
| View analytics | ✅ | ✅ | ✅ |
| Manage promo codes | ❌ | ✅ | ✅ |
| View audit log | ❌ | ✅ | ✅ |
| Manage admins | ❌ | ❌ | ✅ |

---

**Last Updated**: November 17, 2025
**Phase**: 0 - Prerequisites & Setup
**Status**: ✅ Ready for Implementation
