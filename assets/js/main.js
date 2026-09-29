/* rspets site: interactive demos built on window.RS (data.js) and the voxel stage (voxel.js). */
document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const el = (tag, cls, html) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const rnd = (n) => Math.floor(Math.random() * n);
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const RS = window.RS;
    const EC = RS.ELEMENT_COLOR;
    const RC = RS.RARITY_COLOR;

    /* ---------- generic: copy buttons, toast, reveal ---------- */
    const toast = $('toast');
    let toastT;
    const say = (msg) => {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastT);
        toastT = setTimeout(() => toast.classList.remove('show'), 2200);
    };
    document.querySelectorAll('[data-copy]').forEach((b) =>
        b.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(b.dataset.copy);
                b.classList.add('ok');
                b.textContent = 'COPIED';
                setTimeout(() => {
                    b.classList.remove('ok');
                    b.textContent = 'COPY';
                }, 1600);
            } catch (e) {
                say('Copy failed — select the text manually');
            }
        })
    );
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
            (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
            { threshold: 0.08 }
        );
        document.querySelectorAll('.sec-head, .loop').forEach((n) => {
            n.classList.add('rv');
            io.observe(n);
        });
    }

    if (!window.THREE) {
        document.querySelectorAll('canvas').forEach((c) => c.replaceWith(el('div', 'fine', 'WebGL is required for the 3D pets.')));
        return;
    }

    /* ---------- eggs (used by the gacha) ---------- */
    ['common', 'rare', 'epic', 'legendary'].forEach((r) => {
        const c = RC[r];
        RS.VOXEL_BUILDERS['egg_' + r] = (m) => {
            m.ell(0, 5, 0, 3.6, 5, 3.6, '#f4efe0');
            m.ell(0, 4.5, 0, 3.7, 4.2, 3.7, '#f4efe0');
            for (let y = 0; y < 11; y++) for (let x = -4; x <= 3; x++) for (let z = -4; z <= 4; z++) {
                const q = m.v.get(x + ',' + y + ',' + z);
                if (!q) continue;
                if ((x * 3 + y * 5 + z * 7) % 11 === 0 || (y === 4 && (x + z) % 2 === 0)) q.c = c;
                else if (y < 2) q.c = '#d9d2bc';
            }
            m.pivot('head', 0, 5, 0);
        };
    });

    /* ---------- thumbnails ---------- */
    const ids = RS.SPECIES.map((s) => s.id);
    const thumbs = RS.thumbnails(ids, 176);
    const thumb = (id, cls) => {
        const i = new Image();
        i.src = thumbs[id];
        i.alt = RS.SPECIES_BY_ID[id].name;
        if (cls) i.className = cls;
        return i;
    };
    const tag = (text, color) => `<span class="tag" style="background:${color}">${text}</span>`;
    const elTag = (e) => tag(e.toUpperCase(), EC[e]);
    const rarTag = (r) => tag(r.toUpperCase(), RC[r]);

    /* ---------- HERO ---------- */
    (() => {
        const st = new RS.Stage($('heroCanvas'), { cam: [10, 8, 17], look: [0, 4.2, 0], platformR: 6, pixel: 3, spin: 0.7, fitW: 15, fitH: 12 });
        const featured = ['fire_007', 'water_005', 'electric_005', 'grass_005', 'flying_002', 'ice_005', 'fire_001', 'ground_003'];
        let i = 0, cur = null;
        const show = (n) => {
            i = (n + featured.length) % featured.length;
            const sp = RS.SPECIES_BY_ID[featured[i]];
            if (cur) st.remove(cur);
            cur = st.add(new RS.PetView(sp.id, 9.5), 0, 0);
            cur.fx('happy', 0.8);
            st.setTheme(EC[sp.element]);
            $('heroTag').innerHTML = `<span class="nm">${sp.name}</span>${elTag(sp.element)}${rarTag(sp.rarity)}`;
        };
        show(0);
        let auto = setInterval(() => show(i + 1), 4500);
        const go = (d) => {
            clearInterval(auto);
            show(i + d);
            auto = setInterval(() => show(i + 1), 6000);
        };
        $('heroPrev').onclick = () => go(-1);
        $('heroNext').onclick = () => go(1);
    })();

    /* ---------- PET DEX ---------- */
    (() => {
        const filter = { el: null, rar: null };
        const bar = $('dexFilters');
        const grid = $('dexGrid');
        const chips = [];
        const chip = (label, kind, val, color) => {
            const b = el('button', 'chip', (color ? `<span class="dot" style="background:${color}"></span>` : '') + label);
            b.onclick = () => {
                filter[kind] = filter[kind] === val ? null : val;
                paint();
            };
            chips.push([b, kind, val]);
            bar.appendChild(b);
        };
        RS.ELEMENTS.forEach((e) => chip(e.toUpperCase(), 'el', e, EC[e]));
        RS.RARITIES.forEach((r) => chip(r.toUpperCase(), 'rar', r, RC[r]));
        const cards = {};
        RS.SPECIES.forEach((s) => {
            const c = el('button', 'dcard');
            c.style.setProperty('--rc', RC[s.rarity]);
            c.appendChild(thumb(s.id));
            c.appendChild(el('span', '', s.name));
            c.onclick = () => select(s.id);
            cards[s.id] = c;
            grid.appendChild(c);
        });
        const paint = () => {
            chips.forEach(([b, k, v]) => b.classList.toggle('on', filter[k] === v));
            RS.SPECIES.forEach((s) => {
                const ok = (!filter.el || s.element === filter.el) && (!filter.rar || s.rarity === filter.rar);
                cards[s.id].classList.toggle('dim', !ok);
            });
        };
        paint();
        const counts = {};
        RS.SPECIES.forEach((s) => (counts[s.rarity] = (counts[s.rarity] || 0) + 1));
        RS.RARITIES.forEach((r) => {
            $('rarityRow').appendChild(el('div', 'rar', `<i style="--c:${RC[r]}"></i><b>${cap(r)}</b><span>${counts[r] || 0} species</span>`));
        });

        const st = new RS.Stage($('dexCanvas'), { cam: [8, 6, 13], look: [0, 3.4, 0], platformR: 4, pixel: 3, spin: 0.6, fitW: 9, fitH: 9.5 });
        let view = null, sp = null;
        const SC = { hp: '#5bd15b', attack: '#ff6b3d', defense: '#3d9bff', spatk: '#b66bff', spdef: '#4ad8c8', speed: '#ffd83d' };
        const draw = () => {
            const lv = +$('dexLevel').value;
            $('dexLevelVal').textContent = lv;
            const cs = RS.calcStats(sp.stats, lv, 15);
            $('dexStats').innerHTML = RS.STAT_KEYS.map((k) => {
                const max = k === 'hp' ? 200 : 130;
                return `<div class="stat-row"><span>${RS.STAT_LABEL[k]}</span><div class="bar"><i style="width:${Math.min(100, (cs[k] / max) * 100)}%;--sc:${SC[k]}"></i></div><b>${cs[k]} <small>base ${sp.stats[k]}</small></b></div>`;
            }).join('');
            const ul = $('dexSkills');
            ul.innerHTML = '';
            sp.skills.forEach(([id, l]) => {
                const s = RS.SKILLS[id];
                const eff = s.effect
                    ? s.effect[1] === 'status'
                        ? ` ${s.effect[3]}% ${s.effect[2]}`
                        : ` ${s.effect[3]}% ${s.effect[2][0]} ${s.effect[2][1] > 0 ? '+' : ''}${s.effect[2][1]}`
                    : '';
                const li = el(
                    'li',
                    '',
                    `<i class="skill-el" style="--ec:${EC[s.element]}"></i><div><span class="sn">${s.name}</span> <small>${cap(s.category)}${s.power ? ' · PWR ' + s.power : ''} · ACC ${s.accuracy}${eff}<br>${s.description}</small></div><span class="lv">LV ${l}</span>`
                );
                if (l > lv) li.style.opacity = 0.4;
                ul.appendChild(li);
            });
        };
        function select(id) {
            sp = RS.SPECIES_BY_ID[id];
            Object.keys(cards).forEach((k) => cards[k].classList.toggle('on', k === id));
            if (view) st.remove(view);
            view = st.add(new RS.PetView(id, 6.5), 0, 0);
            view.fx('happy', 0.7);
            st.setTheme(EC[sp.element]);
            $('dexName').textContent = sp.name;
            $('dexTags').innerHTML = elTag(sp.element) + rarTag(sp.rarity);
            $('dexDesc').textContent = sp.description;
            draw();
        }
        $('dexLevel').addEventListener('input', draw);
        select('fire_001');
    })();

    /* ---------- ELEMENT CHART ---------- */
    (() => {
        const chart = $('chart');
        const E = RS.ELEMENTS;
        let sel = 'fire';
        chart.appendChild(el('div', 'corner', 'ATK ▼<br>DEF ▶'));
        E.forEach((d) => {
            const h = el('div', 'hd top', `<i style="--c:${EC[d]}" title="${d}"></i>`);
            h.onclick = () => ((sel = d), paint());
            chart.appendChild(h);
        });
        const cells = [];
        E.forEach((a) => {
            const h = el('div', 'hd', `<i style="--c:${EC[a]}" title="${a}"></i>`);
            h.onclick = () => ((sel = a), paint());
            chart.appendChild(h);
            E.forEach((d) => {
                const v = RS.effectiveness(a, d);
                const c = el('div', 'cell' + (v === 2 ? ' x2' : v === 0.5 ? ' x05' : v === 0 ? ' x0' : ''), v === 2 ? '2×' : v === 0.5 ? '½×' : v === 0 ? '0' : '');
                c.title = `${a} → ${d}: ×${v}`;
                c.onclick = () => ((sel = a), paint());
                c.dataset.a = a;
                c.dataset.d = d;
                cells.push(c);
                chart.appendChild(c);
            });
        });
        const mini = (e, v) => `<span class="mu-mini"><i style="--c:${EC[e]}"></i>${cap(e)}${v ? `<em>${v}</em>` : ''}</span>`;
        function paint() {
            cells.forEach((c) => {
                c.classList.toggle('sel', c.dataset.a === sel);
                c.classList.toggle('dimc', c.dataset.a !== sel);
            });
            const list = (fn) => E.filter(fn).map((e) => mini(e)).join('') || '<span class="fine">none</span>';
            const spl = RS.SPECIES.filter((s) => s.element === sel);
            $('chartSide').innerHTML = `<h4>${cap(sel)} <small>click a row to switch</small></h4><div class="mu">
                <div class="mu-row"><span>ATTACKING — 2× against</span>${list((d) => RS.effectiveness(sel, d) === 2)}</div>
                <div class="mu-row"><span>ATTACKING — ½× against</span>${list((d) => RS.effectiveness(sel, d) === 0.5)}</div>
                <div class="mu-row"><span>ATTACKING — no effect on</span>${list((d) => RS.effectiveness(sel, d) === 0)}</div>
                <div class="mu-row"><span>DEFENDING — weak to</span>${list((a) => RS.effectiveness(a, sel) === 2)}</div>
                <div class="mu-row"><span>DEFENDING — resists</span>${list((a) => RS.effectiveness(a, sel) === 0.5)}</div>
                <div class="mu-row"><span>DEFENDING — immune to</span>${list((a) => RS.effectiveness(a, sel) === 0)}</div>
                <div class="mu-row"><span>${spl.length} SPECIES</span><div id="muSp" style="display:flex;gap:6px;flex-wrap:wrap"></div></div></div>`;
            const box = $('muSp');
            spl.forEach((s) => {
                const i = thumb(s.id);
                i.style.width = i.style.height = '44px';
                i.title = s.name;
                box.appendChild(i);
            });
        }
        paint();
    })();

    /* ---------- GACHA ---------- */
    (() => {
        const st = new RS.Stage($('gachaCanvas'), { cam: [8, 6, 14], look: [0, 3.4, 0], platformR: 5, pixel: 3, spin: 0, fitW: 10, fitH: 9.5 });
        st.setTheme('#7a6cff');
        const S = { coins: 0, pity: 0, first: true, owned: new Set(), busy: false };
        const grid = $('collGrid');
        const slots = {};
        RS.SPECIES.forEach((s) => {
            const g = el('div', 'cg');
            g.style.setProperty('--rc', RC[s.rarity]);
            g.appendChild(thumb(s.id));
            g.title = s.name + ' (' + s.rarity + ')';
            slots[s.id] = g;
            grid.appendChild(g);
        });
        const paint = () => {
            $('coins').textContent = S.coins;
            const pity = S.pity;
            $('pityVal').textContent = Math.min(pity, 30);
            $('pityBar').style.width = Math.min(100, (pity / 30) * 100) + '%';
            $('rollCost').textContent = S.first ? 'FREE' : '50';
            $('collCount').textContent = S.owned.size + ' / 20';
            S.owned.forEach((id) => slots[id].classList.add('have'));
        };
        // mirrors draw_gacha_rarity from the server
        const draw = (pity) => {
            if (pity >= 89) return rnd(100) < 10 ? 'legendary' : 'epic';
            if (pity >= 29) return rnd(15) < 3 ? 'legendary' : 'epic';
            const r = rnd(100);
            return r < 60 ? 'common' : r < 85 ? 'rare' : r < 97 ? 'epic' : 'legendary';
        };
        let egg = null, shown = null;
        const msg = (t) => ($('gachaMsg').innerHTML = t);
        $('rollBtn').onclick = async () => {
            if (S.busy) return;
            if (S.owned.size >= 15) return say('409 pet_limit_reached — max 15 pets per user');
            if (!S.first && S.coins < 50) return say('402 not_enough_pet_coins — try "+500 demo coins"');
            S.busy = true;
            $('rollBtn').disabled = true;
            const rarity = draw(S.pity);
            const pool = RS.SPECIES.filter((s) => s.rarity === rarity);
            const sp = pool[rnd(pool.length)];
            if (!S.first) S.coins -= 50;
            const wasFirst = S.first;
            S.first = false;
            if (shown) (st.remove(shown), (shown = null));
            if (egg) st.remove(egg);
            egg = st.add(new RS.PetView('egg_' + rarity, 6), 0, 0);
            egg.fx('shake', 1.4);
            msg('The egg is shaking…');
            await sleep(1500);
            st.remove(egg);
            egg = null;
            const box = document.querySelector('.gacha-stage');
            box.style.setProperty('--fc', RC[rarity]);
            box.classList.remove('flash');
            void box.offsetWidth;
            box.classList.add('flash');
            const dup = S.owned.has(sp.id);
            S.pity = rarity === 'epic' || rarity === 'legendary' ? 0 : S.pity + 1;
            shown = st.add(new RS.PetView(sp.id, 6.5), 0, 0);
            shown.faceY = 0.5;
            shown.fx('happy', 0.9);
            st.setTheme(RC[rarity]);
            if (dup) {
                S.coins += 10;
                msg(`<b style="color:${RC[rarity]}">${rarity.toUpperCase()}</b> ${sp.name} — already owned, converted to <b>10 Pet Coins</b>. <code>pet: null</code>`);
            } else {
                S.owned.add(sp.id);
                msg(`<b style="color:${RC[rarity]}">${rarity.toUpperCase()}</b> ${sp.name} joined your team! ${wasFirst ? '<em>(free starter roll)</em>' : ''}`);
            }
            document.querySelectorAll('.odds-row').forEach((r) => r.classList.toggle('hit', r.dataset.r === rarity));
            const hit = document.querySelector(`.odds-row[data-r="${rarity}"]`);
            hit.classList.remove('hit');
            void hit.offsetWidth;
            hit.classList.add('hit');
            paint();
            S.busy = false;
            $('rollBtn').disabled = false;
        };
        document.querySelectorAll('.odds-row').forEach((r) => r.style.setProperty('--rc', RC[r.dataset.r]));
        $('topupBtn').onclick = () => ((S.coins += 500), paint());
        paint();
        // a resting egg to start
        egg = st.add(new RS.PetView('egg_common', 6), 0, 0);
    })();

    /* ---------- CARE ---------- */
    const care = (() => {
        const st = new RS.Stage($('careCanvas'), { cam: [7, 5.5, 12], look: [0, 3, 0], platformR: 4, pixel: 3, spin: 0.25, fitW: 9, fitH: 8.5 });
        const ACTIONS = [
            { id: 'feed', ic: '🍖', cd: 0, en: 0, d: 'Hunger +25, Health +5, Energy +5' },
            { id: 'play', ic: '🎾', cd: 5, en: 15, d: 'Happiness +20, Hunger −10, Energy −15, XP +10' },
            { id: 'sleep', ic: '💤', cd: 0, en: 0, d: 'Energy +(30 + level×2), Health +5, Hunger −5' },
            { id: 'groom', ic: '🛁', cd: 10, en: 0, d: 'Cleanliness → 100, Happiness +10, XP +5' },
            { id: 'train', ic: '💪', cd: 10, en: 20, d: 'Energy −20, Happiness +5, Hunger −10, XP +20' },
            { id: 'heal', ic: '💊', cd: 0, en: 10, d: 'Health +30, Energy −10. Only if Health < 90' },
            { id: 'explore', ic: '🧭', cd: 15, en: 25, d: 'Energy −25, XP +15–25, random event' },
        ];
        const NEEDS = [
            ['hunger', 'HUNGER', '#ff9a3d'],
            ['happiness', 'HAPPY', '#ff6b9d'],
            ['energy', 'ENERGY', '#ffd83d'],
            ['health', 'HEALTH', '#5bd15b'],
            ['cleanliness', 'CLEAN', '#6ad0ff'],
        ];
        const P = { sp: null, level: 1, xp: 70, daily: 0, hunger: 62, happiness: 48, energy: 70, health: 78, cleanliness: 35, last: {}, lastAny: -999 };
        let view = null;
        const now = () => performance.now() / 1000; // 1 s = 1 demo minute
        const sel = $('carePick');
        RS.SPECIES.forEach((s) => sel.appendChild(new Option(`${s.name} (${s.element})`, s.id)));
        const setPet = (id) => {
            P.sp = RS.SPECIES_BY_ID[id];
            if (view) st.remove(view);
            view = st.add(new RS.PetView(id, 6), 0, 0);
            st.setTheme(EC[P.sp.element]);
        };
        sel.onchange = () => setPet(sel.value);
        sel.value = 'ice_002';
        setPet('ice_002');

        const maxE = () => 100 + P.level * 2;
        const cl = (v, hi) => Math.max(0, Math.min(hi === undefined ? 100 : hi, v));
        const mood = () => {
            const { health: h, hunger: hu, energy: e, happiness: ha, cleanliness: c } = P;
            if (h < 20) return 'critical';
            if (h < 40) return 'sick';
            if (hu < 20) return 'starving';
            if (hu < 40) return 'hungry';
            if (e < 20) return 'exhausted';
            if (ha < 20) return 'depressed';
            if (ha < 40) return 'sad';
            if (c < 30) return 'filthy';
            if (hu > 80 && ha > 80 && e > 80 && h > 80) return 'ecstatic';
            if (ha > 70 && e > 50) return 'happy';
            if (e < 40) return 'sleepy';
            return 'content';
        };
        const MOOD_COL = { critical: '#ff5a5a', sick: '#ff5a5a', starving: '#ff9a3d', hungry: '#ff9a3d', exhausted: '#ffd83d', depressed: '#8a86f0', sad: '#8a86f0', filthy: '#b8a060', ecstatic: '#ff6b9d', happy: '#5bd15b', sleepy: '#a9b8ff', content: '#eceaff' };
        // mirrors ensure_interaction_allowed + need_for from the server
        const blocker = (a) => {
            const t = now();
            if (t - P.lastAny < 2) return { code: 'global_interaction_cooldown', rem: 2 - (t - P.lastAny) };
            const def = ACTIONS.find((x) => x.id === a);
            if (def.cd && P.last[a] && t - P.last[a] < def.cd) return { code: a + '_cooldown', rem: def.cd - (t - P.last[a]) };
            if (def.en && P.energy < def.en) return { code: 'not_enough_energy', rem: 0 };
            if (['play', 'groom', 'train', 'explore'].includes(a) && P.daily >= 300) return { code: 'daily_experience_limit_reached', rem: 0 };
            if (a === 'heal' && P.health >= 90) return { code: 'already_healthy', rem: 0 };
            return null;
        };
        const need = (a, hasCare) => {
            const { hunger: hu, energy: e, happiness: ha, cleanliness: c, health: h } = P;
            if (a === 'heal') return h < 40 ? [100, `Health is ${Math.floor(h)} (below 40).`] : h < 70 ? [60, `Health is ${Math.floor(h)} (below 70).`] : null;
            if (a === 'feed') return hu < 20 ? [90, `Hunger is ${Math.floor(hu)} (below 20).`] : hu < 40 ? [70, `Hunger is ${Math.floor(hu)} (below 40).`] : null;
            if (a === 'sleep') return e < 20 ? [85, `Energy is ${Math.floor(e)} (below 20).`] : e < 40 ? [50, `Energy is ${Math.floor(e)} (below 40).`] : null;
            if (a === 'play') return ha < 30 ? [65, `Happiness is ${Math.floor(ha)} (below 30).`] : ha < 50 ? [35, `Happiness is ${Math.floor(ha)} (below 50).`] : null;
            if (a === 'groom') return c < 40 ? [40, `Cleanliness is ${Math.floor(c)} (below 40).`] : null;
            if (a === 'train' && !hasCare && e >= 60) return [20, 'Care needs are met and the pet has spare energy to train.'];
            if (a === 'explore' && !hasCare && e >= 60) return [15, 'Care needs are met and the pet has spare energy to explore.'];
            return null;
        };
        const plan = () => {
            const care = ['feed', 'play', 'sleep', 'groom', 'heal'];
            const hasCare = care.some((a) => need(a, false));
            const list = ACTIONS.map((d) => {
                const b = blocker(d.id);
                const n = need(d.id, hasCare);
                const rec = !b && !!n;
                return { action: d.id, available: !b, recommended: rec, urgency: rec ? n[0] : -1, reason: n ? n[1] : null, blocked: b, wait: n && b && b.rem > 0 ? b.rem : null };
            });
            const wait = list.filter((x) => x.wait).map((x) => x.wait);
            const sorted = list.slice().sort((a, b) => b.urgency - a.urgency);
            let p = 0;
            sorted.forEach((x) => (x.priority = x.recommended ? ++p : null));
            return { list: sorted, wait: wait.length ? Math.min(...wait) : null };
        };

        const actBox = $('careActions');
        const btns = {};
        ACTIONS.forEach((a) => {
            const b = el('button', 'act', `<span class="ic">${a.ic}</span>${a.id.toUpperCase()}<span class="cd"></span>`);
            b.onmouseenter = () => ($('careLog').textContent = `POST /pets/{id}/${a.id} — ${a.d}` + (a.cd ? ` (cooldown ${a.cd}m)` : ''));
            b.onclick = () => act(a.id);
            btns[a.id] = b;
            actBox.appendChild(b);
        });
        const needBox = $('careNeeds');
        const nrows = {};
        NEEDS.forEach(([k, label, col]) => {
            const r = el('div', 'need', `<span>${label}</span><div class="bar"><i></i></div><b></b>`);
            r.style.setProperty('--nc', col);
            nrows[k] = r;
            needBox.appendChild(r);
        });

        function gainXp(x) {
            const g = Math.min(x, 300 - P.daily);
            if (g <= 0) return 0;
            P.daily += g;
            P.xp += g;
            let lv = false;
            while (P.xp >= P.level * 100) {
                P.xp -= P.level * 100;
                P.level++;
                lv = true;
            }
            if (lv) {
                view.fx('spin', 0.9);
                const learned = P.sp.skills.filter(([, l]) => l === P.level).map(([id]) => RS.SKILLS[id].name);
                say(`LEVEL UP → ${P.level}` + (learned.length ? ` · learned ${learned.join(', ')}` : ''));
            }
            return g;
        }
        function act(a) {
            const b = blocker(a);
            if (b) {
                $('careLog').innerHTML = `<b style="color:var(--bad)">429/409 ${b.code}</b>${b.rem ? ` — retry in ${Math.ceil(b.rem)} demo min` : ''}`;
                return;
            }
            const t = now();
            P.lastAny = t;
            P.last[a] = t;
            let xp = 0, m = '';
            switch (a) {
                case 'feed': P.hunger = cl(P.hunger + 25); P.health = cl(P.health + 5); P.energy = cl(P.energy + 5, maxE()); m = 'Nom nom.'; view.fx('eat', 0.8); break;
                case 'play': P.happiness = cl(P.happiness + 20); P.hunger = cl(P.hunger - 10); P.energy = cl(P.energy - 15, maxE()); xp = 10; m = 'Zoomies!'; view.fx('happy', 0.9); break;
                case 'sleep': P.energy = cl(P.energy + 30 + P.level * 2, maxE()); P.health = cl(P.health + 5); P.hunger = cl(P.hunger - 5); m = 'Zzz…'; P.sleepUntil = t + 2.5; break;
                case 'groom': P.cleanliness = 100; P.happiness = cl(P.happiness + 10); xp = 5; m = 'Squeaky clean.'; view.fx('spin', 0.9); break;
                case 'train': P.happiness = cl(P.happiness + 5); P.hunger = cl(P.hunger - 10); P.energy = cl(P.energy - 20, maxE()); xp = 20; m = 'Hup hup!'; view.fx('train', 1); break;
                case 'heal': P.health = cl(P.health + 30); P.energy = cl(P.energy - 10, maxE()); m = 'Feeling better.'; view.fx('happy', 0.7); break;
                case 'explore': {
                    P.energy = cl(P.energy - 25, maxE());
                    xp = 15 + rnd(11);
                    const ev = ['found a shiny pebble', 'chased a butterfly', 'met a friendly stranger', 'stumbled into a puddle'][rnd(4)];
                    if (ev.includes('puddle')) P.cleanliness = cl(P.cleanliness - 20);
                    m = `Explored and ${ev}.`;
                    view.fx('explore', 1.4);
                    break;
                }
            }
            const g = xp ? gainXp(xp) : 0;
            $('careLog').innerHTML = `<b>${a.toUpperCase()}</b> ✓ ${m}${xp ? ` <em style="color:var(--accent)">+${g} XP</em>` : ''}`;
            render();
        }

        let lastT = now();
        function tick() {
            const t = now(), dt = t - lastT;
            lastT = t;
            // the real server decays per hour; the demo runs ~5x faster than 1 s = 1 min
            const k = dt * (5 / 60);
            const asleep = P.sleepUntil && t < P.sleepUntil;
            view.sleeping = !!asleep;
            P.hunger = cl(P.hunger - 3 * k);
            P.happiness = cl(P.happiness - 2 * k);
            P.cleanliness = cl(P.cleanliness - 2 * k);
            P.energy = cl(P.energy + 10 * k * (asleep ? 3 : 1), maxE());
            const neglect = (P.hunger < 30) + (P.happiness < 20) + (P.cleanliness < 20);
            if (neglect) P.health = cl(P.health - neglect * 2 * k);
            render();
        }
        setInterval(tick, 250);

        function render() {
            NEEDS.forEach(([k]) => {
                const v = P[k], mx = k === 'energy' ? maxE() : 100;
                const r = nrows[k];
                r.querySelector('i').style.width = (v / mx) * 100 + '%';
                r.querySelector('b').textContent = Math.floor(v);
                r.classList.toggle('low', v < 25);
            });
            const md = mood();
            $('careMood').textContent = md.toUpperCase();
            $('careMood').style.color = MOOD_COL[md];
            $('careLv').textContent = P.level;
            $('careXp').textContent = `${P.xp} / ${P.level * 100} XP · daily ${P.daily}/300`;
            $('careXpBar').style.width = (P.xp / (P.level * 100)) * 100 + '%';
            const pl = plan();
            const sug = pl.list[0].recommended ? pl.list[0].action : null;
            ACTIONS.forEach((a) => {
                const x = pl.list.find((y) => y.action === a.id);
                const b = btns[a.id];
                b.classList.toggle('blocked', !x.available);
                b.classList.toggle('rec', x.recommended && x.priority === 1);
                b.querySelector('.cd').textContent = x.blocked && x.blocked.rem ? Math.ceil(x.blocked.rem) + 'm' : '';
            });
            $('nextSugg').innerHTML =
                `<span class="k">"mood"</span>: "${md}",<br><span class="k">"suggested_action"</span>: ${sug ? `<b>"${sug}"</b>` : 'null'},<br>` +
                `<span class="k">"next_available_in_seconds"</span>: ${sug || pl.wait === null ? 'null' : Math.ceil(pl.wait * 60)},<br>` +
                `<span class="k">"daily_experience_remaining"</span>: ${300 - P.daily}`;
            $('nextList').innerHTML = pl.list
                .map(
                    (x) =>
                        `<li class="${x.recommended ? '' : 'na'} ${x.available ? '' : 'blocked'}"><span class="pr">${x.priority || '–'}</span><span class="an">${x.action}</span><span class="rs">${x.reason || (x.blocked ? x.blocked.code : 'not needed right now')}</span><span class="st">${x.available ? 'available' : x.blocked.rem ? Math.ceil(x.blocked.rem) + 'm' : 'blocked'}</span></li>`
                )
                .join('');
            const bb = P.energy < 30 ? { code: 'battle_not_enough_energy' } : P.health < 50 ? { code: 'battle_not_healthy_enough' } : null;
            $('nextBattle').innerHTML = `<span class="k">"battle"</span>: { "ready": ${bb ? '<b class="no">false</b>' : '<b class="ok">true</b>'}${bb ? `, "blocked_by": "${bb.code}"` : ''} }`;
        }
        render();
        return { P };
    })();

    /* ---------- BATTLE ---------- */
    (() => {
        const st = new RS.Stage($('battleCanvas'), { cam: [0, 6.5, 19], look: [0, 2.6, 0], platformR: 8, pixel: 3, spin: 0, fitW: 22, fitH: 11, fov: 26 });
        st.setTheme('#5a4cc0');
        const selA = $('bA'), selB = $('bB');
        RS.SPECIES.forEach((s) => {
            selA.appendChild(new Option(`${s.name} (${s.element})`, s.id));
            selB.appendChild(new Option(`${s.name} (${s.element})`, s.id));
        });
        selA.value = 'fire_005';
        selB.value = 'water_003';
        const lvA = $('bAL'), lvB = $('bBL');
        const log = $('battleLog');
        const addLog = (t, c) => {
            const p = el('p', c || '', t);
            log.appendChild(p);
            log.scrollTop = log.scrollHeight;
        };

        const STAT_LABEL = { attack: 'Attack', defense: 'Defense', spatk: 'Sp.Atk', spdef: 'Sp.Def', speed: 'Speed' };
        const mkPet = (id, level) => {
            const sp = RS.SPECIES_BY_ID[id];
            const stats = RS.calcStats(sp.stats, level, 15);
            const learned = sp.skills.filter(([, l]) => l <= level).map(([s]) => RS.SKILLS[s]);
            return { sp, level, stats, hp: stats.hp, max: stats.hp, status: null, stages: { attack: 0, defense: 0, spatk: 0, spdef: 0, speed: 0 }, skills: learned.slice(0, 4), skillsAll: learned };
        };
        const stageMul = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
        const eff = (p, k) => {
            let v = p.stats[k] * stageMul(p.stages[k] || 0);
            if (p.status === 'burn' && (k === 'attack' || k === 'spatk')) v *= 0.7;
            if (p.status === 'paralysis' && k === 'speed') v *= 0.5;
            return Math.max(1, v);
        };
        const typeMul = (skill, target) => RS.effectiveness(skill.element, target.sp.element);
        const stab = (a, skill) => (skill.element === a.sp.element ? 1.5 : 1);
        const baseDmg = (a, t, skill) => {
            const phys = skill.category === 'physical';
            const off = eff(a, phys ? 'attack' : 'spatk'), def = eff(t, phys ? 'defense' : 'spdef');
            return ((2 * a.level / 5 + 2) * skill.power * (off / def)) / 50 + 2;
        };
        // mirrors battle_ai.rs: expected damage plus a rough value for secondary effects
        const aiScore = (a, t, skill) => {
            if (skill.category === 'status') {
                const [, kind, v] = skill.effect || [];
                if (kind === 'stage' && a.stages[v[0]] < 2) return 12 + (a.hp / a.max) * 8;
                return 0;
            }
            let s = baseDmg(a, t, skill) * typeMul(skill, t) * stab(a, skill) * (skill.accuracy / 100);
            if (skill.effect && !t.status && skill.effect[1] === 'status') s += (skill.effect[3] / 100) * 6;
            return s;
        };
        const aiPick = (a, t) => a.skills.reduce((b, s) => (aiScore(a, t, s) > aiScore(a, t, b) ? s : b), a.skills[0]);

        let S = null; // battle state
        let vA = null, vB = null, busy = false;
        const hudHtml = (p) => {
            const stg = Object.entries(p.stages).filter(([, v]) => v).map(([k, v]) => `<span class="st-badge stage">${STAT_LABEL[k].slice(0, 3).toUpperCase()} ${v > 0 ? '+' : ''}${v}</span>`).join('');
            const sb = p.status ? `<span class="st-badge st-${p.status}">${p.status.toUpperCase()}</span>` : '';
            const pct = (p.hp / p.max) * 100;
            return `<div class="nm"><span>${p.sp.name}</span><span>LV${p.level}</span></div><div class="hp"><div class="bar"><i style="width:${pct}%;background:${pct > 50 ? '#5bd15b' : pct > 20 ? '#ffd83d' : '#ff5a5a'}"></i></div><small>${p.hp}/${p.max}</small></div><div class="sts">${sb}${stg}</div>`;
        };
        const hud = () => {
            if (!S) return;
            $('hudA').innerHTML = hudHtml(S.a);
            $('hudB').innerHTML = hudHtml(S.b);
        };
        const floaty = (side, text, cls) => {
            const f = el('div', 'floaty ' + (cls || ''), text);
            f.style.left = (side === 'a' ? 30 : 70) + '%';
            f.style.top = '42%';
            $('floatLayer').appendChild(f);
            setTimeout(() => f.remove(), 1000);
        };
        const banner = (t, col) => {
            const b = $('banner');
            b.textContent = t;
            b.style.color = col || '#fff';
            b.classList.remove('show');
            void b.offsetWidth;
            b.classList.add('show');
        };

        const newBattle = () => {
            if (busy) return;
            S = { a: mkPet(selA.value, +lvA.value), b: mkPet(selB.value, +lvB.value), turn: 0, done: false, winner: null };
            st.clear();
            vA = st.add(new RS.PetView(S.a.sp.id, 6), -5.5, 0);
            vB = st.add(new RS.PetView(S.b.sp.id, 6), 5.5, 0);
            vA.faceY = Math.PI / 2;
            vB.faceY = -Math.PI / 2;
            log.innerHTML = '';
            const gap = Math.abs(S.a.level - S.b.level);
            if (gap > 15) {
                addLog(`409 level_difference_too_high — level gap ${gap} > 15. The server would refuse this battle.`, 'win');
            }
            addLog(`POST /battles → ${S.a.sp.name} (Lv${S.a.level}) vs ${S.b.sp.name} (Lv${S.b.level})`);
            addLog(`Stats A: ${RS.STAT_KEYS.map((k) => RS.STAT_LABEL[k] + ' ' + S.a.stats[k]).join(' · ')}`);
            addLog(`Stats B: ${RS.STAT_KEYS.map((k) => RS.STAT_LABEL[k] + ' ' + S.b.stats[k]).join(' · ')}`);
            $('bAuto').disabled = false;
            hud();
            moves();
        };

        function moves() {
            const box = $('moves');
            box.innerHTML = '';
            if (!S || S.done) {
                box.innerHTML = '<div class="hint">' + (S ? 'Battle over — start a new one.' : 'Pick two pets, then press New battle.') + '</div>';
                return;
            }
            S.a.skills.forEach((sk) => {
                const m = typeMul(sk, S.b);
                const eLabel = sk.category === 'status' ? '' : m === 2 ? '<span class="eff" style="color:#5bd15b">2×</span>' : m === 0.5 ? '<span class="eff" style="color:#ff9a7a">½×</span>' : m === 0 ? '<span class="eff" style="color:#ff5a5a">0×</span>' : '';
                const b = el('button', 'move', `${eLabel}${sk.name}<small>${cap(sk.category)}${sk.power ? ' · PWR ' + sk.power : ''} · ACC ${sk.accuracy}</small>`);
                b.style.setProperty('--ec', EC[sk.element]);
                b.disabled = busy;
                b.title = sk.description;
                b.onclick = () => playTurn(sk);
                box.appendChild(b);
            });
        }

        // one attacker's action; returns after animating
        async function act(side, skill) {
            const me = S[side], foe = S[side === 'a' ? 'b' : 'a'];
            const mv = side === 'a' ? vA : vB, fv = side === 'a' ? vB : vA;
            const fs = side === 'a' ? 'b' : 'a';
            if (me.hp <= 0) return;
            if (me.status === 'freeze') {
                if (rnd(100) < 20) { me.status = null; addLog(`${me.sp.name} thawed out!`); }
                else { addLog(`${me.sp.name} is frozen solid and can't move.`); floaty(side, 'FROZEN', 'miss'); return; }
            }
            if (me.status === 'paralysis' && rnd(100) < 25) {
                addLog(`${me.sp.name} is paralyzed and can't move!`);
                floaty(side, 'PARALYZED', 'miss');
                return;
            }
            addLog(`${me.sp.name} used <b>${skill.name}</b>.`);
            mv.fx('attack', 0.55);
            await sleep(280);
            if (rnd(100) >= skill.accuracy) {
                addLog('…but it missed!');
                floaty(fs, 'MISS', 'miss');
                return;
            }
            if (skill.category === 'status') {
                applyEffect(side, side, skill);
                mv.fx('happy', 0.5);
                hud();
                return;
            }
            const m = typeMul(skill, foe);
            const crit = rnd(10000) < 625;
            let dmg = 0;
            if (m > 0) dmg = Math.floor(baseDmg(me, foe, skill) * m * stab(me, skill) * ((85 + rnd(16)) / 100) * (crit ? 1.5 : 1));
            if (m > 0) dmg = Math.max(1, dmg);
            foe.hp = Math.max(0, foe.hp - dmg);
            fv.fx('hurt', 0.5);
            floaty(fs, m === 0 ? 'NO EFFECT' : '-' + dmg, crit ? 'crit' : m === 0 ? 'miss' : '');
            if (m > 1) floaty(fs, 'SUPER EFFECTIVE', 'eff');
            addLog(`  ${foe.sp.name} took <b>${dmg}</b> damage${crit ? ' (critical!)' : ''}${m === 2 ? ' — super effective' : m === 0.5 ? " — not very effective" : m === 0 ? ' — no effect' : ''}.`);
            if (skill.effect && foe.hp > 0 && rnd(100) < skill.effect[3]) applyEffect(side, fs, skill);
            if (foe.hp <= 0) fv.setFaint(true);
            hud();
        }
        function applyEffect(from, to, skill) {
            const [, kind, val] = skill.effect;
            const t = S[to];
            if (kind === 'status') {
                if (t.status) return;
                t.status = val;
                addLog(`  ${t.sp.name} was inflicted with <b>${val}</b>!`);
                floaty(to, val.toUpperCase(), 'eff');
            } else {
                const [k, d] = val;
                const cur = t.stages[k];
                const nx = Math.max(-6, Math.min(6, cur + d));
                if (nx === cur) return;
                t.stages[k] = nx;
                addLog(`  ${t.sp.name}'s ${STAT_LABEL[k]} ${d > 0 ? 'rose' : 'fell'}!`);
                floaty(to, `${STAT_LABEL[k].toUpperCase()} ${d > 0 ? '▲' : '▼'}`, 'eff');
            }
        }

        async function endOfTurn() {
            for (const side of ['a', 'b']) {
                const p = S[side];
                if (p.hp <= 0 || !p.status) continue;
                const pct = p.status === 'poison' ? 0.06 : p.status === 'burn' ? 0.03 : 0;
                if (!pct) continue;
                const d = Math.max(1, Math.floor(p.max * pct));
                p.hp = Math.max(0, p.hp - d);
                (side === 'a' ? vA : vB).fx('hurt', 0.4);
                floaty(side, '-' + d, 'miss');
                addLog(`${p.sp.name} is hurt by ${p.status} (${d}).`);
                if (p.hp <= 0) (side === 'a' ? vA : vB).setFaint(true);
            }
            hud();
        }

        const history = [];
        async function playTurn(chosen) {
            if (!S || S.done || busy) return;
            busy = true;
            $('bAuto').disabled = true;
            moves();
            S.turn++;
            addLog(`— Turn ${S.turn} —`, 'turn');
            const sa = chosen || aiPick(S.a, S.b), sb = aiPick(S.b, S.a);
            const sa_ = eff(S.a, 'speed'), sb_ = eff(S.b, 'speed');
            const order = sa_ > sb_ ? ['a', 'b'] : sb_ > sa_ ? ['b', 'a'] : rnd(2) ? ['a', 'b'] : ['b', 'a'];
            for (const side of order) {
                if (S.a.hp <= 0 || S.b.hp <= 0) break;
                await act(side, side === 'a' ? sa : sb);
                await sleep(420);
            }
            if (S.a.hp > 0 && S.b.hp > 0) await endOfTurn();
            else await endOfTurn();
            await sleep(250);
            let stop = null;
            if (S.a.hp <= 0 && S.b.hp <= 0) stop = 'stalemate';
            else if (S.a.hp <= 0 || S.b.hp <= 0) stop = 'finished';
            if (stop) finish(stop);
            busy = false;
            if (!S.done) {
                $('bAuto').disabled = false;
                moves();
            }
            return stop;
        }

        function finish(reason) {
            S.done = true;
            $('bAuto').disabled = true;
            if (reason === 'stalemate') {
                addLog('Both pets fainted — stalemate (no winner).', 'win');
                banner('DRAW', '#a9a4d8');
                moves();
                return;
            }
            const w = S.a.hp > 0 ? 'a' : 'b';
            const W = S[w], L = S[w === 'a' ? 'b' : 'a'];
            S.winner = w;
            addLog(`${W.sp.name} wins! <code>state.winner_pet_id</code> set · stop_reason "finished"`, 'win');
            addLog(`Rewards: winner +${50 + L.level * 2} XP, +5 coins · loser +${10 + W.level} XP, +1 coin`, 'win');
            banner(w === 'a' ? 'YOU WIN!' : 'YOU LOSE', w === 'a' ? '#ffcf3d' : '#ff6b6b');
            (w === 'a' ? vA : vB).fx('happy', 1.4);
            record(S);
            moves();
        }

        $('bStart').onclick = newBattle;
        $('bAuto').onclick = async () => {
            if (!S || S.done || busy) return;
            $('bAuto').disabled = true;
            addLog('POST /battles/{id}/auto — the server picks every move.', 'turn');
            let played = 0;
            while (!S.done && played < 100) {
                busy = false;
                await playTurn(null);
                played++;
            }
            addLog(`{ "turns_played": ${played}, "stop_reason": "${S.winner ? 'finished' : 'stalemate'}" }`, 'win');
        };
        [['bAL', 'bALv'], ['bBL', 'bBLv']].forEach(([a, b]) => ($(a).oninput = () => ($(b).textContent = $(a).value)));
        selA.onchange = selB.onchange = () => { if (!busy) { S = null; $('bAuto').disabled = true; moves(); } };

        /* ---------- records ---------- */
        const stats = {};
        function record(s) {
            const key = (p) => p.sp.id + ':' + p.level;
            const w = s.winner === 'a' ? s.a : s.b, l = s.winner === 'a' ? s.b : s.a;
            [[w, l, 'win'], [l, w, 'loss']].forEach(([p, o, r]) => {
                const k = key(p);
                const e = (stats[k] = stats[k] || { p, wins: 0, losses: 0 });
                e[r === 'win' ? 'wins' : 'losses']++;
            });
            history.unshift({ a: s.a, b: s.b, winner: s.winner, turns: s.turn });
            renderRecords();
        }
        function renderRecords() {
            const hl = $('histList');
            hl.innerHTML = '';
            history.slice(0, 8).forEach((h) => {
                const W = h.winner === 'a' ? h.a : h.b, L = h.winner === 'a' ? h.b : h.a;
                const li = el('li', '');
                li.appendChild(thumb(W.sp.id));
                li.appendChild(el('span', '', `<b>${W.sp.name}</b> <small>Lv${W.level}</small> beat <b>${L.sp.name}</b> <small>Lv${L.level} · ${h.turns} turns</small>`));
                li.appendChild(el('span', 'rr win', 'WIN'));
                hl.appendChild(li);
            });
            const rows = Object.values(stats)
                .map((e) => ({ ...e, fin: e.wins + e.losses, rate: e.wins / (e.wins + e.losses) }))
                .sort((x, y) => y.rate - x.rate || y.fin - x.fin || y.p.level - x.p.level);
            const bl = $('boardList');
            bl.innerHTML = '';
            rows.slice(0, 8).forEach((r, i) => {
                const li = el('li', '');
                li.appendChild(el('span', 'rk', '#' + (i + 1)));
                li.appendChild(thumb(r.p.sp.id));
                li.appendChild(el('span', '', `<b>${r.p.sp.name}</b> <small>Lv${r.p.level} · ${r.wins}W ${r.losses}L</small>`));
                li.appendChild(el('span', 'rr ' + (r.rate >= 0.5 ? 'win' : 'loss'), Math.round(r.rate * 100) + '%'));
                bl.appendChild(li);
            });
        }
        newBattle();
    })();

    /* ---------- API ---------- */
    (() => {
        const G = [
            ['Users', [
                ['POST', '/users', 'Create a user — always first'],
                ['GET', '/users', 'List users'],
                ['GET', '/users/{id}', 'Get one user'],
                ['PATCH', '/users/{id}', 'Rename'],
                ['DELETE', '/users/{id}', 'Delete; their pets become strays'],
            ]],
            ['Pets', [
                ['POST', '/pets/gacha', 'The only way to get a pet'],
                ['GET', '/pets', 'List all pets'],
                ['GET', '/pets/strays', 'Pets without an owner'],
                ['GET', '/pets/leaderboard', 'Ranked by level and XP'],
                ['GET', '/pets/{id}', 'Get one pet'],
                ['GET', '/pets/{id}/status', 'Mood, battle stats, species trait'],
                ['POST', '/pets/{id}/adopt', 'Adopt a stray'],
                ['POST', '/pets/{id}/transfer', 'Give to another user'],
                ['PATCH', '/pets/{id}/rename', 'Rename'],
                ['DELETE', '/pets/{id}', 'Release'],
            ]],
            ['Care', [
                ['GET', '/pets/{id}/next-actions', 'What to do now, with cooldowns', true],
                ['POST', '/pets/{id}/feed', 'Hunger +25'],
                ['POST', '/pets/{id}/play', 'Happiness +20, XP +10'],
                ['POST', '/pets/{id}/sleep', 'Restore energy'],
                ['POST', '/pets/{id}/groom', 'Cleanliness to 100'],
                ['POST', '/pets/{id}/train', 'XP +20'],
                ['POST', '/pets/{id}/heal', 'Health +30'],
                ['POST', '/pets/{id}/explore', 'Random event, XP +15–25'],
            ]],
            ['Skills', [
                ['GET', '/pets/{id}/skills', 'Learned and equipped skills'],
                ['PATCH', '/pets/{id}/skills/equipment', 'Equip 1–4 learned skills'],
            ]],
            ['Battles', [
                ['POST', '/battles', 'Create a 1v1 battle'],
                ['GET', '/battles/{id}', 'State and turn log'],
                ['POST', '/battles/{id}/turn', 'Resolve one turn with your picks'],
                ['POST', '/battles/{id}/auto', 'Server plays the whole battle', true],
                ['GET', '/pets/{id}/battles', 'Win/loss record and history', true],
                ['GET', '/battles/leaderboard', 'Win-rate ranking', true],
            ]],
        ];
        const tabs = $('apiTabs'), list = $('apiList');
        const show = (i) => {
            [...tabs.children].forEach((b, j) => b.classList.toggle('on', i === j));
            list.innerHTML = G[i][1]
                .map(([m, p, d, n]) => `<div class="ep${n ? ' new' : ''}"><span class="m ${m}">${m}</span><div><code>${p}</code><small>${d}</small></div></div>`)
                .join('');
        };
        G.forEach(([n, l], i) => {
            const b = el('button', 'chip', `${n.toUpperCase()} <small>${l.length}</small>`);
            b.onclick = () => show(i);
            tabs.appendChild(b);
        });
        show(2);
    })();

    /* ---------- end CTA ---------- */
    (() => {
        const st = new RS.Stage($('endCanvas'), { cam: [0, 4.5, 15], look: [0, 3, 0], platformR: 0, pixel: 3, spin: 0, fitW: 15, fitH: 8 });
        ['fire_007', 'water_003', 'grass_005', 'electric_001'].forEach((id, i) => {
            const v = st.add(new RS.PetView(id, 5), -5.4 + i * 3.6, 0);
            v.faceY = 0.15 * (i - 1.5);
            v.phase = i * 1.3;
        });
        let t = 0;
        setInterval(() => {
            st.pets[t++ % st.pets.length].fx('happy', 0.7);
        }, 900);
    })();
});
