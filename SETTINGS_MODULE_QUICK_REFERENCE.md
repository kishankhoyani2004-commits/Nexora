# Client Settings Module - Quick Reference Guide

## 🚀 Quick Start

### Access the Settings Page
```
URL: http://localhost:5173/client/settings
Protected Route: Yes (client role required)
```

### Tab Navigation
- **Company** - View company profile info
- **Notifications** - Configure notification preferences
- **Privacy** - Privacy and visibility settings
- **Security** - Password, sessions, login activity
- **Connected Accounts** - Google/GitHub integration status
- **Support** - Feedback and help resources

---

## 🛠️ API Reference

### Base URL: `/api/settings` (all require authentication)

#### Get Settings
```bash
GET /api/settings
Response: { success, data: { notificationPreferences, privacySettings, connectedAccounts, twoFactorEnabled } }
```

#### Update Notifications
```bash
PATCH /api/settings/notifications
Body: { emailNotifications, pushNotifications, jobAlerts, projectUpdates, paymentUpdates, ... }
Response: { success, message, data: updatedPreferences }
```

#### Update Privacy
```bash
PATCH /api/settings/privacy
Body: { profileVisibility, showEmail, showPhone, allowMessages, allowInvitations, ... }
Response: { success, message, data: updatedSettings }
```

#### Change Password
```bash
POST /api/settings/change-password
Body: { currentPassword, newPassword }
Response: { success, message }
```

#### Get Login Activity
```bash
GET /api/settings/login-activity
Response: { success, data: [{ timestamp, ipAddress, device, status, reason }] }
```

#### Get Active Sessions
```bash
GET /api/settings/sessions
Response: { success, data: [{ sessionId, device, ipAddress, lastActive, createdAt }] }
```

#### Logout Session
```bash
POST /api/settings/sessions/logout
Body: { sessionId }
Response: { success, message }
```

#### Logout All Devices
```bash
POST /api/settings/sessions/logout-all
Response: { success, message }
```

#### Connect OAuth Account
```bash
POST /api/settings/oauth/connect
Body: { provider: "google"|"github", accountId }
Response: { success, message, data: connectedAccounts }
```

#### Disconnect OAuth Account
```bash
POST /api/settings/oauth/disconnect
Body: { provider: "google"|"github" }
Response: { success, message, data: connectedAccounts }
```

#### Schedule Account Deletion
```bash
POST /api/settings/account/schedule-deletion
Body: { password }
Response: { success, message, scheduledFor: Date }
```

#### Cancel Account Deletion
```bash
POST /api/settings/account/cancel-deletion
Response: { success, message }
```

#### Submit Feedback
```bash
POST /api/settings/feedback
Body: { type: "bug"|"feature"|"general"|"support", subject, message }
Response: { success, message, ticketId }
```

#### Get Support Tickets
```bash
GET /api/settings/tickets
Response: { success, data: [] }
```

---

## 🧠 Frontend Service Usage

### Import Service
```typescript
import { settingsService } from "@/services/settings.service";
```

### Get Settings
```typescript
const { data } = useQuery({
  queryKey: ["settings"],
  queryFn: () => settingsService.getSettings(),
});
```

### Update Notifications
```typescript
const mutation = useMutation({
  mutationFn: (prefs) => settingsService.updateNotifications(prefs),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] })
});

mutation.mutate({
  emailNotifications: true,
  pushNotifications: false,
  jobAlerts: true
});
```

### Change Password
```typescript
const mutation = useMutation({
  mutationFn: (current, newPass) => 
    settingsService.changePassword(current, newPass)
});

mutation.mutate("oldPassword", "newPassword");
```

### Logout All Devices
```typescript
const mutation = useMutation({
  mutationFn: () => settingsService.logoutAllDevices()
});

mutation.mutate();
```

---

## 📊 Database Fields Reference

### Notification Preferences
```javascript
{
  emailNotifications: boolean,
  pushNotifications: boolean,
  emailDigest: "daily" | "weekly" | "monthly" | "never",
  jobAlerts: boolean,
  proposalUpdates: boolean,
  projectUpdates: boolean,
  paymentUpdates: boolean,
  messageNotifications: boolean,
  reviewNotifications: boolean
}
```

### Privacy Settings
```javascript
{
  profileVisibility: "public" | "private" | "connections",
  showEmail: boolean,
  showPhone: boolean,
  allowMessages: boolean,
  allowInvitations: boolean,
  showActivityStatus: boolean
}
```

### Session Object
```javascript
{
  sessionId: "unique-session-id",
  device: "Chrome on Windows",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  lastActive: Date,
  createdAt: Date
}
```

### Login History Entry
```javascript
{
  timestamp: Date,
  ipAddress: "192.168.1.1",
  device: "Chrome on Windows",
  status: "success" | "failed",
  reason: ""
}
```

---

## 🔒 Security Implementation

### Password Change
- ✅ Requires current password verification
- ✅ Minimum 6 characters for new password
- ✅ Password hashed with bcrypt (10 rounds)
- ✅ No password returned in API responses

### Session Management
- ✅ Unique session IDs (UUID v4)
- ✅ Device and IP tracking
- ✅ Last active timestamp
- ✅ Bulk logout capability

### Login Tracking
- ✅ Success/failed status recording
- ✅ IP address logging
- ✅ Device identification
- ✅ Timestamp per login attempt
- ✅ Last 100 entries kept (auto-prune oldest)

### Account Deletion
- ✅ 30-day grace period (reversible)
- ✅ Password confirmation required
- ✅ Scheduled deletion timestamp stored
- ✅ Cancel anytime before expiry

---

## 🎯 Common Tasks

### Task: Update User Notification Preferences
```typescript
const { mutate } = useMutation({
  mutationFn: settingsService.updateNotifications,
  onSuccess: () => {
    notify("Preferences saved!", "success");
    queryClient.invalidateQueries({ queryKey: ["settings"] });
  }
});

mutate({
  emailNotifications: true,
  jobAlerts: true,
  projectUpdates: false
});
```

### Task: Display Login Activity
```typescript
const { data: activityData } = useQuery({
  queryKey: ["loginActivity"],
  queryFn: settingsService.getLoginActivity,
  enabled: tab === "Security"
});

const loginActivity = activityData?.data || [];
```

### Task: Handle Password Change
```typescript
const { mutate, isPending } = useMutation({
  mutationFn: () => 
    settingsService.changePassword(currentPassword, newPassword),
  onSuccess: () => {
    // Clear form
    setCurrentPassword("");
    setNewPassword("");
    notify("Password changed!", "success");
  },
  onError: (err) => {
    notify(err.response?.data?.message, "error");
  }
});

// Validate before submit
if (newPassword !== confirmPassword) {
  notify("Passwords don't match", "error");
  return;
}

mutate();
```

---

## 🐛 Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Token expired | User needs to re-login |
| 400 Invalid password | Wrong current password | Check password field |
| 400 Weak password | Less than 6 chars | Increase password length |
| 404 User not found | User doesn't exist | Verify user ID in token |
| 500 Server error | Database error | Check backend logs |

### Error Response Format
```javascript
{
  success: false,
  message: "User-friendly error message"
}
```

---

## 🧪 Testing Commands

### Test Password Change
```bash
curl -X POST http://localhost:5000/api/settings/change-password \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "old", "newPassword": "new123"}'
```

### Test Get Settings
```bash
curl -X GET http://localhost:5000/api/settings \
  -H "Authorization: Bearer TOKEN"
```

### Test Update Notifications
```bash
curl -X PATCH http://localhost:5000/api/settings/notifications \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emailNotifications": false, "jobAlerts": true}'
```

---

## 📋 Checklist for Integration

- [ ] Import settingsService in your component
- [ ] Add useQuery for getSettings
- [ ] Add useMutation for update operations
- [ ] Handle loading states (isPending)
- [ ] Handle errors (onError callbacks)
- [ ] Invalidate cache after mutations
- [ ] Show user notifications (notify)
- [ ] Validate form inputs before submit
- [ ] Test API responses in browser DevTools
- [ ] Test with real authentication token

---

## 🔧 Troubleshooting

### Settings Not Loading
1. Check browser console for errors
2. Verify auth token is in localStorage
3. Check API response in Network tab
4. Ensure backend is running on :5000

### Changes Not Persisting
1. Check Network tab for failed requests
2. Look for 401 (auth) errors
3. Verify user has correct role
4. Check database connection

### Password Change Fails
1. Verify current password is correct
2. Ensure new password is 6+ characters
3. Check that passwords match (if confirm field exists)
4. Look for "Password is incorrect" error

### Session Data Not Showing
1. Wait for query to load (check isLoading)
2. Verify tab is "Security"
3. Check if sessions array is empty (no active sessions)
4. Try logout/login to create new session

---

## 📞 Support

For issues:
1. Check error message in UI
2. Review browser console
3. Check Network tab in DevTools
4. Review this quick reference
5. Check backend logs

---

**Last Updated**: 2026-07-24  
**Status**: Production Ready ✅
