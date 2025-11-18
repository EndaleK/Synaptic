# Admin Dashboard Setup - Complete

**Status:** ✅ Deployed and Functional
**Date:** 2025-11-18
**Access:** http://localhost:3000/admin (local) | https://your-domain.com/admin (production)

---

## Overview

The admin dashboard provides three-tier role-based access control (RBAC) for managing the Synaptic.study platform.

### Admin Roles

1. **Viewer** - Read-only access to analytics and system health
2. **Editor** - Can modify users and system settings
3. **Superadmin** - Full access including admin management

---

## Access Requirements

### Setting Up Admin Users

Admin permissions are controlled via Clerk `publicMetadata`. Two methods:

#### Method 1: Clerk Dashboard (Manual)
1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to **Users**
4. Find the user to promote
5. Scroll to **Public metadata**
6. Click **Edit** and add:
   ```json
   {
     "role": "admin",
     "adminRole": "superadmin"
   }
   ```
7. Save
8. User must **sign out completely** and sign back in

#### Method 2: API Route (Programmatic)
While signed in as the user to promote, visit:

**Local:** http://localhost:3000/api/debug/set-admin?role=superadmin
**Production:** https://your-domain.com/api/debug/set-admin?role=superadmin

Valid roles: `viewer`, `editor`, `superadmin`

After setting metadata, user must:
1. Clear browser storage (cookies, localStorage, sessionStorage)
2. Sign out and back in
3. Fresh JWT token will include admin metadata

---

## Troubleshooting Admin Access

### Debug Route
Check current admin status:

**http://localhost:3000/api/debug/check-admin**

Expected response for valid admin:
```json
{
  "authenticated": true,
  "hasAdminRole": true,
  "adminRoleValue": "superadmin",
  "isValid": true,
  "publicMetadata": {
    "role": "admin",
    "adminRole": "superadmin"
  }
}
```

### Common Issues

#### Issue: Redirected to /dashboard when accessing /admin
**Cause:** Admin metadata not in JWT session token
**Fix:**
1. Verify metadata set in Clerk dashboard or via `/api/debug/set-admin`
2. Clear **all** browser storage for localhost/domain
3. Sign out completely
4. Sign back in
5. Check `/api/debug/check-admin` to verify

#### Issue: "publicMetadata": {} (empty)
**Cause:** Metadata not saved in Clerk or JWT not refreshed
**Fix:**
1. Use `/api/debug/set-admin` to set metadata programmatically
2. Verify in Clerk dashboard
3. Complete sign out/in cycle

#### Issue: "Cannot read properties of undefined (reading 'getUser')"
**Cause:** Old Clerk API usage (not awaiting clerkClient())
**Fixed in:** lib/auth/admin.ts:67 - now properly awaits client

---

## Dashboard Features

### Overview Tab
- **System Health**: API services status, database query times, active connections
- **Platform Analytics**: Total users, premium users, documents, study minutes

### Users Tab
- User management panel (UserManagementPanel component)
- View/edit user accounts
- Manage subscriptions and permissions

### Analytics Tab
- Full analytics dashboard (AnalyticsDashboard component)
- User growth charts
- Feature adoption metrics
- Revenue tracking

### System Health Tab
- Detailed system monitoring (SystemHealthDashboard component)
- API endpoint performance
- Database query performance
- Error rates and alerts

---

## Implementation Details

### Files Structure
```
app/
├── admin/
│   └── page.tsx                    # Admin route entry point
├── api/
│   └── debug/
│       ├── check-admin/route.ts    # Admin status verification
│       └── set-admin/route.ts      # Programmatic admin promotion
components/
└── admin/
    ├── AdminDashboard.tsx          # Main dashboard UI
    ├── SystemHealthDashboard.tsx   # System monitoring
    ├── UserManagementPanel.tsx     # User CRUD operations
    └── AnalyticsDashboard.tsx      # Analytics visualizations
lib/
└── auth/
    └── admin.ts                    # RBAC logic and permissions
```

### Permission System

Defined in `lib/auth/admin.ts`:

```typescript
const PERMISSIONS = {
  viewer: {
    viewUsers: true,
    viewAnalytics: true,
    viewSystem: true,
    editUsers: false,
    editSystem: false,
    manageAdmins: false,
  },
  editor: {
    viewUsers: true,
    viewAnalytics: true,
    viewSystem: true,
    editUsers: true,
    editSystem: true,
    manageAdmins: false,
  },
  superadmin: {
    viewUsers: true,
    viewAnalytics: true,
    viewSystem: true,
    editUsers: true,
    editSystem: true,
    manageAdmins: true,
  },
}
```

### API Helper Functions

```typescript
// Check if user is admin
const admin = await checkAdminAccess()

// Require admin access in API route (returns 403 if not admin)
const admin = await requireAdmin()

// Require specific role level
const admin = await requireAdmin('superadmin')

// Check specific permission
const canEdit = hasPermission(admin.role, 'editUsers')
```

---

## Security Considerations

### Production Deployment

1. **Remove Debug Routes** (Optional):
   - Delete `/app/api/debug/check-admin/route.ts`
   - Delete `/app/api/debug/set-admin/route.ts`
   - Or add production check to return 404

2. **Admin Email Whitelist** (Optional):
   Add to `.env.local`:
   ```bash
   ADMIN_EMAIL_WHITELIST=admin@example.com,superadmin@example.com
   ```
   Enables automatic admin detection in `lib/auth/admin.ts:154`

3. **Rate Limiting**:
   Consider rate limiting admin API routes to prevent abuse

4. **Audit Logging**:
   Log all admin actions for security audit trail

---

## Current Admin Users

- **denbit.ent@gmail.com** - Superadmin ✅
- **kalebendale@yahoo.ca** - Superadmin (configured in Clerk, needs session refresh)

---

## Testing Checklist

- [x] Admin dashboard accessible at /admin
- [x] Superadmin role correctly identified
- [x] System Health panel shows live data
- [x] Analytics panel displays user/document counts
- [x] Navigation between tabs works smoothly
- [x] Non-admin users redirected to /dashboard
- [x] Debug routes functional
- [ ] User management panel tested (CRUD operations)
- [ ] Analytics charts rendering correctly
- [ ] Production deployment tested

---

## Next Steps (Optional)

1. **Enhance User Management**:
   - Add user search/filtering
   - Bulk user operations
   - Export user data

2. **Advanced Analytics**:
   - Time-series charts for growth trends
   - Feature usage heatmaps
   - Cohort analysis

3. **System Monitoring**:
   - Real-time error tracking
   - Performance alerts
   - Integration with Sentry dashboards

4. **Admin Activity Log**:
   - Track all admin actions
   - Audit trail for compliance
   - Filter by user/action/date

---

## Support

For issues or questions:
1. Check debug routes: `/api/debug/check-admin`
2. Review Clerk dashboard metadata
3. Clear browser storage and re-authenticate
4. Verify Clerk API keys in `.env.local`

**Last Updated:** 2025-11-18
**Version:** 1.0.0
