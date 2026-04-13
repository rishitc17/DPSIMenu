/**
 * Admin Dashboard — full management interface
 */

(function () {
    // ── Session guard ─────────────────────────────────
    let session;
    try {
        session = JSON.parse(sessionStorage.getItem('dps_user'));
    } catch {}
    if (!session || !session.is_admin) {
        window.location.href = 'index.html';
        return;
    }

    // ── State ─────────────────────────────────────────
    let allItems = [];
    let settings = {};
    let fixedItems = [];
    let currentCatFilter = 'all';
    let editingItemId = null;
    let deleteItemId = null;
    let deleteItemName = '';

    // ── UI Helpers ────────────────────────────────────
    function showLoading(text = 'Loading…') {
        document.getElementById('loading-overlay').style.display = 'flex';
        document.getElementById('loading-text').textContent = text;
    }
    function hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    function showToast(msg, isError = false) {
        const toast = document.getElementById('toast');
        document.getElementById('toast-msg').textContent = msg;
        toast.classList.toggle('error', isError);
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ── Tab switching ─────────────────────────────────
    const tabs = document.querySelectorAll('.admin-tab');
    const panels = { items: 'panel-items', results: 'panel-results', settings: 'panel-settings' };

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            const panelId = panels[tab.dataset.tab];
            Object.values(panels).forEach((p) => {
                document.getElementById(p).style.display = p === panelId ? '' : 'none';
            });
            if (tab.dataset.tab === 'results') loadResults();
        });
    });

    // ── Logout ────────────────────────────────────────
    document.getElementById('logout-btn').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'index.html';
    });

    // ── Category filter ───────────────────────────────
    document.querySelectorAll('.cat-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentCatFilter = btn.dataset.cat;
            renderItems();
        });
    });

    // ── Render items grid ─────────────────────────────
    function renderItems() {
        const grid = document.getElementById('admin-items-grid');
        grid.innerHTML = '';

        const filtered =
            currentCatFilter === 'all' ? allItems : allItems.filter((i) => i.category === currentCatFilter);

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-muted);">No items in this category yet.</div>`;
            return;
        }

        filtered.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'admin-item-card';

            if (item.image_url) {
                const img = document.createElement('img');
                img.className = 'admin-item-img';
                img.src = item.image_url;
                img.alt = item.name;
                img.loading = 'lazy';
                img.onerror = () => img.remove();
                card.appendChild(img);
            }

            const body = document.createElement('div');
            body.className = 'admin-item-body';

            const catLabel = document.createElement('div');
            catLabel.className = 'admin-item-cat';
            catLabel.textContent = CATEGORY_LABELS[item.category] || item.category;
            body.appendChild(catLabel);

            const name = document.createElement('div');
            name.className = 'admin-item-name';
            name.textContent = item.name;
            body.appendChild(name);

            if (item.description) {
                const desc = document.createElement('div');
                desc.style.cssText = 'font-size:0.78rem;color:var(--text-muted);margin-top:2px;';
                desc.textContent = item.description;
                body.appendChild(desc);
            }

            const tags = document.createElement('div');
            tags.className = 'admin-item-tags';

            if (item.is_star) {
                const st = document.createElement('span');
                st.className = 'star-tag';
                st.innerHTML = `<i class="fa-solid fa-star"></i> Star`;
                tags.appendChild(st);
            }

            (item.allergens || []).forEach((a) => {
                const t = document.createElement('span');
                t.className = `allergen-tag ${a}`;
                t.textContent = a.charAt(0).toUpperCase() + a.slice(1);
                tags.appendChild(t);
            });

            body.appendChild(tags);
            card.appendChild(body);

            // Actions
            const actions = document.createElement('div');
            actions.className = 'admin-item-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-secondary';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => openEditModal(item));
            actions.appendChild(editBtn);

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-ghost';
            delBtn.style.color = 'var(--red)';
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', () => openDeleteModal(item));
            actions.appendChild(delBtn);

            card.appendChild(actions);
            grid.appendChild(card);
        });

        // Update star warning
        const starCount = allItems.filter((i) => i.is_star).length;
        const starWarn = document.getElementById('star-warning');
        starWarn.style.display = starCount >= CONFIG.MAX_STAR_ITEMS_TOTAL ? '' : 'none';
    }

    // ── Star item count check ─────────────────────────
    function getStarCount(excludeId = null) {
        return allItems.filter((i) => i.is_star && i.id !== excludeId).length;
    }

    // ── Add/Edit Item Modal ───────────────────────────
    document.getElementById('add-item-btn').addEventListener('click', () => openAddModal());

    function openAddModal() {
        editingItemId = null;
        document.getElementById('modal-title').textContent = 'Add Menu Item';
        document.getElementById('item-edit-id').value = '';
        document.getElementById('item-name').value = '';
        document.getElementById('item-category').value = '';
        document.getElementById('item-description').value = '';
        document.getElementById('item-image').value = '';
        document.getElementById('allergen-lactose').checked = false;
        document.getElementById('allergen-mushroom').checked = false;
        document.getElementById('allergen-nuts').checked = false;
        document.getElementById('item-star').checked = false;
        document.getElementById('item-form-error').textContent = '';
        document.getElementById('item-modal').style.display = 'flex';
        setTimeout(() => document.getElementById('item-name').focus(), 50);
    }

    function openEditModal(item) {
        editingItemId = item.id;
        document.getElementById('modal-title').textContent = 'Edit Menu Item';
        document.getElementById('item-edit-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-category').value = item.category;
        document.getElementById('item-description').value = item.description || '';
        document.getElementById('item-image').value = item.image_url || '';
        const allergens = item.allergens || [];
        document.getElementById('allergen-lactose').checked = allergens.includes('lactose');
        document.getElementById('allergen-mushroom').checked = allergens.includes('mushroom');
        document.getElementById('allergen-nuts').checked = allergens.includes('nuts');
        document.getElementById('item-star').checked = !!item.is_star;
        document.getElementById('item-form-error').textContent = '';
        document.getElementById('item-modal').style.display = 'flex';
    }

    function closeItemModal() {
        document.getElementById('item-modal').style.display = 'none';
    }

    document.getElementById('modal-close-btn').addEventListener('click', closeItemModal);
    document.getElementById('item-cancel-btn').addEventListener('click', closeItemModal);

    document.getElementById('item-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('item-modal')) closeItemModal();
    });

    document.getElementById('item-save-btn').addEventListener('click', saveItem);

    async function saveItem() {
        const name = document.getElementById('item-name').value.trim();
        const category = document.getElementById('item-category').value;
        const description = document.getElementById('item-description').value.trim();
        const imageUrl = document.getElementById('item-image').value.trim();
        const isStar = document.getElementById('item-star').checked;

        const allergens = [];
        if (document.getElementById('allergen-lactose').checked) allergens.push('lactose');
        if (document.getElementById('allergen-mushroom').checked) allergens.push('mushroom');
        if (document.getElementById('allergen-nuts').checked) allergens.push('nuts');

        const errorEl = document.getElementById('item-form-error');
        errorEl.textContent = '';

        if (!name) return (errorEl.textContent = 'Name is required.');
        if (!category) return (errorEl.textContent = 'Category is required.');

        // Star limit check
        if (isStar && getStarCount(editingItemId) >= CONFIG.MAX_STAR_ITEMS_TOTAL) {
            return (errorEl.textContent = `Maximum ${CONFIG.MAX_STAR_ITEMS_TOTAL} star items allowed.`);
        }

        const payload = {
            name,
            category,
            description: description || null,
            image_url: imageUrl || null,
            allergens,
            is_star: isStar,
        };

        showLoading('Saving item…');
        try {
            if (editingItemId) {
                await DB.update('items', payload, 'id', editingItemId);
                const idx = allItems.findIndex((i) => i.id === editingItemId);
                if (idx !== -1) allItems[idx] = { ...allItems[idx], ...payload };
            } else {
                const result = await DB.insert('items', payload);
                const newItem = Array.isArray(result) ? result[0] : result;
                if (newItem) allItems.push(newItem);
            }

            Cache.invalidate('items');
            hideLoading();
            closeItemModal();
            renderItems();
            populateFixedItemSelect();
            showToast(editingItemId ? 'Item updated!' : 'Item added!');
        } catch (err) {
            hideLoading();
            errorEl.textContent = `Error: ${err.message}`;
        }
    }

    // ── Delete Modal ──────────────────────────────────
    function openDeleteModal(item) {
        deleteItemId = item.id;
        deleteItemName = item.name;
        document.getElementById('delete-item-name').textContent = item.name;
        document.getElementById('delete-modal').style.display = 'flex';
    }

    document.getElementById('delete-cancel-btn').addEventListener('click', () => {
        document.getElementById('delete-modal').style.display = 'none';
    });

    document.getElementById('delete-confirm-btn').addEventListener('click', async () => {
        if (!deleteItemId) return;
        showLoading('Deleting…');
        try {
            await DB.delete('items', 'id', deleteItemId);
            allItems = allItems.filter((i) => i.id !== deleteItemId);
            Cache.invalidate('items');
            document.getElementById('delete-modal').style.display = 'none';
            hideLoading();
            renderItems();
            populateFixedItemSelect();
            showToast('Item deleted.');
        } catch (err) {
            hideLoading();
            showToast(`Error: ${err.message}`, true);
        }
    });

    // ── Results Tab ───────────────────────────────────
    document.getElementById('refresh-results-btn').addEventListener('click', loadResults);

    async function loadResults() {
        showLoading('Loading results…');
        try {
            // Total students
            const users = await DB.select('users', 'id', {});
            const totalStudents = (users ? users.length : 0) - 1;

            // Students who voted
            const voterRows = await DB.select('votes', 'user_id', {});
            const uniqueVoters = new Set((voterRows || []).map((v) => v.user_id)).size;
            const pct = totalStudents ? Math.round((uniqueVoters / totalStudents) * 100) : 0;

            document.getElementById('stat-total').textContent = totalStudents;
            document.getElementById('stat-voted').textContent = uniqueVoters;
            document.getElementById('stat-pct').textContent = `${pct}%`;

            // All votes
            const allVotes = await DB.select('votes', '*', {});

            // Load settings for disabled days
            const settingsRows = await DB.select('settings', '*', {});
            const localSettings = {};
            (settingsRows || []).forEach((r) => {
                localSettings[r.key] = r.value;
            });
            const disabledDays = localSettings.disabled_days ? JSON.parse(localSettings.disabled_days) : [];

            // Fixed items
            const fixedItemsRows = await DB.select('fixed_items', '*', {});

            // Build results per day/category
            const resultsDiv = document.getElementById('results-days');
            resultsDiv.innerHTML = '';

            // Track which items have been assigned to avoid same item on two days
            const assignedItemIds = new Set();

            DAYS.forEach((day) => {
                if (disabledDays.includes(day)) return;
                const exclusions = DAY_CATEGORY_EXCLUSIONS[day] || [];

                const dayCard = document.createElement('div');
                dayCard.className = 'result-day-card';

                const dayHeader = document.createElement('div');
                dayHeader.className = 'result-day-header';
                dayHeader.innerHTML = `<h3 class="result-day-title">${DAY_LABELS[day]}</h3>`;
                dayCard.appendChild(dayHeader);

                const meals = document.createElement('div');
                meals.className = 'result-meals';

                CATEGORIES.forEach((cat) => {
                    if (exclusions.includes(cat)) return;

                    const row = document.createElement('div');
                    row.className = 'result-meal-row';

                    const catEl = document.createElement('div');
                    catEl.className = 'result-meal-cat';
                    catEl.textContent = CATEGORY_LABELS[cat];
                    row.appendChild(catEl);

                    const winnerEl = document.createElement('div');
                    winnerEl.className = 'result-meal-winner';

                    // Check for fixed item
                    const fixedEntry = (fixedItemsRows || []).find((f) => f.day === day && f.category === cat);
                    if (fixedEntry) {
                        const fixedItem = allItems.find((i) => i.id === fixedEntry.item_id);
                        if (fixedItem) {
                            winnerEl.innerHTML = `
                <span class="result-item-name">${fixedItem.name}</span>
                <span class="result-fixed-badge">Fixed</span>
              `;
                            row.appendChild(winnerEl);
                            meals.appendChild(row);
                            return;
                        }
                    }

                    // Count votes for this day/category
                    const catVotes = (allVotes || []).filter((v) => v.day === day && v.category === cat);
                    if (catVotes.length === 0) {
                        winnerEl.innerHTML = `<span class="result-no-votes">No votes yet</span>`;
                        row.appendChild(winnerEl);
                        meals.appendChild(row);
                        return;
                    }

                    // Tally
                    const tally = {};
                    catVotes.forEach((v) => {
                        tally[v.item_id] = (tally[v.item_id] || 0) + 1;
                    });

                    // Sort by votes desc
                    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);

                    // Find winner that hasn't been used on another day
                    let winner = null;
                    let winnerVotes = 0;
                    for (const [itemId, count] of sorted) {
                        if (!assignedItemIds.has(itemId)) {
                            winner = itemId;
                            winnerVotes = count;
                            break;
                        }
                    }

                    if (!winner && sorted.length > 0) {
                        // All top items conflict — take first anyway
                        winner = sorted[0][0];
                        winnerVotes = sorted[0][1];
                    }

                    if (winner) assignedItemIds.add(winner);

                    const winItem = allItems.find((i) => i.id === winner);
                    if (winItem) {
                        winnerEl.innerHTML = `
              <span class="result-item-name">${winItem.name}</span>
              <span class="result-item-votes">${winnerVotes} vote${winnerVotes !== 1 ? 's' : ''}</span>
            `;
                    } else {
                        winnerEl.innerHTML = `<span class="result-no-votes">No votes yet</span>`;
                    }

                    row.appendChild(winnerEl);
                    meals.appendChild(row);
                });

                dayCard.appendChild(meals);
                resultsDiv.appendChild(dayCard);
            });

            hideLoading();
        } catch (err) {
            hideLoading();
            showToast(`Error loading results: ${err.message}`, true);
        }
    }

    // ── Settings Tab ──────────────────────────────────

    // Voting open/close
    document.getElementById('save-voting-status-btn').addEventListener('click', async () => {
        const isOpen = document.getElementById('voting-open-toggle').checked;
        showLoading('Saving…');
        try {
            await upsertSetting('voting_open', String(isOpen));
            settings.voting_open = String(isOpen);
            Cache.invalidate('settings');
            hideLoading();
            showToast(`Voting is now ${isOpen ? 'open' : 'closed'}.`);
        } catch (err) {
            hideLoading();
            showToast(`Error: ${err.message}`, true);
        }
    });

    // Week dates
    document.getElementById('save-week-btn').addEventListener('click', async () => {
        const start = document.getElementById('week-start-input').value;
        const end = document.getElementById('week-end-input').value;
        if (!start || !end) return showToast('Please set both start and end dates.', true);
        showLoading('Saving week…');
        try {
            await upsertSetting('week_start', start);
            await upsertSetting('week_end', end);
            Cache.invalidate('settings');
            hideLoading();
            showToast('Week updated!');
        } catch (err) {
            hideLoading();
            showToast(`Error: ${err.message}`, true);
        }
    });

    // Day availability
    document.getElementById('save-days-btn').addEventListener('click', async () => {
        const disabled = [];
        document.querySelectorAll('.day-toggle-row').forEach((row) => {
            const cb = row.querySelector('input[type=checkbox]');
            if (!cb.checked) disabled.push(row.dataset.day);
        });
        showLoading('Saving…');
        try {
            await upsertSetting('disabled_days', JSON.stringify(disabled));
            Cache.invalidate('settings');
            hideLoading();
            showToast('Day availability saved!');
        } catch (err) {
            hideLoading();
            showToast(`Error: ${err.message}`, true);
        }
    });

    // Fixed items
    function populateFixedItemSelect() {
        const catSelect = document.getElementById('fixed-cat-select');
        const itemSelect = document.getElementById('fixed-item-select');
        const cat = catSelect.value;
        const catItems = allItems.filter((i) => i.category === cat);
        itemSelect.innerHTML = `<option value="">— Select item —</option>`;
        catItems.forEach((item) => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item.name;
            itemSelect.appendChild(opt);
        });
    }

    document.getElementById('fixed-cat-select').addEventListener('change', populateFixedItemSelect);

    document.getElementById('add-fixed-item-btn').addEventListener('click', async () => {
        const day = document.getElementById('fixed-day-select').value;
        const category = document.getElementById('fixed-cat-select').value;
        const itemId = document.getElementById('fixed-item-select').value;
        if (!itemId) return showToast('Please select an item.', true);

        showLoading('Fixing item…');
        try {
            // Upsert fixed item (one per day/category)
            const existing = fixedItems.find((f) => f.day === day && f.category === category);
            if (existing) {
                await DB.update('fixed_items', { item_id: itemId }, 'id', existing.id);
                existing.item_id = itemId;
            } else {
                const result = await DB.insert('fixed_items', { day, category, item_id: itemId });
                const newRow = Array.isArray(result) ? result[0] : result;
                if (newRow) fixedItems.push(newRow);
            }
            Cache.invalidate('fixed_items');
            hideLoading();
            renderFixedItemsList();
            showToast('Fixed item set!');
        } catch (err) {
            hideLoading();
            showToast(`Error: ${err.message}`, true);
        }
    });

    function renderFixedItemsList() {
        const list = document.getElementById('fixed-items-list');
        list.innerHTML = '';
        if (fixedItems.length === 0) {
            list.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;">No fixed items set.</p>`;
            return;
        }
        fixedItems.forEach((f) => {
            const item = allItems.find((i) => i.id === f.item_id);
            const row = document.createElement('div');
            row.className = 'fixed-item-row';
            row.innerHTML = `
        <span class="fixed-item-row-label">${DAY_LABELS[f.day]} — ${CATEGORY_LABELS[f.category] || f.category}</span>
        <span class="fixed-item-row-meta">${item ? item.name : 'Unknown item'}</span>
        <button class="fixed-remove-btn" data-id="${f.id}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
            list.appendChild(row);
        });

        list.querySelectorAll('.fixed-remove-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                showLoading('Removing…');
                try {
                    await DB.delete('fixed_items', 'id', id);
                    fixedItems = fixedItems.filter((f) => f.id != id);
                    Cache.invalidate('fixed_items');
                    hideLoading();
                    renderFixedItemsList();
                    showToast('Fixed item removed.');
                } catch (err) {
                    hideLoading();
                    showToast(`Error: ${err.message}`, true);
                }
            });
        });
    }

    // ── Settings helpers ──────────────────────────────
    async function upsertSetting(key, value) {
        // Try update first, then insert
        const existing = await DB.select('settings', '*', { key: `eq.${key}` });
        if (existing && existing.length > 0) {
            await DB.update('settings', { value }, 'key', key);
        } else {
            await DB.insert('settings', { key, value });
        }
    }

    // ── Load settings into UI ─────────────────────────
    function loadSettingsIntoUI() {
        // Voting open
        document.getElementById('voting-open-toggle').checked =
            settings.voting_open === 'true' || settings.voting_open === true;

        // Week
        if (settings.week_start) document.getElementById('week-start-input').value = settings.week_start;
        if (settings.week_end) document.getElementById('week-end-input').value = settings.week_end;

        // Disabled days
        const disabled = settings.disabled_days ? JSON.parse(settings.disabled_days) : [];
        document.querySelectorAll('.day-toggle-row').forEach((row) => {
            const cb = row.querySelector('input[type=checkbox]');
            cb.checked = !disabled.includes(row.dataset.day);
        });
    }

    // ── Init ──────────────────────────────────────────
    async function init() {
        showLoading('Loading admin dashboard…');
        try {
            // Load settings
            const settingsRows = await DB.select('settings', '*', {});
            (settingsRows || []).forEach((r) => {
                settings[r.key] = r.value;
            });

            // Load items
            allItems = (await DB.select('items', '*', { order: 'name.asc' })) || [];

            // Load fixed items
            fixedItems = (await DB.select('fixed_items', '*', {})) || [];

            hideLoading();
            renderItems();
            loadSettingsIntoUI();
            renderFixedItemsList();
            populateFixedItemSelect();
        } catch (err) {
            hideLoading();
            showToast(`Failed to load: ${err.message}`, true);
            console.error(err);
        }
    }

    init();
})();
