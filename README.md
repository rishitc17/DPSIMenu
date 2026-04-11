# DPSI  · Menu Voting System

A school menu voting platform built with vanilla HTML/CSS/JS, Supabase, and hosted on GitHub Pages.

---

## 🚀 Setup Guide

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the Supabase dashboard, navigate to **SQL Editor**.
3. Paste the entire contents of `schema.sql` and click **Run**.

### Step 2: Get Your Supabase Credentials

In your Supabase project:
- Go to **Settings → API**
- Copy the **Project URL** (looks like `https://xxxx.supabase.co`)
- Copy the **anon / public** key

### Step 3: Configure the App

Open `js/config.js` and replace the two placeholder values:

```js
SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',   // ← Your Project URL
SUPABASE_ANON_KEY: 'YOUR_ANON_PUBLIC_KEY',             // ← Your anon key
```

### Step 4: Add the School Logo

- Place your school logo file at `assets/logo.png`
- If no logo is added, the text fallback `DPS i·Edge` will appear automatically

### Step 5: Load Student Accounts

For each student, generate a SHA-256 hash of their temporary password (`firstnameDDMM`) and insert into the `users` table.

**Generate hash (browser console):**
```js
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
sha256('john0115').then(console.log);
```

**Insert student (in Supabase SQL Editor):**
```sql
INSERT INTO users (email, password_hash, password_changed) VALUES
  ('john.doe23@school.edu.in', '<hash>', FALSE);
```

> `password_changed = FALSE` forces them through the first-login flow to set a new password.

### Step 6: Fix Admin Password Hash

In `schema.sql`, the admin account seed has a placeholder hash. Generate the real one:
```js
sha256('dpsimenu!admin').then(console.log);
```
Then run this SQL to update it:
```sql
UPDATE users SET password_hash = '<real_hash>' WHERE email = 'admin@dpsiedge.edu.in';
```

### Step 7: Deploy to GitHub Pages

1. Create a GitHub repository
2. Push all project files to the `main` branch
3. Go to **Settings → Pages** → Source: `main` branch, `/ (root)` folder
4. Your site will be live at `https://yourusername.github.io/repo-name/`

---

## 📋 Project Structure

```
dps-menu/
├── index.html          # Login page
├── vote.html           # Student voting page
├── admin.html          # Admin dashboard
├── schema.sql          # Supabase database schema
├── assets/
│   └── logo.png        # School logo (add your own)
├── css/
│   ├── main.css        # Global styles + glassmorphism
│   ├── auth.css   
     # Login page styles
│   ├── vote.css        # Voting page styles
│   └── admin.css       # Admin dashboard styles
└── js/
    ├── config.js       # ← ADD SUPABASE CREDENTIALS HERE
    ├── supabase.js     # Supabase REST client
    ├── crypto.js       # SHA-256 password hashing
    ├── cache.js        # Client-side caching (reduces DB reads)
    ├── auth.js         # Authentication logic
    ├── vote.js         # Student voting logic
    └── admin.js        # Admin dashboard logic
```

---

## 🎓 User Flows

### Student (First Login)
1. Opens site → sees login page
2. Enters email → system detects `password_changed = false`
3. Prompted to enter temporary password (`firstnameDDMM`) + set new password
4. Redirected to voting page

### Student (Returning)
1. Opens site → enters email
2. System detects `password_changed = true`
3. Enters their custom password → logs in
4. Votes for Mon–Fri menu items

### Admin
1. Enters `admin@dpsiedge.edu.in`
2. Prompted for admin password (`dpsimenu!admin`)
3. Lands on admin dashboard with 3 tabs:
   - **Menu Items**: Add/edit/delete food items
   - **Results**: See voting stats and winning items per day
   - **Settings**: Control voting open/close, set week dates, disable days, pin fixed items

---

## ⭐ Star Items

- Max 6 star items in the entire database
- Students can pick **1 star item per day** (Mon–Thu)
- **2 star items on Friday**
- The system enforces this automatically

---

## 🔒 Business Rules

| Rule | Detail |
|------|--------|
| No dessert on Monday | Enforced automatically |
| No evening snack on Friday | Enforced automatically |
| No same item on 2 days | Conflict resolution: picks 2nd-highest voted item |
| Max 6 star items | Enforced in admin UI |
| Voting closed state | Admin toggle, shows banner to students |
| Fixed items | Admin pins item for a day/category, overrides votes |
| Disabled days | Admin hides days school is closed |

---

## 🗃️ Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Student + admin accounts with hashed passwords |
| `items` | All menu items (name, category, allergens, star flag) |
| `votes` | One row per student/day/category vote |
| `settings` | App-wide settings (voting open, week dates, disabled days) |
| `fixed_items` | Admin-pinned items for specific day/category combos |

---

## 🚨 Important Security Notes

- Passwords are **SHA-256 hashed** client-side before storage
- The Supabase **anon key** is public (intentional for GitHub Pages)
- RLS policies allow anon access — app-level auth prevents misuse
- For higher security, consider a Supabase Edge Function to handle auth
- **Never expose** the Supabase `service_role` key in frontend code
