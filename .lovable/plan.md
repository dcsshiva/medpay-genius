
## Update Supabase URL to Custom Domain

Your custom domain `api.westmedhospital.com` is active. The app currently uses the default URL `https://chbntbekbgetbyyxapqh.supabase.co`. We need to update it in two places.

### Changes

**1. `.env` file**
- Change `VITE_SUPABASE_URL` from `https://chbntbekbgetbyyxapqh.supabase.co` to `https://api.westmedhospital.com`

**2. `src/integrations/supabase/client.ts`**
- Change `SUPABASE_URL` from `https://chbntbekbgetbyyxapqh.supabase.co` to `https://api.westmedhospital.com`

### What stays the same
- The **anon key** (`SUPABASE_PUBLISHABLE_KEY`) remains unchanged -- it's tied to your project, not the domain
- The **project ID** remains unchanged
- All Edge Functions will automatically work through the custom domain
- All existing sessions will need to re-authenticate (since the storage keys include the domain)

### After the update
- All API calls (auth, database, edge functions) will go through `api.westmedhospital.com`
- You should test login end-to-end after this change to confirm everything works

### Technical Details
Only 2 files modified, 1 line each -- minimal risk change.
