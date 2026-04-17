/**
 * Vote page — student voting interface
 */

(function () {
    // ── Session guard ────────────────────────────────────
    let session;
    try {
        session = JSON.parse(sessionStorage.getItem('dps_user'));
    } catch {}
    if (!session || session.is_admin) {
        window.location.href = 'index.html';
        return;
    }
    if (session.is_admin) {
        window.location.href = 'admin.html';
        return;
    }

    // ── State ────────────────────────────────────────────
    let items = []; // All menu items from DB
    let settings = {}; // App settings (voting open, week, etc.)
    let votes = {}; // { day: { category: item_id } }
    let fixedItems = []; // Fixed items from admin
    let disabledDays = []; // Days disabled by admin
    let allVotesData = []; // All votes (for consensus table)
    let currentDay = 'monday';

    // ── DOM ──────────────────────────────────────────────
    const loading = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const mealSections = document.getElementById('meal-sections');
    const dayBtns = document.querySelectorAll('.day-btn');
    const summaryTabs = document.querySelectorAll('.summary-tab');
    const summaryTableWrappers = document.querySelectorAll('.summary-table-wrap[data-table]');
    const starInfoText = document.getElementById('star-info-text');
    const starUsedBadge = document.getElementById('star-used-badge');
    const starInfoBar = document.getElementById('star-info-bar');
    const fixedNotice = document.getElementById('fixed-item-notice');
    const fixedText = document.getElementById('fixed-item-text');
    const header = document.querySelector('.app-header');
    const stickySaveBar = document.getElementById('sticky-save-bar');

    let activeSummaryTab = 'consensus';

    // ── Helpers ──────────────────────────────────────────
    function showLoading(text = 'Loading…') {
        loading.style.display = 'flex';
        loadingText.textContent = text;
    }
    function hideLoading() {
        loading.style.display = 'none';
    }

    function showToast(msg, isError = false) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-msg');
        toastMsg.textContent = msg;
        toast.classList.toggle('error', isError);
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function updateStickyOffsets() {
        if (!header || !stickySaveBar) return;
        const headerHeight = Math.round(header.getBoundingClientRect().height);
        const saveBarHeight = Math.round(stickySaveBar.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--app-header-height', `${headerHeight}px`);
        document.documentElement.style.setProperty('--save-bar-height', `${saveBarHeight}px`);
    }

    function logout() {
        sessionStorage.clear();
        window.location.href = 'index.html';
    }

    function setActiveSummaryTab(tab) {
        activeSummaryTab = tab;
        summaryTabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
        summaryTableWrappers.forEach((wrap) => wrap.classList.toggle('active', wrap.dataset.table === tab));
    }

    document.getElementById('logout-btn').addEventListener('click', logout);

    summaryTabs.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (btn.dataset.tab !== activeSummaryTab) {
                setActiveSummaryTab(btn.dataset.tab);
            }
        });
    });

    window.addEventListener('resize', updateStickyOffsets);

    // ── Week badge ───────────────────────────────────────
    function ordinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    function updateWeekBadge(start, end) {
        const weekLabel = document.getElementById('week-label');
        if (!start || !end) {
            weekLabel.textContent = 'Week not set';
            return;
        }
        const MONTHS = [
            '',
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ];
        const fmt = (d) => {
            const parts = d.split('-');
            return `${ordinal(+parts[2])} ${MONTHS[+parts[1]]}`;
        };
        weekLabel.textContent = `Voting for ${fmt(start)} – ${fmt(end)}`;
    }

    // ── Star limit helpers ────────────────────────────────
    function starLimitForDay(day) {
        return day === 'friday' ? CONFIG.STAR_LIMIT_FRIDAY : CONFIG.STAR_LIMIT_REGULAR;
    }

    function starsUsedOnDay(day) {
        const dayVotes = votes[day] || {};
        return Object.values(dayVotes).filter((itemId) => {
            const item = items.find((i) => i.id === itemId);
            return item && item.is_star;
        }).length;
    }

    function updateStarBar() {
        const limit = starLimitForDay(currentDay);
        const used = starsUsedOnDay(currentDay);
        const dayName = DAY_LABELS[currentDay];
        starInfoText.innerHTML =
            currentDay === 'friday'
                ? `On <strong>Friday</strong> you can pick <strong>2 star items</strong>`
                : `You can pick <strong>1 star item</strong> today`;
        starUsedBadge.textContent = `${used} / ${limit} used`;
        starInfoBar.classList.toggle('star-limit-reached', used >= limit);
    }

    // ── Item used on another day ──────────────────────────
    function itemUsedOnOtherDay(itemId, excludeDay) {
        return DAYS.some((day) => {
            if (day === excludeDay) return false;
            const dayVotes = votes[day] || {};
            return Object.values(dayVotes).includes(itemId);
        });
    }

    // ── Render meal sections ──────────────────────────────
    function renderMealSections() {
        mealSections.innerHTML = '';
        const day = currentDay;
        const exclusions = DAY_CATEGORY_EXCLUSIONS[day] || [];

        // Update fixed item notice
        const todayFixed = fixedItems.filter((f) => f.day === day);
        if (todayFixed.length > 0) {
            const msgs = todayFixed
                .map((f) => {
                    const item = items.find((i) => i.id === f.item_id);
                    const catLabel = CATEGORY_LABELS[f.category] || f.category;
                    return item ? `${catLabel}: <strong>${item.name}</strong>` : '';
                })
                .filter(Boolean);
            fixedText.innerHTML = `📌 Fixed for this week — ${msgs.join(', ')}`;
            fixedNotice.style.display = '';
        } else {
            fixedNotice.style.display = 'none';
        }

        CATEGORIES.forEach((cat) => {
            if (exclusions.includes(cat)) return; // Skip excluded categories

            const catItems = items.filter((i) => i.category === cat);
            if (catItems.length === 0) return;

            const section = document.createElement('div');
            section.className = 'meal-section';

            // Header
            const header = document.createElement('div');
            header.className = 'meal-section-header';

            const iconEl = document.createElement('div');
            iconEl.className = 'meal-section-icon';
            iconEl.innerHTML = CATEGORY_ICONS[cat] || '';

            const titleWrap = document.createElement('div');
            const title = document.createElement('h3');
            title.className = 'meal-section-title';
            title.textContent = CATEGORY_LABELS[cat];
            titleWrap.appendChild(title);

            header.appendChild(iconEl);
            header.appendChild(titleWrap);
            section.appendChild(header);

            // Grid
            const grid = document.createElement('div');
            grid.className = 'meal-items-grid';

            // Check for fixed item in this category/day
            const fixedEntry = fixedItems.find((f) => f.day === day && f.category === cat);

            catItems.forEach((item) => {
                const card = buildItemCard(item, cat, day, fixedEntry);
                grid.appendChild(card);
            });

            section.appendChild(grid);
            mealSections.appendChild(section);
        });

        updateStarBar();
        updateVotedDots();
        renderSummaryTables();
    }

    function buildItemCard(item, cat, day, fixedEntry) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.id = item.id;

        // Golden outline for star items
        if (item.is_star) card.classList.add('star-item');

        const dayVotes = votes[day] || {};
        const selected = dayVotes[cat] === item.id;

        // Determine disabled states
        const starLimit = starLimitForDay(day);
        const starsUsed = starsUsedOnDay(day);
        const otherDayUsed = itemUsedOnOtherDay(item.id, day);
        const starMaxed = item.is_star && !selected && starsUsed >= starLimit;
        const isFixed = fixedEntry && fixedEntry.item_id !== item.id;
        const isFixedThis = fixedEntry && fixedEntry.item_id === item.id;

        if (selected) card.classList.add('selected');
        if (otherDayUsed || starMaxed || isFixed) card.classList.add('disabled');

        // Image
        if (item.image_url) {
            const img = document.createElement('img');
            img.className = 'item-card-img';
            img.src = item.image_url;
            img.alt = item.name;
            img.loading = 'lazy';
            img.onerror = () => img.remove();
            card.appendChild(img);
        }

        // Body
        const body = document.createElement('div');
        body.className = 'item-card-body';

        const name = document.createElement('div');
        name.className = 'item-card-name';
        name.textContent = item.name;
        body.appendChild(name);

        if (item.description) {
            const desc = document.createElement('div');
            desc.className = 'item-card-desc';
            desc.textContent = item.description;
            body.appendChild(desc);
        }

        // Tags
        const tags = document.createElement('div');
        tags.className = 'item-card-tags';

        if (item.is_star) {
            const starTag = document.createElement('span');
            starTag.className = 'star-tag';
            starTag.innerHTML = `<i class="fa-solid fa-star"></i> Star`;
            tags.appendChild(starTag);
        }

        if (isFixedThis) {
            const fixedTag = document.createElement('span');
            fixedTag.className = 'allergen-tag';
            fixedTag.style.background = 'rgba(26,86,50,0.1)';
            fixedTag.style.color = 'var(--green)';
            fixedTag.textContent = '📌 Fixed';
            tags.appendChild(fixedTag);
        }

        if (otherDayUsed) {
            const usedTag = document.createElement('span');
            usedTag.className = 'allergen-tag';
            usedTag.style.background = 'rgba(0,0,0,0.06)';
            usedTag.style.color = '#999';
            usedTag.textContent = 'Chosen other day';
            tags.appendChild(usedTag);
        }

        (item.allergens || []).forEach((a) => {
            const tag = document.createElement('span');
            tag.className = `allergen-tag ${a}`;
            tag.textContent = a.charAt(0).toUpperCase() + a.slice(1);
            tags.appendChild(tag);
        });

        body.appendChild(tags);
        card.appendChild(body);

        // Click handler
        if (!otherDayUsed && !starMaxed && !isFixed) {
            card.addEventListener('click', async () => {
                await toggleVote(day, cat, item.id);
            });
        }

        return card;
    }

    async function toggleVote(day, cat, itemId) {
        if (!votes[day]) votes[day] = {};
        const current = votes[day][cat];
        const userId = session.id;
        const item = items.find((i) => i.id === itemId);

        if (item && item.is_star && current !== itemId) {
            const limit = starLimitForDay(day);
            const used = starsUsedOnDay(day);
            const wasStarSelected = current && items.find((i) => i.id === current)?.is_star;
            const effectiveUsed = wasStarSelected ? used - 1 : used;
            if (effectiveUsed >= limit) {
                showToast(`You can only pick ${limit} star item${limit > 1 ? 's' : ''} on ${DAY_LABELS[day]}.`, true);
                return;
            }
        }

        showLoading(current === itemId ? 'Removing vote…' : 'Saving vote…');
        try {
            if (current) {
                await deleteUserVote(userId, day, cat);
                allVotesData = allVotesData.filter(
                    (v) => !(v.user_id === userId && v.day === day && v.category === cat),
                );
            }

            if (current === itemId) {
                delete votes[day][cat];
                showToast('Vote removed.');
            } else {
                await DB.insert('votes', {
                    user_id: userId,
                    day,
                    category: cat,
                    item_id: itemId,
                });

                votes[day][cat] = itemId;
                allVotesData.push({ user_id: userId, day, category: cat, item_id: itemId });
                showToast('Vote saved.');
            }

            Cache.invalidate(`votes_${userId}`);
            Cache.invalidate('all_votes');
        } catch (err) {
            showToast(`Error saving vote: ${err.message}`, true);
        } finally {
            hideLoading();
            renderMealSections();
        }
    }

    // ── Voted dots ───────────────────────────────────────
    function updateVotedDots() {
        DAYS.forEach((day) => {
            const dot = document.getElementById(`dot-${day}`);
            if (!dot) return;
            const dayVotes = votes[day] || {};
            dot.classList.toggle('has-votes', Object.keys(dayVotes).length > 0);
        });
    }

    // ── Summary Tables ───────────────────────────────────
    function renderSummaryTables() {
        const activeDays = DAYS.filter((d) => !disabledDays.includes(d));

        buildSummaryTable(
            'consensus-table',
            activeDays,
            (day, cat) => {
                // Find top voted item for this day/cat from allVotesData (populated after load)
                const catVotes = (allVotesData || []).filter((v) => v.day === day && v.category === cat);
                if (!catVotes.length) return null;
                const tally = {};
                catVotes.forEach((v) => {
                    tally[v.item_id] = (tally[v.item_id] || 0) + 1;
                });
                const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
                if (!sorted.length) return null;
                const winner = items.find((i) => i.id === sorted[0][0]);
                // Check fixed item override
                const fixed = fixedItems.find((f) => f.day === day && f.category === cat);
                if (fixed) {
                    const fixedItem = items.find((i) => i.id === fixed.item_id);
                    return fixedItem ? { name: fixedItem.name, isFixed: true } : null;
                }
                return winner ? { name: winner.name, isFixed: false } : null;
            },
            'consensus',
        );

        buildSummaryTable(
            'my-selections-table',
            activeDays,
            (day, cat) => {
                const dayVotes = votes[day] || {};
                const itemId = dayVotes[cat];
                if (!itemId) return null;
                const item = items.find((i) => i.id === itemId);
                return item ? { name: item.name } : null;
            },
            'my',
        );

        setActiveSummaryTab(activeSummaryTab);
    }

    function buildSummaryTable(tableId, activeDays, getCellData, mode) {
        const table = document.getElementById(tableId);
        if (!table) return;

        // Build header
        const thead = table.querySelector('thead') || document.createElement('thead');
        thead.innerHTML = '';
        const headerRow = document.createElement('tr');
        const thEmpty = document.createElement('th');
        thEmpty.textContent = 'Meal';
        headerRow.appendChild(thEmpty);
        activeDays.forEach((day) => {
            const th = document.createElement('th');
            th.textContent = DAY_LABELS[day].substring(0, 3); // Mon, Tue, etc.
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        if (!table.querySelector('thead')) table.appendChild(thead);

        // Build body
        const tbody = table.querySelector('tbody') || document.createElement('tbody');
        tbody.innerHTML = '';
        CATEGORIES.forEach((cat) => {
            // Check if any active day shows this category (skip fully excluded ones)
            const anyVisible = activeDays.some((day) => {
                const excl = DAY_CATEGORY_EXCLUSIONS[day] || [];
                return !excl.includes(cat);
            });
            if (!anyVisible) return;

            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.className = 'row-label';
            tdLabel.textContent = CATEGORY_LABELS[cat];
            tr.appendChild(tdLabel);

            activeDays.forEach((day) => {
                const td = document.createElement('td');
                const excl = DAY_CATEGORY_EXCLUSIONS[day] || [];
                if (excl.includes(cat)) {
                    td.className = 'day-disabled';
                    td.textContent = '—';
                } else {
                    const data = getCellData(day, cat);
                    if (data) {
                        td.className = mode === 'my' ? 'voted' : 'consensus-winner';
                        td.textContent = data.name;
                        if (data.isFixed) {
                            const pin = document.createElement('span');
                            pin.textContent = ' 📌';
                            pin.title = 'Fixed by admin';
                            td.appendChild(pin);
                        }
                    } else {
                        td.className = 'empty';
                        td.textContent = mode === 'my' ? 'Not chosen' : 'No votes';
                    }
                }
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
        if (!table.querySelector('tbody')) table.appendChild(tbody);
    }

    // ── Day selector ─────────────────────────────────────
    dayBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('disabled-day')) return;
            dayBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentDay = btn.dataset.day;
            renderMealSections();
        });
    });

    async function deleteUserVote(userId, day, category) {
        const url = new URL(`${DB.url}/rest/v1/votes`);
        url.searchParams.set('user_id', `eq.${userId}`);
        url.searchParams.set('day', `eq.${day}`);
        url.searchParams.set('category', `eq.${category}`);

        const res = await fetch(url.toString(), {
            method: 'DELETE',
            headers: DB.headers(),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(err.message || `HTTP ${res.status}`);
        }
    }

    // ── Load everything ───────────────────────────────────
    async function init() {
        // Display user name
        const { first, last } = parseNameFromEmail(session.email);
        document.getElementById('user-name').textContent = `${first} ${last}`.trim();

        showLoading('Loading menu…');
        try {
            // Load settings
            const settingsRows = await Cache.fetch('settings', () => DB.select('settings', '*'));
            if (settingsRows && settingsRows.length > 0) {
                settingsRows.forEach((row) => {
                    settings[row.key] = row.value;
                });
            }

            // Check voting open
            if (settings.voting_open === 'false' || settings.voting_open === false) {
                document.getElementById('voting-closed-screen').style.display = 'flex';
                document.getElementById('sticky-save-bar').style.display = 'none';
                document.getElementById('voting-main').style.display = 'none';
                hideLoading();
                return;
            }

            // Week badge
            updateWeekBadge(settings.week_start, settings.week_end);

            // Disabled days
            disabledDays = settings.disabled_days ? JSON.parse(settings.disabled_days) : [];
            dayBtns.forEach((btn) => {
                if (disabledDays.includes(btn.dataset.day)) {
                    btn.classList.add('disabled-day');
                }
            });

            // Set first available day
            const firstAvailable = DAYS.find((d) => !disabledDays.includes(d)) || 'monday';
            currentDay = firstAvailable;
            dayBtns.forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.day === firstAvailable);
            });

            // Load items
            items = (await Cache.fetch('items', () => DB.select('items', '*', { order: 'name.asc' }))) || [];

            // Load fixed items
            fixedItems = (await Cache.fetch('fixed_items', () => DB.select('fixed_items', '*'))) || [];

            // Load existing votes (this user)
            const existingVotes =
                (await Cache.fetch(`votes_${session.id}`, () =>
                    DB.select('votes', '*', { user_id: `eq.${session.id}` }),
                )) || [];

            existingVotes.forEach((v) => {
                if (!votes[v.day]) votes[v.day] = {};
                votes[v.day][v.category] = v.item_id;
            });

            // Load ALL votes for consensus table (cached)
            allVotesData = (await Cache.fetch('all_votes', () => DB.select('votes', '*', {}))) || [];

            hideLoading();
            renderMealSections();
            updateStickyOffsets();
        } catch (err) {
            hideLoading();
            showToast(`Failed to load: ${err.message}`, true);
            console.error(err);
        }
    }

    init();
})();
