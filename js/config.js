/**
 * ╔══════════════════════════════════════════╗
 * ║  DPSI Menu Voting System           ║
 * ║  Configuration File                      ║
 * ╠══════════════════════════════════════════╣
 * ║  IMPORTANT: Replace the values below     ║
 * ║  with your actual Supabase project info. ║
 * ║                                          ║
 * ║  Find these in your Supabase dashboard:  ║
 * ║  Settings → API → Project URL & Keys     ║
 * ╚══════════════════════════════════════════╝
 */

const CONFIG = {
    // ── Supabase ────────────────────────────────────────
    SUPABASE_URL: 'https://dynqmukcyvqskswnwiha.supabase.co', // ← REPLACE THIS
    SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bnFtdWtjeXZxc2tzd253aWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDA0OTYsImV4cCI6MjA5MTM3NjQ5Nn0.KTXxV9tlRAGTBvHGc5YWl3CYI12M1vyiG4I67yblIc8', // ← REPLACE THIS

    // ── Admin ────────────────────────────────────────────
    ADMIN_EMAIL: 'admin@dpsiedge.edu.in',
    ADMIN_PASSWORD: 'dpsimenu!admin',

    // ── Star Items ───────────────────────────────────────
    MAX_STAR_ITEMS_TOTAL: 6,
    STAR_LIMIT_REGULAR: 1, // Mon–Thu
    STAR_LIMIT_FRIDAY: 2, // Friday

    // ── Cache ────────────────────────────────────────────
    CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes

    // ── School ──────────────────────────────────────────
    SCHOOL_NAME: 'DPSI',
    EMAIL_DOMAIN: 'dpsiedge.edu.in',
};

// Parse name from email: firstname.lastnameIDNo@domain
function parseNameFromEmail(email) {
    try {
        const local = email.split('@')[0]; // e.g. john.doe23
        const dotIdx = local.indexOf('.');
        if (dotIdx === -1) return { first: local, last: '' };
        const first = local.substring(0, dotIdx);
        // Remove trailing digits from last name
        const lastRaw = local.substring(dotIdx + 1);
        const last = lastRaw.replace(/\d+$/, '');
        const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        return { first: capitalise(first), last: capitalise(last) };
    } catch {
        return { first: 'Student', last: '' };
    }
}

// Category display helpers
const CATEGORY_LABELS = {
    morning_drink: 'Morning Drink',
    fruit: 'Fruit',
    morning_snack: 'Morning Snack',
    main_course: 'Main Course',
    accompaniments: 'Accompaniments',
    dessert: 'Dessert',
    evening_snack: 'Evening Snack',
    evening_drink: 'Evening Drink',
};

const CATEGORY_ICONS = {
    morning_drink: `<i class="fa-solid fa-mug-saucer"></i>`,
    fruit: `<i class="fa-solid fa-apple-whole"></i>`,
    morning_snack: `<i class="fa-solid fa-bread-slice"></i>`,
    main_course: `<i class="fa-solid fa-burger"></i>`,
    accompaniments: `<i class="fa-solid fa-bowl-food"></i>`,
    dessert: `<i class="fa-solid fa-cake-candles"></i>`,
    evening_snack: `<i class="fa-solid fa-cookie-bite"></i>`,
    evening_drink: `<i class="fa-solid fa-cocktail"></i>`,
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
};

// Rules: no dessert on Monday, no evening snack on Friday
const DAY_CATEGORY_EXCLUSIONS = {
    monday: ['dessert'],
    friday: ['evening_snack'],
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);
