/* Voxel pet models + a tiny three.js stage.
   Models face +z, x is mirrored around 0, y is up. One cell = 1 voxel. */
(function () {
    const RS = (window.RS = window.RS || {});
    const K = (x, y, z) => x + ',' + y + ',' + z;

    class Model {
        constructor() {
            this.v = new Map();
            this.piv = {};
            this.anim = {};
        }
        set(x, y, z, c, p, mir) {
            this.v.set(K(x, y, z), { x, y, z, c, p: p || 'body' });
            if (mir) this.v.set(K(-x - 1, y, z), { x: -x - 1, y, z, c, p: p || 'body' });
        }
        box(x0, y0, z0, x1, y1, z1, c, p, mir) {
            for (let x = x0; x <= x1; x++)
                for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, c, p, mir);
        }
        ell(cx, cy, cz, rx, ry, rz, c, p, mir) {
            for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
                for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
                    for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
                        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
                        if (dx * dx + dy * dy + dz * dz <= 1) this.set(x, y, z, c, p, mir);
                    }
        }
        front(x, y) {
            let best = null;
            for (const q of this.v.values()) if (q.x === x && q.y === y && (best === null || q.z > best)) best = q.z;
            return best;
        }
        top(x, z) {
            let best = null;
            for (const q of this.v.values()) if (q.x === x && q.z === z && (best === null || q.y > best)) best = q.y;
            return best;
        }
        // Eyes sit on whatever surface is in front at that height.
        eyes(y, c, x, p) {
            x = x === undefined ? 1 : x;
            const z = this.front(x, y);
            if (z !== null) this.set(x, y, z, c || '#1b1b2f', p || 'head', true);
        }
        pivot(name, x, y, z) {
            this.piv[name] = [x, y, z];
        }
        // Wing slab on both sides. Right side uses the given cells, left is mirrored.
        wing(x0, y0, z0, x1, y1, z1, c, hinge) {
            this.box(x0, y0, z0, x1, y1, z1, c, 'wingR');
            this.box(-x1 - 1, y0, z0, -x0 - 1, y1, z1, c, 'wingL');
            const hy = hinge === undefined ? y1 + 1 : hinge;
            this.pivot('wingR', x0, hy, (z0 + z1 + 1) / 2);
            this.pivot('wingL', -x0, hy, (z0 + z1 + 1) / 2);
        }
    }

    // Deterministic pseudo random for speckles.
    const hash = (a, b, c) => {
        let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
        h = (h ^ (h >>> 13)) * 1274126177;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    };

    /* ---------- archetypes ---------- */

    function quad(m, o) {
        const leg = o.leg || 3, H = o.h || 3, L = o.len || 5, W = o.w || 4;
        const by = leg + H; // body centre y
        m.box(1, 0, L - 3, 3, leg, L - 2, o.d, 'body', true);
        m.box(1, 0, -L + 2, 3, leg, -L + 3, o.d, 'body', true);
        m.ell(0, by, 0, W, H, L, o.c);
        m.ell(0, by - H * 0.55, 0.5, W - 1, H * 0.55, L - 1.5, o.b);
        m.ell(0, by, 0, W - 0.6, H, L - 0.3, o.c);
        // belly stripe stays visible at the sides only near the bottom
        const hw = o.hw || 3.4, hh = o.hh || 3, hd = o.hd || 3;
        const hy = by + H - 0.5, hz = L - 1;
        m.ell(0, hy, hz, hw, hh, hd, o.c, 'head');
        m.pivot('head', 0, by, hz - 1);
        if (o.snout) {
            const f = Math.round(hz + hd);
            m.box(-1, hy - 2, f - 2, 0, hy - 1, f + o.snout - 1, o.b, 'head');
            m.set(0, hy - 1, f + o.snout - 1, '#2a2233', 'head', true);
        }
        m.eyes(Math.round(hy), o.eye);
        // tail root
        m.pivot('tail', 0, by, -L + 1);
        return { by, hy, hz, hw, hh, hd, L, H, W };
    }

    function bird(m, o) {
        const by = o.by || 6;
        m.box(1, 0, 0, 1, 2, 0, o.d, 'body', true);
        m.box(1, 0, 0, 2, 0, 1, o.d, 'body', true);
        m.ell(0, by, 0, o.w || 4, o.bh || 4, o.bd || 4, o.c);
        m.ell(0, by - 1.5, 1, (o.w || 4) - 1, (o.bh || 4) - 1.5, (o.bd || 4) - 1, o.b);
        const hy = by + (o.bh || 4) + 1;
        m.ell(0, hy, 2, o.hw || 3.2, o.hh || 3, o.hd || 3, o.c, 'head');
        m.pivot('head', 0, by + 2, 1);
        const f = m.front(0, Math.round(hy));
        m.box(-1, Math.round(hy) - 1, f, 0, Math.round(hy) - 1, f + 1, o.beak || '#ffc23c', 'head');
        if (o.hook) m.set(-1, Math.round(hy) - 2, f + 1, o.beak || '#ffc23c', 'head', true);
        m.eyes(Math.round(hy) + 1, '#1b1b2f');
        m.pivot('tail', 0, by - 1, -3);
        return { by, hy };
    }

    function dragon(m, o) {
        const by = 6;
        m.box(1, 0, 1, 3, 3, 2, o.d, 'body', true);
        m.box(1, 0, -4, 3, 3, -3, o.d, 'body', true);
        m.ell(0, by, 0, 4, 3.5, 7, o.c);
        m.ell(0, by - 2, 0.5, 3.4, 2, 6, o.b);
        m.ell(0, by, 0, 3.6, 3.4, 7, o.c);
        // neck + head
        m.ell(0, by + 3, 6, 2.2, 3, 2.5, o.c, 'head');
        m.ell(0, by + 4.5, 8.5, 2.8, 2.2, 3, o.c, 'head');
        m.box(-1, by + 2, 10, 0, by + 3, 12, o.b, 'head');
        m.pivot('head', 0, by + 1, 5);
        const ey = Math.round(by + 5);
        m.eyes(ey, o.eye || '#7ff4ff');
        // horns
        m.box(1, by + 7, 7, 1, by + 8, 7, o.horn || '#f2ead2', 'head', true);
        m.box(1, by + 8, 6, 1, by + 9, 6, o.horn || '#f2ead2', 'head', true);
        // back fin ridge
        for (let z = -6; z <= 4; z += 2) m.set(0, Math.round(by + 3.5 - Math.abs(z) * 0.05), z, o.fin || o.d, 'body', true);
        // tail
        m.box(0, by - 1, -9, 1, by + 1, -7, o.c, 'tail');
        m.box(0, by, -12, 1, by + 1, -10, o.c, 'tail');
        m.box(0, by + 1, -14, 1, by + 2, -13, o.fin || o.d, 'tail');
        m.pivot('tail', 0, by, -7);
        return { by };
    }

    function shellTurtle(m, o) {
        m.box(2, 0, 2, 4, 2, 4, o.skin, 'body', true);
        m.box(2, 0, -4, 4, 2, -2, o.skin, 'body', true);
        m.ell(0, 3, 0, 5.5, 2.2, 6, o.skin);
        m.ell(0, 5.5, -0.5, 5.2, 3.6, 5.8, o.shell);
        // scute lines
        for (let i = -4; i <= 4; i += 2) m.box(i, 8, -2, i, 8, 2, o.line, 'body');
        m.ell(0, 5.5, -0.5, 5.3, 3.7, 5.9, o.shell);
        m.ell(0, 5, 7, 2.6, 2.4, 2.6, o.skin, 'head');
        m.pivot('head', 0, 4, 5);
        m.eyes(5, '#1b1b2f');
        m.pivot('tail', 0, 3, -6);
        m.box(0, 2, -8, 0, 2, -7, o.skin, 'tail');
    }

    /* ---------- species ---------- */

    const B = {};

    B.fire_001 = (m) => {
        const q = quad(m, { c: '#ff8a3d', b: '#ffe0a8', d: '#d35a22', hw: 3.6, hh: 3.2, hd: 3 });
        const ey = Math.round(q.hy) + 3;
        m.box(1, ey, q.hz - 1, 2, ey + 1, q.hz, '#ff8a3d', 'head', true);
        m.set(1, ey + 2, q.hz - 1, '#ff8a3d', 'head', true);
        m.set(1, ey + 1, q.hz, '#ffe0a8', 'head', true);
        m.box(1, q.by + 3, -3, 1, q.by + 3, 2, '#c94d1c', 'body', true);
        m.box(0, q.by - 1, -7, 0, q.by, -6, '#ff8a3d', 'tail');
        m.box(0, q.by, -9, 0, q.by + 3, -8, '#ff8a3d', 'tail');
        m.box(0, q.by + 3, -9, 0, q.by + 5, -9, '#ffd23c', 'tail');
        m.set(0, q.by + 6, -9, '#ff4d2e', 'tail');
        m.set(0, q.by + 5, -10, '#ff4d2e', 'tail');
        m.set(0, Math.round(q.hy) - 1, q.hz + 3, '#2a2233', 'head');
    };

    B.fire_005 = (m) => {
        const q = quad(m, { c: '#5b3a34', b: '#7a4b3d', d: '#2f1d1c', len: 6, w: 4.6, h: 3.6, hw: 3.8, hh: 3.4, hd: 3.4, snout: 3, eye: '#ffb02e' });
        for (const q2 of [...m.v.values()]) {
            if (q2.c === '#5b3a34' && q2.p === 'body' && hash(q2.x, q2.y, q2.z) < 0.09) q2.c = '#ff7a1a';
        }
        for (let z = -4; z <= 3; z += 1) {
            const h = 1 + ((z + 8) % 3);
            m.box(0, q.by + q.H, z, 0, q.by + q.H + h - 1, z, h > 2 ? '#ffd23c' : '#ff7a1a', 'body', true);
        }
        m.box(3, q.hy + 1, q.hz - 1, 4, q.hy + 1, q.hz - 1, '#2f1d1c', 'head', true);
        m.box(3, q.hy - 2, q.hz - 1, 4, q.hy, q.hz, '#2f1d1c', 'head', true);
        m.pivot('tail', 0, q.by, -q.L + 1);
        m.box(0, q.by - 1, -9, 0, q.by, -7, '#5b3a34', 'tail');
        m.box(0, q.by, -10, 0, q.by + 2, -10, '#ff7a1a', 'tail');
    };

    B.fire_007 = (m) => {
        const q = bird(m, { c: '#ffb02e', b: '#ffe08a', d: '#ff7a1a', beak: '#ff7a1a', w: 4, bh: 3.6, bd: 4 });
        m.wing(4, 5, -2, 5, 9, 2, '#ff7a1a');
        m.box(4, 5, -2, 5, 6, 2, '#ffd23c', 'wingR');
        m.box(-6, 5, -2, -5, 6, 2, '#ffd23c', 'wingL');
        const cy = Math.round(q.hy);
        m.box(0, cy + 3, 1, 0, cy + 5, 1, '#ff4d2e', 'head');
        m.box(0, cy + 3, 2, 0, cy + 4, 2, '#ffd23c', 'head');
        m.set(0, cy + 6, 1, '#ffd23c', 'head');
        m.box(-1, cy + 3, 0, -1, cy + 4, 0, '#ff7a1a', 'head');
        m.box(0, 4, -5, 0, 7, -5, '#ff4d2e', 'tail');
        m.box(-2, 3, -6, -2, 6, -6, '#ff7a1a', 'tail');
        m.box(1, 3, -6, 1, 6, -6, '#ff7a1a', 'tail');
        m.box(0, 2, -7, 0, 5, -7, '#ffd23c', 'tail');
        m.anim.wing = 0.5;
    };

    B.water_001 = (m) => {
        const q = quad(m, { c: '#5db0ff', b: '#d6efff', d: '#3b86d6', len: 4, w: 3.4, h: 2.8, leg: 2, hw: 3.4, hh: 3.2, hd: 3 });
        const ey = Math.round(q.hy) + 3;
        m.ell(3.2, ey, q.hz - 1, 2.2, 2.2, 1, '#5db0ff', 'head', true);
        m.ell(3.2, ey, q.hz, 1.3, 1.3, 1, '#d6efff', 'head', true);
        m.set(0, ey + 1, q.hz - 1, '#3d9bff', 'head');
        m.box(0, ey + 2, q.hz - 1, 0, ey + 3, q.hz - 1, '#8cd0ff', 'head');
        m.set(0, ey + 4, q.hz - 1, '#d6efff', 'head');
        m.set(0, Math.round(q.hy) - 1, q.hz + 3, '#ff8fa8', 'head');
        m.box(0, q.by - 1, -5, 0, q.by - 1, -8, '#d6efff', 'tail');
        m.ell(0.5, q.by - 1, -9, 1.2, 1.2, 1.2, '#8cd0ff', 'tail');
        m.pivot('tail', 0, q.by - 1, -4);
    };

    B.water_003 = (m) => {
        shellTurtle(m, { skin: '#4f9ee8', shell: '#cdeeff', line: '#ffffff' });
        for (let i = -3; i <= 3; i += 3) m.box(i, 9, -1, i, 10, -1, '#ffffff', 'body');
        m.box(-1, 8, -3, 0, 9, -3, '#8ee8ff', 'body');
        m.box(-1, 8, 2, 0, 9, 2, '#8ee8ff', 'body');
        m.set(0, 10, 2, '#ffffff', 'body');
    };

    B.water_005 = (m) => {
        dragon(m, { c: '#23479a', b: '#79b7ff', d: '#162f6b', fin: '#3d9bff', eye: '#7ff4ff', horn: '#bfe3ff' });
        m.wing(4, 8, -3, 7, 12, 1, '#3d9bff', 8);
        m.box(4, 8, -3, 4, 8, 1, '#79b7ff', 'wingR');
        m.box(-5, 8, -3, -5, 8, 1, '#79b7ff', 'wingL');
        m.anim.wing = 0.3;
        for (let i = 0; i < 6; i++) m.set(((i * 7) % 5) - 2, 3 + ((i * 5) % 9), -2 + ((i * 3) % 6), '#79b7ff', 'body');
    };

    B.grass_001 = (m) => {
        const q = quad(m, { c: '#6bd45a', b: '#e6f7c8', d: '#3f9a3c', len: 4, w: 3.4, h: 2.8, leg: 3, hw: 3.2, hh: 3, hd: 3 });
        const ey = Math.round(q.hy) + 2;
        for (let h = 0; h < 7; h++) {
            const c = h % 3 === 2 ? '#9be56b' : '#4fbf4a';
            m.box(1, ey + h, q.hz - 2 - Math.floor(h / 3), 2, ey + h, q.hz - 1 - Math.floor(h / 3), c, 'head', true);
        }
        m.set(1, ey + 7, q.hz - 4, '#c9f28c', 'head', true);
        m.ell(0, q.by, -q.L - 0.5, 1.6, 1.6, 1.6, '#ffffff', 'tail');
        m.pivot('tail', 0, q.by, -q.L);
        m.set(0, Math.round(q.hy) - 1, q.hz + 3, '#ff8fa8', 'head');
        m.box(3, q.by, 1, 4, q.by, 3, '#2f7f2e', 'body', true);
    };

    B.grass_004 = (m) => {
        shellTurtle(m, { skin: '#a5b96a', shell: '#4f8f3a', line: '#2f6a2a' });
        m.box(0, 9, -1, 0, 12, -1, '#7a4b2a', 'body');
        m.ell(0, 14, -1, 3, 2.4, 3, '#4fbf4a', 'body');
        m.ell(0.5, 15, -1, 2, 1.6, 2, '#7ee06a', 'body');
        m.set(2, 13, 1, '#ff6b8a', 'body', true);
        m.box(3, 8, 1, 4, 8, 2, '#7ee06a', 'body', true);
    };

    B.grass_005 = (m) => {
        m.box(1, 0, 0, 2, 1, 1, '#7a4b2a', 'body', true);
        m.box(1, 0, -2, 2, 1, -1, '#7a4b2a', 'body', true);
        m.ell(0, 5, 0, 3, 4, 3, '#3fa13c');
        m.ell(0, 4, 1, 2.4, 3, 2.4, '#6bd45a');
        m.box(-1, 2, 3, 0, 2, 3, '#3f7a34', 'body');
        // leaf arms
        m.box(3, 5, 0, 6, 5, 1, '#4fbf4a', 'wingR');
        m.box(4, 6, 0, 7, 6, 1, '#7ee06a', 'wingR');
        m.box(-7, 5, 0, -4, 5, 1, '#4fbf4a', 'wingL');
        m.box(-8, 6, 0, -5, 6, 1, '#7ee06a', 'wingL');
        m.pivot('wingR', 3, 5, 0);
        m.pivot('wingL', -3, 5, 0);
        // thorns
        for (const [x, y, z] of [[3, 3, -1], [3, 7, 1], [1, 9, -2], [2, 4, 3], [3, 6, -2]]) m.set(x, y, z, '#22662a', 'body', true);
        // flower head
        m.ell(0, 11, 0.5, 2.6, 2.6, 1.2, '#ff7fb0', 'head');
        m.ell(0, 11, 0.5, 4.2, 4.2, 1, '#ff9fc6', 'head');
        m.ell(0, 11, 0.5, 4.2, 4.2, 1, '#ff9fc6', 'head');
        for (const [x, y] of [[0, 15], [-1, 15], [0, 6], [-1, 6], [4, 10], [4, 11], [-5, 10], [-5, 11]]) m.set(x, y, 0, '#ff7fb0', 'head');
        m.ell(0, 11, 1.5, 2, 2, 1, '#ffd23c', 'head');
        m.pivot('head', 0, 8, 0);
        m.set(1, 11, 2, '#1b1b2f', 'head', true);
    };

    B.electric_001 = (m) => {
        m.box(1, 0, 1, 2, 0, 2, '#d99a2a', 'body', true);
        m.box(1, 0, -2, 2, 0, -1, '#d99a2a', 'body', true);
        m.ell(0, 5, 0, 5, 4.6, 4.8, '#ffd83d');
        m.ell(0, 3.5, 1.5, 3.8, 3, 3.6, '#fff2b0');
        m.ell(0, 5, 0, 5, 4.6, 4.8, '#ffd83d');
        m.ell(0, 5, 0.5, 4.8, 3.2, 4.4, '#ffd83d');
        m.ell(0, 3, 1.5, 3.4, 2.4, 3.6, '#fff2b0');
        m.ell(3.6, 9, 0, 1.4, 1.4, 1, '#ffd83d', 'head', true);
        m.pivot('head', 0, 5, 0);
        m.eyes(6, '#1b1b2f', 2);
        const f = m.front(0, 4);
        m.set(0, 4, f, '#c46a2a', 'head');
        m.box(3, 4, f - 3, 4, 5, f - 2, '#ff6a3d', 'head', true);
        // lightning zigzag on back
        for (const [x, y, z] of [[0, 9, -3], [0, 8, -4], [-1, 7, -4], [0, 6, -5], [0, 5, -5]]) m.set(x, y, z, '#a5622a', 'body');
        m.set(0, 4, -5, '#a5622a', 'tail');
        m.pivot('tail', 0, 4, -5);
    };

    B.electric_002 = (m) => {
        const q = quad(m, { c: '#ffc933', b: '#fff6d0', d: '#8a5a1e', len: 5, w: 3.4, h: 2.8, leg: 3, hw: 3.4, hh: 2.8, hd: 3, snout: 2, eye: '#2a6bff' });
        const ey = Math.round(q.hy) + 3;
        m.box(1, ey, q.hz - 2, 2, ey + 3, q.hz - 1, '#ffc933', 'head', true);
        m.box(1, ey + 3, q.hz - 2, 1, ey + 4, q.hz - 1, '#3b2a1e', 'head', true);
        m.box(1, ey, q.hz, 1, ey + 2, q.hz, '#3b2a1e', 'head', true);
        m.ell(0, q.by - 0.5, -q.L - 3, 2.2, 2.6, 4, '#ffc933', 'tail');
        m.box(0, q.by + 2, -q.L - 6, 0, q.by + 3, -q.L - 5, '#fff6d0', 'tail');
        m.set(0, q.by + 4, -q.L - 4, '#3b2a1e', 'tail');
        m.set(-1, q.by + 3, -q.L - 5, '#3b2a1e', 'tail');
        m.pivot('tail', 0, q.by, -q.L + 1);
        m.box(0, q.by + 2, q.L - 3, 0, q.by + 2, q.L - 3, '#fff6d0', 'body');
    };

    B.electric_003 = (m) => {
        const steel = '#8e97ab', dark = '#5b6478', light = '#b9c1d3';
        m.box(1, 0, -1, 3, 3, 2, dark, 'body', true);
        m.box(-3, 4, -3, 3, 10, 3, steel);
        m.box(-3, 10, -3, 3, 10, 3, light);
        m.box(-2, 6, 4, 1, 8, 4, '#5b6478');
        m.box(-3, 11, -2, 2, 15, 3, steel, 'head');
        m.box(-3, 15, -2, 2, 15, 3, light, 'head');
        m.box(-2, 13, 4, 1, 13, 4, '#ffd83d', 'head');
        m.pivot('head', 0, 11, 0);
        // magnet arms: red/blue horseshoe tips
        m.box(4, 6, -1, 5, 10, 2, dark, 'wingR');
        m.box(4, 11, -1, 5, 12, 2, '#e04a4a', 'wingR');
        m.box(6, 9, -1, 6, 12, 2, '#e04a4a', 'wingR');
        m.box(4, 3, -1, 5, 5, 2, '#4a7be0', 'wingR');
        m.box(6, 3, -1, 6, 5, 2, '#4a7be0', 'wingR');
        m.box(-6, 6, -1, -5, 10, 2, dark, 'wingL');
        m.box(-6, 11, -1, -5, 12, 2, '#4a7be0', 'wingL');
        m.box(-7, 9, -1, -7, 12, 2, '#4a7be0', 'wingL');
        m.box(-6, 3, -1, -5, 5, 2, '#e04a4a', 'wingL');
        m.box(-7, 3, -1, -7, 5, 2, '#e04a4a', 'wingL');
        m.pivot('wingR', 4, 10, 0);
        m.pivot('wingL', -4, 10, 0);
        m.set(0, 8, 4, '#ffd83d');
        m.anim.wing = 0.12;
    };

    B.electric_005 = (m) => {
        const q = bird(m, { c: '#3c4a78', b: '#ffe85a', d: '#c9a227', beak: '#ffb02e', w: 3.8, bh: 3.8, bd: 4.2, hook: true, hh: 3, hw: 3 });
        m.wing(4, 7, -3, 12, 8, 3, '#3c4a78', 8);
        m.box(4, 7, -3, 12, 7, -2, '#ffe85a', 'wingR');
        m.box(4, 8, 0, 9, 8, 0, '#ffe85a', 'wingR');
        m.box(-13, 7, -3, -5, 7, -2, '#ffe85a', 'wingL');
        m.box(-10, 8, 0, -5, 8, 0, '#ffe85a', 'wingL');
        m.box(0, 3, -5, 0, 8, -7, '#ffe85a', 'tail');
        m.box(-2, 3, -6, -1, 8, -7, '#3c4a78', 'tail');
        m.box(1, 3, -6, 2, 8, -7, '#3c4a78', 'tail');
        const cy = Math.round(q.hy);
        m.box(0, cy + 3, 0, 0, cy + 5, 1, '#ffe85a', 'head');
        m.set(-1, cy + 3, 0, '#ffe85a', 'head');
        m.anim.wing = 0.45;
    };

    B.ice_002 = (m) => {
        const q = quad(m, { c: '#dff4ff', b: '#ffffff', d: '#7fc4e8', len: 5.5, w: 3.8, h: 3.2, leg: 3, hw: 3.4, hh: 3, hd: 3, snout: 3, eye: '#2a8bd8' });
        const ey = Math.round(q.hy) + 3;
        m.box(1, ey, q.hz - 1, 2, ey + 2, q.hz, '#dff4ff', 'head', true);
        m.set(1, ey + 3, q.hz - 1, '#8ee8ff', 'head', true);
        for (let z = -4; z <= 4; z += 2) m.box(0, q.by + q.H, z, 0, q.by + q.H + 1 + (z % 4 === 0 ? 1 : 0), z, '#8ee8ff', 'body', true);
        m.ell(0, q.by, -q.L - 2, 2, 2.2, 3.4, '#dff4ff', 'tail');
        m.box(0, q.by, -q.L - 5, 0, q.by + 1, -q.L - 5, '#8ee8ff', 'tail');
        m.pivot('tail', 0, q.by, -q.L + 1);
    };

    B.ice_005 = (m) => {
        m.ell(0, 6, 0, 4.2, 6, 4, '#e8f7ff');
        m.ell(0, 3, 0, 5, 3.4, 4.6, '#cfe9fa');
        m.ell(0, 2, 0, 5.5, 2.6, 5, '#cfe9fa');
        // ragged hem
        for (let x = -6; x <= 5; x++) for (let z = -5; z <= 5; z++) {
            if ((x + z) % 3 === 0 && m.v.has(K(x, 0, z))) m.v.delete(K(x, 0, z));
        }
        m.ell(0, 11.5, 0, 3.8, 3.6, 3.6, '#f6fdff', 'head');
        m.ell(0, 11.5, 0.6, 3.2, 3, 3.4, '#4b7fa8', 'head');
        m.pivot('head', 0, 9, 0);
        m.eyes(11, '#8ef3ff', 1);
        m.eyes(11, '#8ef3ff', 1);
        // snowflake crown
        m.box(0, 15, 0, 0, 17, 0, '#8ee8ff', 'head');
        m.box(-1, 16, 0, 1, 16, 0, '#8ee8ff', 'head');
        m.set(0, 18, 0, '#ffffff', 'head');
        // arms
        m.box(4, 5, 0, 6, 8, 1, '#e8f7ff', 'wingR');
        m.box(-7, 5, 0, -5, 8, 1, '#e8f7ff', 'wingL');
        m.pivot('wingR', 4, 8, 0);
        m.pivot('wingL', -4, 8, 0);
        m.anim.wing = 0.3;
        m.anim.float = 2;
    };

    B.ground_002 = (m) => {
        const q = quad(m, { c: '#a06d3c', b: '#d2a26a', d: '#6f4622', len: 5, w: 5, h: 3.8, leg: 3, hw: 4, hh: 3.4, hd: 3.4, snout: 2, eye: '#1b1b2f' });
        const ey = Math.round(q.hy) + 3;
        m.ell(3.2, ey, q.hz - 1, 1.6, 1.6, 1.2, '#a06d3c', 'head', true);
        m.ell(3.2, ey, q.hz, 0.9, 0.9, 1, '#d2a26a', 'head', true);
        // rocky shoulders
        m.ell(3.6, q.by + q.H, q.L - 3, 1.8, 1.6, 1.8, '#8c8a86', 'body', true);
        m.ell(3.6, q.by + q.H + 1, q.L - 3, 1, 1, 1, '#b5b2ac', 'body', true);
        m.box(1, 0, q.L - 3, 2, 0, q.L - 2, '#f2ead2', 'body', true);
        m.box(0, q.by - 1, -q.L - 1, 0, q.by, -q.L, '#a06d3c', 'tail');
        m.pivot('tail', 0, q.by, -q.L + 1);
    };

    B.ground_003 = (m) => {
        const sand = '#dbb26a', dark = '#a5773a', red = '#b8402a';
        for (const z of [-3, 0, 3]) {
            m.box(4, 0, z, 6, 0, z, dark, 'body', true);
            m.box(3, 1, z, 4, 1, z, dark, 'body', true);
        }
        m.ell(0, 3, 0, 4.4, 2, 5, sand);
        m.ell(0, 4, 0.5, 3.4, 1.4, 4, '#f0d08a');
        for (let z = -4; z <= 4; z += 2) m.box(-3, 5, z, 3, 5, z, dark, 'body');
        m.ell(0, 3.5, 5.5, 2.6, 1.8, 2, sand, 'head');
        m.pivot('head', 0, 3, 4);
        m.eyes(4, '#1b1b2f', 1);
        // claws
        m.box(4, 3, 6, 5, 4, 8, sand, 'wingR');
        m.box(5, 3, 9, 6, 4, 10, dark, 'wingR');
        m.box(3, 3, 9, 4, 4, 10, dark, 'wingR');
        m.box(-6, 3, 6, -5, 4, 8, sand, 'wingL');
        m.box(-7, 3, 9, -6, 4, 10, dark, 'wingL');
        m.box(-5, 3, 9, -4, 4, 10, dark, 'wingL');
        m.pivot('wingR', 3, 3, 5);
        m.pivot('wingL', -3, 3, 5);
        m.anim.wing = 0.18;
        // tail arching over the body
        m.box(0, 3, -6, 1, 4, -5, sand, 'tail');
        m.box(0, 5, -8, 1, 7, -7, sand, 'tail');
        m.box(0, 8, -7, 1, 10, -6, sand, 'tail');
        m.box(0, 10, -5, 1, 11, -3, sand, 'tail');
        m.box(0, 9, -2, 1, 10, -1, red, 'tail');
        m.set(0, 8, -1, red, 'tail');
        m.pivot('tail', 0, 3, -5);
    };

    B.flying_001 = (m) => {
        const q = bird(m, { c: '#8fc4ff', b: '#f4fbff', d: '#f0b040', beak: '#ffc23c', w: 3.4, bh: 3.2, bd: 3.6, hw: 3, hh: 2.8, hd: 2.8 });
        m.wing(3, 5, -2, 4, 8, 2, '#6aa8f0');
        m.box(3, 5, -2, 4, 5, 2, '#f4fbff', 'wingR');
        m.box(-5, 5, -2, -4, 5, 2, '#f4fbff', 'wingL');
        m.box(0, 4, -4, 0, 5, -6, '#6aa8f0', 'tail');
        m.box(-1, 4, -5, -1, 5, -7, '#8fc4ff', 'tail');
        m.box(1, 4, -5, 1, 5, -7, '#8fc4ff', 'tail');
        m.set(0, Math.round(q.hy) + 3, 1, '#f4fbff', 'head');
        m.anim.wing = 0.5;
    };

    B.flying_002 = (m) => {
        dragon(m, { c: '#6b5bd6', b: '#c9c2ff', d: '#3d3390', fin: '#ffd83d', eye: '#ffe85a', horn: '#ffe85a' });
        m.wing(4, 8, -6, 12, 9, 2, '#8a86f0', 9);
        m.box(4, 8, -6, 12, 8, -5, '#ffd83d', 'wingR');
        m.box(4, 9, -3, 9, 9, -3, '#a9b8ff', 'wingR');
        m.box(-13, 8, -6, -5, 8, -5, '#ffd83d', 'wingL');
        m.box(-10, 9, -3, -5, 9, -3, '#a9b8ff', 'wingL');
        m.box(4, 10, -1, 8, 10, 1, '#5a4cc0', 'wingR');
        m.box(-9, 10, -1, -5, 10, 1, '#5a4cc0', 'wingL');
        m.anim.wing = 0.4;
    };

    B.normal_001 = (m) => {
        m.box(1, 0, 1, 2, 0, 2, '#7d7b73', 'body', true);
        m.box(1, 0, -2, 2, 0, -1, '#7d7b73', 'body', true);
        m.ell(0, 5, 0, 5, 4.4, 4.6, '#b8b5aa');
        m.ell(0, 3.5, 1.5, 4, 2.8, 3.4, '#d4d1c4');
        m.ell(0, 5, 0, 5, 4.4, 4.6, '#b8b5aa');
        m.ell(0, 3.3, 1.5, 3.4, 2.2, 3.4, '#d4d1c4');
        for (const q of m.v.values()) if (q.c === '#b8b5aa' && hash(q.x, q.y, q.z) < 0.12) q.c = '#8f8c82';
        m.ell(0, 9, -1, 2.4, 0.9, 2, '#6bb857');
        m.set(-2, 9, 1, '#8ed86a');
        m.set(1, 10, -2, '#8ed86a');
        m.pivot('head', 0, 5, 0);
        m.eyes(6, '#1b1b2f', 1, 'body');
        m.eyes(6, '#1b1b2f', 1, 'body');
        const f = m.front(0, 5);
        m.set(0, 5, f, '#7d7b73');
        m.set(-1, 5, f, '#7d7b73');
    };

    RS.VOXEL_BUILDERS = B;

    /* ---------- three.js glue ---------- */

    const cache = {};
    function build(id) {
        if (cache[id]) return cache[id];
        const m = new Model();
        (B[id] || B.normal_001)(m);
        // per-voxel tint noise
        const vox = [...m.v.values()];
        let minY = Infinity, minZ = Infinity, maxZ = -Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
        vox.forEach((q) => {
            minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y + 1);
            minZ = Math.min(minZ, q.z); maxZ = Math.max(maxZ, q.z + 1);
            minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x + 1);
        });
        cache[id] = { m, vox, minY, maxY, minZ, maxZ, minX, maxX };
        return cache[id];
    }

    const boxGeo = () => {
        if (!boxGeo.g) boxGeo.g = new THREE.BoxGeometry(1, 1, 1);
        return boxGeo.g;
    };

    class PetView {
        constructor(id, height) {
            const b = build(id);
            this.id = id;
            this.group = new THREE.Group();
            this.rig = new THREE.Group();
            this.group.add(this.rig);
            this.parts = {};
            this.mats = [];
            const H = b.maxY - b.minY;
            const tall = Math.max(H, (b.maxZ - b.minZ) * 0.8, (b.maxX - b.minX) * 0.5);
            const s = (height || 7) / tall;
            this.scale = s;
            this.group.scale.setScalar(s);
            this.rig.position.set(-(b.minX + b.maxX) / 2, -b.minY, -(b.minZ + b.maxZ) / 2);
            this.height = H * s;
            const byPart = {};
            b.vox.forEach((q) => (byPart[q.p] = byPart[q.p] || []).push(q));
            const tmp = new THREE.Object3D();
            const col = new THREE.Color();
            Object.keys(byPart).forEach((name) => {
                const list = byPart[name];
                const piv = b.m.piv[name] || [0, 0, 0];
                const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
                this.mats.push(mat);
                const mesh = new THREE.InstancedMesh(boxGeo(), mat, list.length);
                list.forEach((q, i) => {
                    tmp.position.set(q.x + 0.5 - piv[0], q.y + 0.5 - piv[1], q.z + 0.5 - piv[2]);
                    tmp.updateMatrix();
                    mesh.setMatrixAt(i, tmp.matrix);
                    col.set(q.c);
                    const j = 1 + (hash(q.x, q.y, q.z) - 0.5) * 0.1;
                    col.multiplyScalar(j);
                    mesh.setColorAt(i, col);
                });
                const g = new THREE.Group();
                g.position.set(piv[0], piv[1], piv[2]);
                g.add(mesh);
                this.rig.add(g);
                this.parts[name] = g;
            });
            this.anim = b.m.anim;
            this.fxName = null;
            this.fxT = 0;
            this.fxDur = 0;
            this.sleeping = false;
            this.fainted = false;
            this.phase = Math.random() * 6;
            this.extraY = 0;
        }
        fx(name, dur) {
            this.fxName = name;
            this.fxT = 0;
            this.fxDur = dur || 0.6;
            if (name === 'hurt') this.mats.forEach((m) => m.emissive.setHex(0xff2222));
        }
        setFaint(v) {
            this.fainted = v;
        }
        update(t, dt) {
            const p = this.parts;
            const a = this.anim;
            const ph = t + this.phase;
            const sl = this.sleeping ? 0.3 : 1;
            let y = Math.sin(ph * 3 * sl) * 0.05 * this.scale * 4 * sl + (a.float ? (a.float + Math.sin(ph * 2) * 0.6) * this.scale : 0);
            let ox = 0, oz = 0, sy = 1, rx = 0, rz = 0;
            if (p.tail) p.tail.rotation.y = Math.sin(ph * 5 * sl) * 0.4;
            if (p.head) p.head.rotation.x = this.sleeping ? 0.5 : Math.sin(ph * 2.2) * 0.06;
            const flap = a.wing !== undefined ? a.wing : 0.1;
            if (p.wingR) p.wingR.rotation.z = -Math.sin(ph * 6 * sl) * flap;
            if (p.wingL) p.wingL.rotation.z = Math.sin(ph * 6 * sl) * flap;
            if (this.sleeping) sy = 0.82 + Math.sin(ph * 1.6) * 0.03;
            if (this.fxName) {
                this.fxT += dt;
                const k = Math.min(1, this.fxT / this.fxDur);
                const n = this.fxName;
                if (n === 'happy') y += Math.abs(Math.sin(k * Math.PI * 3)) * this.height * 0.35;
                else if (n === 'eat') {
                    if (p.head) p.head.rotation.x = Math.sin(k * Math.PI * 6) * 0.35;
                } else if (n === 'train') {
                    y += Math.abs(Math.sin(k * Math.PI * 4)) * this.height * 0.2;
                    sy = 1 + Math.sin(k * Math.PI * 8) * 0.08;
                } else if (n === 'spin') this.extraY = k * Math.PI * 2;
                else if (n === 'attack') {
                    const f = Math.sin(k * Math.PI);
                    oz = f * this.height * 0.9;
                    y += f * this.height * 0.08;
                } else if (n === 'hurt') {
                    ox = Math.sin(k * Math.PI * 10) * this.height * 0.06 * (1 - k);
                    const e = Math.max(0, 1 - k * 1.5) * 0.7;
                    this.mats.forEach((m) => m.emissive.setRGB(e, e * 0.1, e * 0.1));
                } else if (n === 'shake') {
                    ox = Math.sin(k * Math.PI * 16) * this.height * 0.07 * (0.3 + k);
                    y += Math.abs(Math.sin(k * Math.PI * 8)) * this.height * 0.06;
                } else if (n === 'explore') {
                    oz = Math.sin(k * Math.PI * 2) * this.height * 0.5;
                    y += Math.abs(Math.sin(k * Math.PI * 4)) * this.height * 0.12;
                }
                if (k >= 1) {
                    this.fxName = null;
                    this.extraY = 0;
                    this.mats.forEach((m) => m.emissive.setHex(0));
                }
            }
            if (this.fainted) {
                this.group.rotation.z += (Math.PI / 2 - this.group.rotation.z) * Math.min(1, dt * 6);
                y = 0;
            } else {
                this.group.rotation.z += (0 - this.group.rotation.z) * Math.min(1, dt * 8);
            }
            this.rig.scale.y = sy;
            this.group.userData.bobY = y;
            this.group.userData.ox = ox;
            this.group.userData.oz = oz;
        }
    }

    function makePlatform(color, radius, checker) {
        const g = new THREE.Group();
        const c1 = new THREE.Color(color).multiplyScalar(0.55);
        const c2 = new THREE.Color(color).multiplyScalar(0.4);
        const list = [];
        const r = radius;
        for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (x * x + z * z <= r * r + 1) list.push([x, z]);
        const mesh = new THREE.InstancedMesh(boxGeo(), new THREE.MeshLambertMaterial({ color: 0xffffff }), list.length);
        const tmp = new THREE.Object3D();
        list.forEach(([x, z], i) => {
            tmp.position.set(x, -0.5, z);
            tmp.updateMatrix();
            mesh.setMatrixAt(i, tmp.matrix);
            mesh.setColorAt(i, (x + z) & 1 ? c1 : c2);
        });
        g.add(mesh);
        const under = list.filter(([x, z]) => x * x + z * z <= (r - 1) * (r - 1) + 1);
        const m2 = new THREE.InstancedMesh(boxGeo(), new THREE.MeshLambertMaterial({ color: 0x1a1830 }), under.length);
        under.forEach(([x, z], i) => {
            tmp.position.set(x, -1.5, z);
            tmp.updateMatrix();
            m2.setMatrixAt(i, tmp.matrix);
        });
        g.add(m2);
        return g;
    }

    class Stage {
        constructor(canvas, opt) {
            opt = opt || {};
            this.canvas = canvas;
            this.pixel = opt.pixel || 3;
            this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: !!opt.keep });
            this.renderer.setClearColor(0x000000, 0);
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(opt.fov || 28, 1, 0.1, 200);
            const c = opt.cam || [9, 7, 15];
            this.camera.position.set(c[0], c[1], c[2]);
            this.camBase = new THREE.Vector3(c[0], c[1], c[2]);
            this.fitW = opt.fitW || 0;
            this.fitH = opt.fitH || 0;
            this.look = opt.look || [0, 3, 0];
            this.camera.lookAt(this.look[0], this.look[1], this.look[2]);
            this.scene.add(new THREE.HemisphereLight(0xffffff, 0x554466, 0.75));
            const d = new THREE.DirectionalLight(0xffffff, 0.75);
            d.position.set(5, 10, 8);
            this.scene.add(d);
            this.platformR = opt.platformR === undefined ? 5 : opt.platformR;
            this.platform = null;
            this.setTheme(opt.color || '#7a6cff');
            this.pets = [];
            this.spin = opt.spin === undefined ? 0.5 : opt.spin;
            this.rot = 0;
            this.t = 0;
            this.running = false;
            this.visible = true;
            this.onFrame = null;
            this.resize();
            if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(canvas);
            if (window.IntersectionObserver)
                new IntersectionObserver((e) => {
                    this.visible = e[0].isIntersecting;
                }).observe(canvas);
            this.last = performance.now();
            const loop = (now) => {
                requestAnimationFrame(loop);
                if (!this.visible || document.hidden) {
                    this.last = now;
                    return;
                }
                this.frame(now);
            };
            requestAnimationFrame(loop);
        }
        setTheme(color) {
            if (this.platformR <= 0) return;
            if (this.platform) this.scene.remove(this.platform);
            this.platform = makePlatform(color, this.platformR);
            this.scene.add(this.platform);
        }
        resize() {
            const w = this.canvas.clientWidth || 300, h = this.canvas.clientHeight || 300;
            this.renderer.setSize(Math.max(8, Math.round(w / this.pixel)), Math.max(8, Math.round(h / this.pixel)), false);
            this.camera.aspect = w / h;
            if (this.fitW || this.fitH) {
                // pull the camera back until fitW world units fit across the canvas
                const look = new THREE.Vector3(this.look[0], this.look[1], this.look[2]);
                const dir = this.camBase.clone().sub(look);
                const th = Math.tan((this.camera.fov * Math.PI) / 360);
                const need = Math.max(this.fitW / 2 / (th * this.camera.aspect), this.fitH / 2 / th);
                const k = Math.max(1, need / dir.length());
                this.camera.position.copy(look.add(dir.multiplyScalar(k)));
                this.camera.lookAt(this.look[0], this.look[1], this.look[2]);
            }
            this.camera.updateProjectionMatrix();
        }
        add(pv, x, z) {
            pv.baseX = x || 0;
            pv.baseZ = z || 0;
            this.scene.add(pv.group);
            this.pets.push(pv);
            return pv;
        }
        remove(pv) {
            this.scene.remove(pv.group);
            this.pets = this.pets.filter((p) => p !== pv);
        }
        clear() {
            this.pets.slice().forEach((p) => this.remove(p));
        }
        frame(now) {
            const dt = Math.min(0.05, (now - this.last) / 1000);
            this.last = now;
            this.t += dt;
            this.rot += dt * this.spin;
            if (this.onFrame) this.onFrame(dt, this.t);
            this.pets.forEach((p) => {
                p.update(this.t, dt);
                const u = p.group.userData;
                // the offsets are in the pet's own facing direction
                const rot = p.faceY !== undefined ? p.faceY : this.spin ? this.rot : 0;
                p.group.rotation.y = rot + (p.extraY || 0);
                const s = Math.sin(rot), c = Math.cos(rot);
                p.group.position.set(p.baseX + u.oz * s + u.ox * c, u.bobY, p.baseZ + u.oz * c - u.ox * s);
            });
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Render each species once into a data URL for thumbnails.
    RS.thumbnails = function (ids, size) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size || 72;
        const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: true, preserveDrawingBuffer: true });
        r.setClearColor(0, 0);
        r.setSize(cv.width, cv.height, false);
        const sc = new THREE.Scene();
        sc.add(new THREE.HemisphereLight(0xffffff, 0x554466, 0.8));
        const dl = new THREE.DirectionalLight(0xffffff, 0.75);
        dl.position.set(5, 10, 8);
        sc.add(dl);
        const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
        cam.position.set(6, 5.2, 12);
        cam.lookAt(0, 3.1, 0);
        const out = {};
        ids.forEach((id) => {
            const pv = new PetView(id, 6.4);
            pv.group.rotation.y = 0.55;
            sc.add(pv.group);
            r.render(sc, cam);
            out[id] = cv.toDataURL();
            sc.remove(pv.group);
        });
        r.dispose();
        return out;
    };

    RS.PetView = PetView;
    RS.Stage = Stage;
})();
