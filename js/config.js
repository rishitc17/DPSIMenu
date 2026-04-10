/**
 * ╔══════════════════════════════════════════╗
 * ║  DPS i-Edge Menu Voting System           ║
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

    // ── XP System ───────────────────────────────────────
    // XP awarded per day voted
    XP_PER_DAY: 50,
    // XP required for each level: level N requires XP_BASE * (N^XP_EXP)
    XP_BASE: 100,
    XP_EXP: 1.6,

    // ── Star Items ───────────────────────────────────────
    MAX_STAR_ITEMS_TOTAL: 6,
    STAR_LIMIT_REGULAR: 1, // Mon–Thu
    STAR_LIMIT_FRIDAY: 2, // Friday

    // ── Cache ────────────────────────────────────────────
    CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes

    // ── School ──────────────────────────────────────────
    SCHOOL_NAME: 'DPS i-Edge',
    EMAIL_DOMAIN: 'school.edu.in',
};

// XP Helper: XP required to reach a given level
function xpForLevel(level) {
    if (level <= 1) return 0;
    return Math.floor(CONFIG.XP_BASE * Math.pow(level - 1, CONFIG.XP_EXP));
}

// XP Helper: compute level from total XP
function levelFromXP(xp) {
    let level = 1;
    while (true) {
        const nextLevelXP = xpForLevel(level + 1);
        if (xp < nextLevelXP) break;
        level++;
        if (level > 100) break;
    }
    return level;
}

// XP progress within current level (0–1)
function xpProgress(xp) {
    const level = levelFromXP(xp);
    const currentLevelXP = xpForLevel(level);
    const nextLevelXP = xpForLevel(level + 1);
    if (nextLevelXP === currentLevelXP) return 1;
    return (xp - currentLevelXP) / (nextLevelXP - currentLevelXP);
}

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
    morning_drink: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
    fruit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 2c2.5 2.5 4 6 4 10"/><path d="M22 2L12 12"/></svg>`,
    morning_snack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>`,
    main_course: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>`,
    accompaniments: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    dessert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>`,
    evening_snack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    evening_drink: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 10v12"/><path d="M5 2h14l-5 8H10L5 2z"/></svg>`,
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
