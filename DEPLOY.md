# DMS - Document Management System — Deployment Guide

## Prerequisites
- A GitHub account
- A Vercel account (free tier: vercel.com)
- Supabase project already set up with the migration SQL executed

---

## Step 1: Push code to GitHub

1. Create a **private** repository on GitHub (e.g. `dms`)
2. On your local machine, unzip the project and run:

```bash
cd dms
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dms.git
git push -u origin main
```

---

## Step 2: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** → select your `dms` repo
3. In the **Environment Variables** section, add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fqjojtfxcvyijmypsuwv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_S8df7IQSSHIT93vphjZK7w_M0gMBTXz` |

4. Click **Deploy**
5. Wait for build to complete (~1-2 minutes)
6. Your app will be live at `https://dms-xxxxx.vercel.app`

---

## Step 3: Configure Supabase Auth

### 3.1 Set Redirect URL
1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel URL: `https://dms-xxxxx.vercel.app`
3. Add to **Redirect URLs**: `https://dms-xxxxx.vercel.app/**`

### 3.2 Disable email confirmation (for internal use)
Since this is an internal tool, you likely want users to login immediately without confirming email:
1. Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. Toggle OFF **"Confirm email"**
3. Save

---

## Step 4: Create your Admin account

1. Open your deployed app URL
2. Click **Sign Up**
3. Register with your `@unominda.com` email
4. Go to Supabase Dashboard → **SQL Editor** → run:

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your.email@unominda.com';
```

5. Refresh the app — you should now see the Admin sidebar items

---

## Step 5: Create Editor accounts

1. Have your 2 team members sign up on the app
2. In Supabase SQL Editor, run:

```sql
UPDATE public.profiles 
SET role = 'editor' 
WHERE email IN ('editor1@unominda.com', 'editor2@unominda.com');
```

Or do it from the app: **Manage Users** → change their role dropdown to "Editor".

---

## Step 6: Invite Viewers

All other `@unominda.com` users can sign up on the app. They will automatically get the **viewer** role (can view and download, nothing else).

---

## Optional: Custom Domain

If you want `dms.unominda.com` instead of the Vercel URL:
1. Vercel Dashboard → your project → **Settings** → **Domains**
2. Add `dms.unominda.com`
3. Vercel will give you DNS records (CNAME) to add in your domain registrar
4. Update the **Site URL** in Supabase Auth to match

---

## Usage Summary

| Action | How |
|--------|-----|
| Upload document | Click **Upload** button (Editor/Admin only) |
| Search | Use the search bar — select Part Number / Title / Project |
| Filter | Use Category and Status dropdowns |
| View properties | Double-click any row, or right-click → Properties |
| Download | Right-click → Download |
| Verify document | Right-click → Verify (status: Processing → Verification) |
| Release document | Right-click → Release (different person from verifier, 4-eyes rule) |
| Upload revision | Right-click → Upload Revision (only on Released documents) |
| View revision history | Right-click → View History |
| Manage users | Sidebar → Manage Users (Admin only) |
| Manage categories | Sidebar → Categories & Groups (Admin only) |
| View audit log | Sidebar → Audit Log (Admin only) |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid login credentials" | Check email/password. Make sure email confirmation is disabled in Supabase |
| Can't see admin menu | Run the SQL UPDATE to set your role to 'admin' |
| File upload fails | Check Supabase Storage bucket 'documents' exists and RLS policies are applied |
| 4-eyes error on release | A different user must release than the one who verified |
| Blank page after login | Check browser console for errors. Verify environment variables in Vercel |

---

## Monthly Cost

| Service | Cost |
|---------|------|
| Supabase Pro | $25/month (100GB storage, daily backups) |
| Vercel Free | $0 |
| **Total** | **$25/month** |

Note: You can start with Supabase Free tier ($0) which gives 1GB storage. 
At ~500 docs/year averaging 5MB each = 2.5GB/year, you'll need Pro after ~5-6 months.
