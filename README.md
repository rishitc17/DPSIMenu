# DPSI  · Menu Voting System

A school menu voting platform built with vanilla HTML/CSS/JS, Supabase, and hosted on GitHub Pages.

---

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