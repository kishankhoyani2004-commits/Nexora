# Settings Module - Database Migration Guide

## 📦 MongoDB Schema Changes

### User Model Updates

The User model in `/backend/models/User.js` has been updated with new fields for settings management. Since MongoDB is schema-less, new documents will automatically include these fields with their default values.

---

## 🆕 New Fields Added to User Document

### 1. Notification Preferences
```javascript
notificationPreferences: {
  emailNotifications: { type: Boolean, default: true },
  pushNotifications: { type: Boolean, default: false },
  emailDigest: { type: String, enum: ["daily", "weekly", "monthly", "never"], default: "weekly" },
  jobAlerts: { type: Boolean, default: true },
  proposalUpdates: { type: Boolean, default: true },
  projectUpdates: { type: Boolean, default: true },
  paymentUpdates: { type: Boolean, default: true },
  messageNotifications: { type: Boolean, default: true },
  reviewNotifications: { type: Boolean, default: true },
}
```

**Total Fields**: 9  
**Default State**: Email notifications enabled, weekly digest, all alerts enabled  
**Backward Compatibility**: ✅ Existing users will have default values

### 2. Privacy Settings
```javascript
privacySettings: {
  profileVisibility: { type: String, enum: ["public", "private", "connections"], default: "public" },
  showEmail: { type: Boolean, default: false },
  showPhone: { type: Boolean, default: false },
  allowMessages: { type: Boolean, default: true },
  allowInvitations: { type: Boolean, default: true },
  showActivityStatus: { type: Boolean, default: true },
}
```

**Total Fields**: 6  
**Default State**: Public profile, hidden contact info, messages/invitations enabled  
**Backward Compatibility**: ✅ Sensible defaults for privacy

### 3. Sessions Array
```javascript
sessions: [
  {
    sessionId: { type: String, required: true, unique: true },
    device: { type: String, default: "Unknown" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    lastActive: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
]
```

**Total Fields per Session**: 6  
**Default**: Empty array (no sessions initially)  
**Unique Index**: On sessionId per session  
**Backward Compatibility**: ✅ Empty array for existing users

### 4. Login History Array
```javascript
loginHistory: [
  {
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String, default: "" },
    device: { type: String, default: "Unknown" },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    reason: { type: String, default: "" },
  },
]
```

**Total Fields per Entry**: 5  
**Default**: Empty array (no history initially)  
**Auto-Pruning**: Keep last 100 entries (implement in controller if needed)  
**Backward Compatibility**: ✅ Empty array for existing users

### 5. Two-Factor Authentication Fields
```javascript
twoFactorEnabled: {
  type: Boolean,
  default: false,
},
twoFactorSecret: {
  type: String,
  default: null,
},
```

**Total Fields**: 2  
**Default State**: Disabled (ready for future 2FA implementation)  
**Backward Compatibility**: ✅ Disabled by default

### 6. Connected Accounts
```javascript
connectedAccounts: {
  google: { type: String, default: null },
  github: { type: String, default: null },
}
```

**Total Fields**: 2  
**Default State**: No accounts connected  
**Backward Compatibility**: ✅ Null by default

### 7. Account Deletion Scheduling
```javascript
accountDeletionScheduled: {
  scheduled: { type: Boolean, default: false },
  scheduledFor: { type: Date, default: null },
}
```

**Total Fields**: 2  
**Default State**: Not scheduled for deletion  
**Backward Compatibility**: ✅ Disabled by default

---

## 📊 Total Changes Summary

**New Fields Added to User Model**: 25 total across 7 new field groups

| Field Group | Field Count | Type | Default State |
|-------------|------------|------|----------------|
| Notification Preferences | 9 | Nested Object | All enabled |
| Privacy Settings | 6 | Nested Object | Public, privacy-enabled |
| Sessions | Variable | Array | Empty |
| Login History | Variable | Array | Empty |
| 2FA Settings | 2 | Primitives | Disabled |
| Connected Accounts | 2 | Nested Object | None |
| Account Deletion | 2 | Nested Object | Not scheduled |
| **TOTAL** | **25** | **Mixed** | **Safe defaults** |

---

## 🚀 Migration Approach

### No Explicit Migration Required ✅

MongoDB's flexible schema means:
1. **New User Documents**: Automatically include all new fields with defaults
2. **Existing User Documents**: Fields added on-demand when first accessed/updated
3. **Zero Downtime**: No migration scripts needed
4. **Backward Compatible**: Existing queries continue working

### Optional: Data Initialization Script

To proactively add fields to all existing users (recommended for production):

```javascript
// script/migrate-settings.js
import mongoose from 'mongoose';
import User from '../backend/models/User.js';

async function migrateSettings() {
  try {
    const result = await User.updateMany(
      {},
      {
        $setOnInsert: {
          notificationPreferences: {
            emailNotifications: true,
            pushNotifications: false,
            emailDigest: "weekly",
            jobAlerts: true,
            proposalUpdates: true,
            projectUpdates: true,
            paymentUpdates: true,
            messageNotifications: true,
            reviewNotifications: true,
          },
          privacySettings: {
            profileVisibility: "public",
            showEmail: false,
            showPhone: false,
            allowMessages: true,
            allowInvitations: true,
            showActivityStatus: true,
          },
          sessions: [],
          loginHistory: [],
          twoFactorEnabled: false,
          twoFactorSecret: null,
          connectedAccounts: {
            google: null,
            github: null,
          },
          accountDeletionScheduled: {
            scheduled: false,
            scheduledFor: null,
          },
        },
      },
      { upsert: false, multi: true }
    );

    console.log(`✅ Migration complete. Updated: ${result.modifiedCount} users`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexora')
  .then(() => migrateSettings())
  .catch(error => {
    console.error('DB connection error:', error);
    process.exit(1);
  });
```

**Run migration**:
```bash
node script/migrate-settings.js
```

---

## 🔄 Rollback Strategy

If needed to rollback these changes:

```javascript
// Remove the new fields from User model
db.users.updateMany(
  {},
  {
    $unset: {
      notificationPreferences: "",
      privacySettings: "",
      sessions: "",
      loginHistory: "",
      twoFactorEnabled: "",
      twoFactorSecret: "",
      connectedAccounts: "",
      accountDeletionScheduled: "",
    },
  }
);
```

**Note**: This would require reverting the code changes as well.

---

## 📈 Indexing Recommendations

For optimal query performance, consider adding these indices:

```javascript
// In User model schema or migration
userSchema.index({ "sessions.sessionId": 1 }, { sparse: true });
userSchema.index({ "loginHistory.timestamp": -1 }, { sparse: true });
userSchema.index({ "accountDeletionScheduled.scheduledFor": 1 }, { sparse: true });
```

**Justification**:
- Session lookups by ID (frequent)
- Login history sorting by date (frequent)
- Scheduled deletion cleanup job (periodic)

---

## 🧪 Verification Steps

After deployment, verify the migration:

### 1. Check New User Creation
```bash
# Create a new user and verify all fields are present
# Check MongoDB:
db.users.findOne({ email: "test@example.com" }, {
  notificationPreferences: 1,
  privacySettings: 1,
  sessions: 1,
  loginHistory: 1,
  twoFactorEnabled: 1,
  connectedAccounts: 1,
  accountDeletionScheduled: 1
})
```

### 2. Check Existing User Updates
```bash
# Update a setting and verify it persists
curl -X PATCH http://localhost:5000/api/settings/notifications \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emailNotifications": false}'

# Verify in MongoDB:
db.users.findOne({ _id: ObjectId("...") }).notificationPreferences
```

### 3. Check Default Values
```bash
# For any user without these fields
db.users.findOne({ 
  notificationPreferences: { $exists: false }
})
# Should return null (no users match after update)
```

---

## 📊 Database Stats

### Collection Size Impact

Approximate size increase per user document:

```
New fields total: ~500 bytes per user
Arrays (sessions, loginHistory): Variable
- Empty: 50 bytes
- With data: ~100-200 bytes each

Estimated total per user: 700-900 bytes
For 1,000 users: ~0.7-0.9 MB
For 100,000 users: ~70-90 MB
```

**Impact Assessment**: ✅ Negligible for most deployments

---

## 🔐 Security Considerations

### Data Protection
1. **Passwords**: Still handled separately, never stored in settings
2. **Session IDs**: Unique per session, not sensitive
3. **IP Addresses**: Logged for security audit trail
4. **Devices**: User-agent strings logged (non-sensitive)

### Access Control
1. All settings API endpoints require authentication
2. Users can only access their own settings
3. No cross-user data exposure possible
4. Server-side validation on all updates

### Data Retention
1. Login history: Keep last 100 entries per user
2. Sessions: Cleared on logout
3. Scheduled deletion: 30-day grace period, reversible

---

## 🚨 Potential Issues & Mitigations

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| Large sessions array | Performance | Implement max 10 sessions per user |
| Old login entries | Storage bloat | Auto-prune to 100 newest entries |
| Orphaned sessions | Security | Implement session timeout (7 days) |
| Migration downtime | User experience | No downtime - schema-less MongoDB |
| Data inconsistency | Reliability | Use transactions for atomic updates |

---

## 📋 Pre-Deployment Checklist

- [ ] Backup MongoDB database
- [ ] Update User model schema in code
- [ ] Deploy updated backend (app.js with routes)
- [ ] Run optional migration script (recommended)
- [ ] Test settings API endpoints
- [ ] Verify existing users still work
- [ ] Monitor database size and performance
- [ ] Update API documentation
- [ ] Deploy frontend (settings page)
- [ ] Test end-to-end flow

---

## 📚 Related Documentation

- Main Settings Module: `CLIENT_SETTINGS_MODULE_SUMMARY.md`
- Quick Reference: `SETTINGS_MODULE_QUICK_REFERENCE.md`
- API Routes: `/backend/routes/settingsRoutes.js`
- Controller: `/backend/controllers/settingsController.js`
- Frontend Component: `/src/pages/client/ClientSettings.tsx`

---

## ✅ Deployment Status

**Schema Migration**: ✅ Automatic (MongoDB flexible schema)  
**Data Migration**: ✅ Optional (recommended for production)  
**Backward Compatibility**: ✅ Full  
**Downtime Required**: ✅ None  
**Rollback Capability**: ✅ Available  
**Testing Required**: ✅ Recommended

---

**Last Updated**: 2026-07-24  
**MongoDB Version**: 4.0+  
**Mongoose Version**: 6.0+  
**Status**: Ready for Production ✅
