# Automated Version Management System

## Overview
This HMS application now has a complete automated version management system that tracks versions, enables rollbacks, and maintains a deployment history.

## Features Implemented

### 1. **Enhanced Version Display**
- Clickable version badge in bottom-left corner
- Shows detailed build information: version, build date, commit hash, branch, environment
- Uses design system tokens for consistent styling

### 2. **Version Management Interface** (Admin Only)
- Access via: Admin Dashboard → Version Management
- Features:
  - View current deployment details
  - Record version snapshots
  - Browse version history
  - Rollback to previous versions (with confirmation)
  - Track environment (production/development)

### 3. **Build-Time Version Injection**
- Automatic Git commit and branch detection
- Build timestamp recording
- Environment tracking
- Injected into `window.__BUILD_INFO__` for runtime access

### 4. **Database Schema**
New table: `version_history`
- Tracks all deployed versions
- Stores Git commit, branch, and environment info
- Supports changelog and active version marking
- Row-Level Security enabled

### 5. **GitHub Actions Workflow** (.github/workflows/version-bump.yml)
Automates version management:
- Auto-bumps version based on commit messages
- patch: regular commits
- minor: commits starting with "feat"
- major: commits with "BREAKING CHANGE"
- Creates Git tags
- Generates changelog
- Creates GitHub releases
- Triggers deployment

## Usage

### For Developers
**Record a Version:**
1. Login as admin
2. Navigate to Version Management
3. Click "Record Current Version"
4. System captures current Git state

**Rollback to Previous Version:**
1. Navigate to Version Management
2. Find the version in history
3. Click "Rollback" button
4. Confirm the action
5. System marks version as active (deployment trigger required)

### For CI/CD
**Automatic Version Bumping:**
```bash
# Manual trigger with specific version type
gh workflow run version-bump.yml -f version_type=minor

# Automatic on push to main
git push origin main
```

**Commit Message Conventions:**
```bash
# Patch version bump (1.0.0 → 1.0.1)
git commit -m "fix: resolve login issue"

# Minor version bump (1.0.0 → 1.1.0)
git commit -m "feat: add export functionality"

# Major version bump (1.0.0 → 2.0.0)
git commit -m "feat!: redesign authentication system"
# or
git commit -m "feat: new API

BREAKING CHANGE: API endpoints have changed"
```

## Technical Details

### Build Info Structure
```typescript
{
  version: string;        // From package.json
  timestamp: string;      // ISO date string
  commit: string;         // Full Git commit hash
  branch: string;         // Git branch name
  environment: string;    // production | development
}
```

### Version History Schema
```sql
CREATE TABLE version_history (
  id UUID PRIMARY KEY,
  version TEXT NOT NULL,
  release_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  git_commit TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  environment TEXT DEFAULT 'production',
  changelog TEXT,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Rollback Process

### How Rollback Works:
1. User selects a version from history
2. System marks old versions as inactive
3. Marks selected version as active
4. (Optional) Triggers deployment pipeline
5. Deployment system pulls code from the version's Git commit

### Important Notes:
- Rollbacks don't automatically handle database schema changes
- Ensure database compatibility before rolling back
- Always backup data before major rollbacks
- Test rollback procedures in staging first

## Integration with Lovable

### Version Display in Lovable Editor
The version badge appears in both:
- Development preview (shows "dev" version)
- Published app (shows actual version from package.json)

### Reverting in Lovable
Lovable has built-in version control:
1. Click on any edit in chat history
2. Click "Restore" to revert to that state
3. Or use Edit History tab at top of chat

## Future Enhancements

### Potential Additions:
- [ ] Automatic database migration tracking
- [ ] A/B testing support
- [ ] Feature flags integration
- [ ] Automated rollback on errors
- [ ] Version comparison tool
- [ ] Deployment notifications (Slack, email)
- [ ] Automated testing before version bump
- [ ] Canary deployments

## Security Considerations

- RLS policies protect version history
- Only authenticated users can view versions
- Only admins should access Version Management UI
- Rollback requires confirmation dialog
- Git commits are immutable for audit trail

## Troubleshooting

### Version not updating?
- Check if Git is initialized
- Verify `package.json` version
- Ensure build script runs successfully

### Can't see version history?
- Verify you're logged in as admin
- Check RLS policies in Supabase
- Ensure database connection is active

### Rollback not working?
- Verify the version exists in Git
- Check deployment pipeline configuration
- Ensure database schema compatibility

## Related Files
- `src/components/VersionDisplay.tsx` - Version badge UI
- `src/components/VersionManager.tsx` - Admin interface
- `src/hooks/useVersionInfo.tsx` - Version data hook
- `vite.config.ts` - Build-time injection
- `.github/workflows/version-bump.yml` - CI/CD automation
- `scripts/inject-build-info.js` - Build info generator