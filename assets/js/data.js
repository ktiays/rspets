/* Catalog data mirrored from rshell-host (species templates, skills, type chart).
   Base stats order: hp, attack, defense, spatk, spdef, speed. */
(function () {
    const RS = (window.RS = window.RS || {});

    RS.ELEMENTS = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'ground', 'flying'];
    RS.ELEMENT_COLOR = {
        normal: '#c9c2b0',
        fire: '#ff6b3d',
        water: '#3d9bff',
        grass: '#5bd15b',
        electric: '#ffd83d',
        ice: '#8ee8ff',
        ground: '#c48a4a',
        flying: '#a9b8ff',
    };
    RS.RARITIES = ['common', 'rare', 'epic', 'legendary'];
    RS.RARITY_COLOR = {
        common: '#b8c0cc',
        rare: '#4aa3ff',
        epic: '#b66bff',
        legendary: '#ffc23c',
    };
    RS.STAT_KEYS = ['hp', 'attack', 'defense', 'spatk', 'spdef', 'speed'];
    RS.STAT_LABEL = { hp: 'HP', attack: 'ATK', defense: 'DEF', spatk: 'SPA', spdef: 'SPD', speed: 'SPE' };

    // Same table as ElementType::effectiveness; anything not listed is 1.0.
    const OVERRIDES = {
        'fire>water': 0.5, 'fire>grass': 2, 'fire>ice': 2,
        'water>fire': 2, 'water>ground': 2, 'water>grass': 0.5,
        'grass>fire': 0.5, 'grass>water': 2, 'grass>ground': 2, 'grass>flying': 0.5,
        'electric>water': 2, 'electric>flying': 2, 'electric>ground': 0,
        'ice>grass': 2, 'ice>ground': 2, 'ice>flying': 2,
        'ground>fire': 2, 'ground>electric': 2, 'ground>grass': 0.5, 'ground>flying': 0,
        'flying>grass': 2, 'flying>ground': 2, 'flying>electric': 0.5,
    };
    RS.effectiveness = (atk, def) => {
        const v = OVERRIDES[atk + '>' + def];
        return v === undefined ? 1 : v;
    };

    // effect: [target, kind, value, chance]  kind = status | stage
    const S = (id, name, category, element, power, accuracy, effect, description) => ({
        id, name, category, element, power, accuracy, effect, description,
    });
    RS.SKILLS = {};
    [
        S('normal_tackle', 'Tackle', 'physical', 'normal', 40, 100, null, 'A direct physical strike with no secondary effect.'),
        S('normal_guard', 'Guard Stance', 'status', 'normal', 0, 100, ['self', 'stage', ['defense', 1], 100], "Raises the user's defense by one stage."),
        S('fire_ember_claw', 'Ember Claw', 'physical', 'fire', 50, 100, ['opponent', 'status', 'burn', 20], 'A fiery slash that may burn the target.'),
        S('fire_flame_burst', 'Flame Burst', 'special', 'fire', 65, 95, ['opponent', 'status', 'burn', 25], 'A concentrated burst of flame with elevated burn pressure.'),
        S('fire_heat_up', 'Heat Up', 'status', 'fire', 0, 100, ['self', 'stage', ['spatk', 1], 100], "Raises the user's special attack by one stage."),
        S('water_splash_strike', 'Splash Strike', 'physical', 'water', 50, 100, null, 'A forceful water-laced impact.'),
        S('water_tidal_pulse', 'Tidal Pulse', 'special', 'water', 65, 95, ['opponent', 'stage', ['speed', -1], 35], 'A wave pulse that can slow the target.'),
        S('water_mist_barrier', 'Mist Barrier', 'status', 'water', 0, 100, ['self', 'stage', ['spdef', 1], 100], 'Wraps the user in mist to raise special defense.'),
        S('grass_vine_whip', 'Vine Whip', 'physical', 'grass', 55, 100, null, 'A quick lashing strike from sharpened vines.'),
        S('grass_spore_burst', 'Spore Burst', 'special', 'grass', 60, 95, ['opponent', 'status', 'poison', 35], 'A toxic pollen blast that may poison the target.'),
        S('grass_growth_guard', 'Growth Guard', 'status', 'grass', 0, 100, ['self', 'stage', ['defense', 1], 100], 'Thickens protective bark and leaves to raise defense.'),
        S('electric_shock_bite', 'Shock Bite', 'physical', 'electric', 55, 95, ['opponent', 'status', 'paralysis', 25], 'A charged bite that may paralyze the target.'),
        S('electric_volt_bolt', 'Volt Bolt', 'special', 'electric', 70, 90, ['opponent', 'status', 'paralysis', 30], 'A heavy electrical discharge with strong paralysis odds.'),
        S('electric_charge_focus', 'Charge Focus', 'status', 'electric', 0, 100, ['self', 'stage', ['speed', 1], 100], 'Sharpens reflexes and raises speed by one stage.'),
        S('ice_frost_fang', 'Frost Fang', 'physical', 'ice', 55, 100, ['opponent', 'status', 'freeze', 10], 'A chilled bite that can freeze the target.'),
        S('ice_glacier_ray', 'Glacier Ray', 'special', 'ice', 70, 95, ['opponent', 'status', 'freeze', 15], 'A focused beam of cold that may freeze the target solid.'),
        S('ice_cold_shroud', 'Cold Shroud', 'status', 'ice', 0, 100, ['self', 'stage', ['spdef', 1], 100], 'Surrounds the user with cold air and raises special defense.'),
        S('ground_quake_claw', 'Quake Claw', 'physical', 'ground', 70, 100, null, 'A heavy grounded strike that hits with high raw force.'),
        S('ground_sand_spike', 'Sand Spike', 'special', 'ground', 55, 95, ['opponent', 'stage', ['defense', -1], 35], 'A burst of abrasive sand that can lower defense.'),
        S('ground_tectonic_hide', 'Tectonic Hide', 'status', 'ground', 0, 100, ['self', 'stage', ['defense', 1], 100], "Hardens the user's stance with a defensive earth shell."),
        S('flying_gale_slash', 'Gale Slash', 'physical', 'flying', 60, 100, null, 'A swift aerial slice designed to capitalize on speed.'),
        S('flying_sky_burst', 'Sky Burst', 'special', 'flying', 65, 95, null, 'A compressed burst of air from above.'),
        S('flying_tailwind', 'Tailwind Surge', 'status', 'flying', 0, 100, ['self', 'stage', ['speed', 1], 100], 'Calls a favorable wind to raise speed.'),
    ].forEach((s) => (RS.SKILLS[s.id] = s));

    // [id, name, element, rarity, [hp,atk,def,spa,spd,spe], [[skill, level]...], description]
    const P = (id, name, element, rarity, stats, skills, description) => ({
        id, name, element, rarity,
        stats: { hp: stats[0], attack: stats[1], defense: stats[2], spatk: stats[3], spdef: stats[4], speed: stats[5] },
        skills, description,
    });
    RS.SPECIES = [
        P('fire_001', 'Ember Cat', 'fire', 'common', [50, 65, 40, 60, 45, 80],
            [['fire_ember_claw', 1], ['normal_tackle', 1], ['fire_heat_up', 8], ['fire_flame_burst', 12]],
            "A feral cat wrapped in a restless ember tail."),
        P('fire_005', 'Lava Hound', 'fire', 'rare', [85, 70, 75, 60, 65, 45],
            [['fire_ember_claw', 1], ['normal_guard', 4], ['fire_flame_burst', 10], ['ground_tectonic_hide', 16]],
            "A molten hound that leaves glowing tracks across the battlefield."),
        P('fire_007', 'Phoenix Chick', 'fire', 'legendary', [80, 60, 70, 130, 85, 95],
            [['fire_flame_burst', 1], ['fire_heat_up', 6], ['flying_tailwind', 12], ['fire_ember_claw', 18]],
            "A juvenile phoenix with catastrophic special firepower."),
        P('water_001', 'Droplet Mouse', 'water', 'common', [55, 50, 55, 60, 60, 60],
            [['water_splash_strike', 1], ['normal_tackle', 1], ['water_tidal_pulse', 10], ['water_mist_barrier', 14]],
            "A shape-shifting water mouse with balanced fundamentals."),
        P('water_003', 'Frostshell Turtle', 'water', 'rare', [80, 55, 85, 50, 80, 40],
            [['water_splash_strike', 1], ['water_mist_barrier', 4], ['ice_cold_shroud', 10], ['water_tidal_pulse', 14]],
            "A defensive turtle shielded by ancient frozen plating."),
        P('water_005', 'Abyss Drake', 'water', 'epic', [75, 70, 60, 90, 65, 90],
            [['water_tidal_pulse', 1], ['flying_gale_slash', 6], ['water_mist_barrier', 12], ['water_splash_strike', 16]],
            "A deep-sea drake that overwhelms targets with swirling pressure."),
        P('grass_001', 'Leafblade Hare', 'grass', 'common', [50, 70, 40, 55, 45, 90],
            [['grass_vine_whip', 1], ['normal_tackle', 1], ['flying_tailwind', 8], ['grass_spore_burst', 12]],
            "A razor-eared hare built to strike first and keep moving."),
        P('grass_004', 'Groveback Tortoise', 'grass', 'rare', [95, 60, 90, 55, 80, 30],
            [['grass_vine_whip', 1], ['grass_growth_guard', 4], ['normal_guard', 8], ['grass_spore_burst', 14]],
            "A walking grove that anchors the front line with extreme resilience."),
        P('grass_005', 'Thorn Blossom', 'grass', 'epic', [70, 55, 70, 100, 75, 80],
            [['grass_spore_burst', 1], ['grass_growth_guard', 6], ['grass_vine_whip', 10], ['normal_guard', 16]],
            "A venomous bloom that excels at disruptive special pressure."),
        P('electric_001', 'Static Hamster', 'electric', 'common', [55, 45, 50, 60, 60, 70],
            [['electric_shock_bite', 1], ['normal_tackle', 1], ['electric_charge_focus', 8], ['electric_volt_bolt', 12]],
            "A compact battery of static charge that thrives on tempo."),
        P('electric_002', 'Volt Fox', 'electric', 'common', [50, 55, 40, 70, 50, 95],
            [['electric_shock_bite', 1], ['electric_charge_focus', 4], ['flying_tailwind', 8], ['electric_volt_bolt', 14]],
            "A swift electric fox that leaves a trail of afterimages."),
        P('electric_003', 'Magnet Golem', 'electric', 'rare', [65, 50, 90, 65, 85, 35],
            [['electric_volt_bolt', 1], ['normal_guard', 4], ['electric_charge_focus', 10], ['ground_tectonic_hide', 16]],
            "A living cluster of magnetic ore with exceptional durability."),
        P('electric_005', 'Thunder Hawk', 'electric', 'epic', [65, 60, 55, 120, 60, 110],
            [['electric_volt_bolt', 1], ['flying_sky_burst', 6], ['electric_charge_focus', 10], ['flying_tailwind', 14]],
            "A storm-soaring raptor that converts altitude into raw voltage."),
        P('ice_002', 'Frost Wolf', 'ice', 'common', [60, 65, 50, 55, 50, 60],
            [['ice_frost_fang', 1], ['normal_tackle', 1], ['ice_glacier_ray', 12], ['ice_cold_shroud', 16]],
            "A disciplined predator from the polar wastes with stable all-around stats."),
        P('ice_005', 'Snow Wraith', 'ice', 'epic', [70, 50, 60, 110, 80, 80],
            [['ice_glacier_ray', 1], ['ice_cold_shroud', 6], ['grass_growth_guard', 10], ['ice_frost_fang', 16]],
            "A glacial spirit that slows the battlefield through oppressive control."),
        P('ground_002', 'Quake Bear', 'ground', 'common', [70, 80, 60, 40, 50, 50],
            [['ground_quake_claw', 1], ['normal_tackle', 1], ['ground_tectonic_hide', 8], ['ground_sand_spike', 12]],
            "A territorial bruiser that turns each strike into a tremor."),
        P('ground_003', 'Sandstorm Scorpion', 'ground', 'rare', [65, 70, 65, 55, 60, 75],
            [['ground_quake_claw', 1], ['ground_sand_spike', 6], ['ground_tectonic_hide', 10], ['electric_charge_focus', 14]],
            "A disruptive desert hunter that thrives in attrition fights."),
        P('flying_001', 'Gale Bird', 'flying', 'common', [50, 60, 45, 55, 45, 95],
            [['flying_gale_slash', 1], ['normal_tackle', 1], ['flying_tailwind', 8], ['flying_sky_burst', 12]],
            "A high-speed flier built around initiative and repositioning."),
        P('flying_002', 'Storm Wyvern', 'flying', 'legendary', [85, 95, 75, 100, 75, 90],
            [['flying_gale_slash', 1], ['flying_tailwind', 6], ['flying_sky_burst', 12], ['fire_heat_up', 18]],
            "A legendary wyvern that snowballs once it secures momentum."),
        P('normal_001', 'Pebbleling', 'normal', 'common', [55, 45, 50, 45, 50, 45],
            [['normal_tackle', 1], ['normal_guard', 4], ['ground_tectonic_hide', 10]],
            "A humble starter companion with reliable but modest growth."),
    ];
    RS.SPECIES_BY_ID = {};
    RS.SPECIES.forEach((s) => (RS.SPECIES_BY_ID[s.id] = s));

    // Battle stats: same IV/EV formula as Pet::calculate_stats.
    RS.calcStats = (base, level, iv) => {
        const iv0 = iv === undefined ? 15 : iv;
        const hp = Math.floor(((2 * base.hp + iv0) * level) / 100 + level + 10);
        const other = (b) => Math.floor(((2 * b + iv0) * level) / 100 + 5);
        return {
            hp,
            attack: other(base.attack),
            defense: other(base.defense),
            spatk: other(base.spatk),
            spdef: other(base.spdef),
            speed: other(base.speed),
        };
    };
})();
