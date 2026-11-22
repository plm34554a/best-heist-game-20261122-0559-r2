// levels.js — the three rooms of the Aurelia heist and everything in them.
// Map legend: '#' wall, '.' floor, 'C' crate (cover, blocks sight), 'D' glass
// display case (cover), 'V' vent (slow, but guards cannot see you inside),
// 'L' small loot, 'B' bonus loot, 'T' the main target, 'E' exit, 'P' start.
// Every row is 26 characters; guards patrol the waypoint lists; cameras sit
// on wall tiles and sweep back and forth.

export const LEVELS = [
  {
    id: 1,
    name: 'The Aurelia Gallery',
    brief: 'Lift the Sunburst Opal from the main hall. Two guards, two cameras — read the cones, then move.',
    alarmStart: 0,
    map: [
      '##########################',
      '#P...C......#....L.......#',
      '#....C......#............#',
      '#....C..T...#....C.......#',
      '#....C......#....C.......#',
      '#....C......#....C.......#',
      '#........................#',
      '#..C....#.......#...C....#',
      '#..C....#...L...#...C....#',
      '#..C....#.......#........#',
      '#.......V......V.........#',
      '#....C..#.......#...C....#',
      '#....C..#.......#...C....#',
      '#....C..#.......#...C....#',
      '#E.......................#',
      '##########################',
    ],
    guards: [
      { waypoints: [[9, 2], [9, 5], [20, 5], [20, 2]], pause: 0.9 },
      { waypoints: [[22, 11], [22, 13], [12, 13], [12, 11]], pause: 0.7 },
    ],
    cameras: [
      { tile: [13, 0], baseAngle: Math.PI / 2, sweep: 0.9 },
      { tile: [13, 15], baseAngle: -Math.PI / 2, sweep: 0.9 },
    ],
    targetName: 'Sunburst Opal',
  },
  {
    id: 2,
    name: 'The Vault Floor',
    brief: 'Crack the vault level and take the Gilded Ledger. Three guards, three cameras — the vent shaft along the top is the quiet way in.',
    alarmStart: 10,
    map: [
      '##########################',
      '#P..V...V...V...V...V...T#',
      '#........................#',
      '#..D....#.......#....D...#',
      '#..D....#...L...#....D...#',
      '#..D....#.......#....D...#',
      '#......C#.......#C.......#',
      '#......C#.......#C.......#',
      '#........................#',
      '#..C....#...B...#....C...#',
      '#..C....#.......#....C...#',
      '#.......#........#.......#',
      '#..L....#.......#....L...#',
      '#.......#........#.......#',
      '#E.......................#',
      '##########################',
    ],
    guards: [
      { waypoints: [[5, 2], [12, 2], [12, 7], [5, 7]], pause: 0.8 },
      { waypoints: [[20, 2], [20, 7], [13, 7], [13, 2]], pause: 0.8 },
      { waypoints: [[5, 12], [10, 12], [10, 9], [5, 9]], pause: 1.0 },
    ],
    cameras: [
      { tile: [12, 0], baseAngle: Math.PI / 2, sweep: 1.1 },
      { tile: [8, 6], baseAngle: 0, sweep: 1.2 },
      { tile: [13, 15], baseAngle: -Math.PI / 2, sweep: 1.0 },
    ],
    targetName: 'Gilded Ledger',
  },
  {
    id: 3,
    name: 'The Rooftop Getaway',
    brief: 'The Star of Aurelia is on the roof. The alarm is already warm — grab it and reach the skylight before the whole building wakes up.',
    alarmStart: 25,
    map: [
      '##########################',
      '#P....C......#....L......#',
      '#.....C......#...........#',
      '#.....C..B...#....C......#',
      '#.....C......#....C......#',
      '#.....C......#....C......#',
      '#..........V.............#',
      '#..C....#.......#...C....#',
      '#..C....#...T...#...C....#',
      '#..C....#.......#........#',
      '#.......#........#.......#',
      '#..L....V.......V...L....#',
      '#.......#........#.......#',
      '#..C....#.......#...C....#',
      '#E.......................#',
      '##########################',
    ],
    guards: [
      { waypoints: [[7, 2], [7, 6], [18, 6], [18, 2]], pause: 0.6 },
      { waypoints: [[21, 8], [21, 13], [10, 13], [10, 8]], pause: 0.6 },
      { waypoints: [[4, 10], [4, 13], [9, 13], [9, 10]], pause: 0.9 },
    ],
    cameras: [
      { tile: [13, 0], baseAngle: Math.PI / 2, sweep: 1.3 },
      { tile: [0, 7], baseAngle: 0, sweep: 1.0 },
      { tile: [25, 7], baseAngle: Math.PI, sweep: 1.0 },
    ],
    targetName: 'Star of Aurelia',
  },
];

// Parse one map into walls, cover, vents, loot spots, start, target and exit.
export function parseLevel(level) {
  const walls = new Set();
  const cover = new Set(); // crates + display cases: block movement and sight
  const vents = new Set();
  const loot = [];
  let start = null;
  let target = null;
  let exit = null;
  level.map.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      const key = `${c},${r}`;
      if (ch === '#') walls.add(key);
      else if (ch === 'C' || ch === 'D') cover.add(key);
      else if (ch === 'V') vents.add(key);
      else if (ch === 'L') loot.push({ col: c, row: r, value: 25, kind: 'small', taken: false });
      else if (ch === 'B') loot.push({ col: c, row: r, value: 60, kind: 'bonus', taken: false });
      else if (ch === 'T') target = { col: c, row: r, taken: false };
      else if (ch === 'E') exit = { col: c, row: r };
      else if (ch === 'P') start = { col: c, row: r };
    }
  });
  return { walls, cover, vents, loot, start, target, exit };
}

export function tileCenter(col, row) {
  return { x: (col + 0.5) * 40, y: (row + 0.5) * 40 };
}

export function tileKey(col, row) {
  return `${col},${row}`;
}
