// shots.js — staged states for screenshots, driven by the ?shot= query param.
// Each state is a real position inside the live game (no fake pixels): the
// screenshot tool opens the game at that URL and the game jumps straight there.

export function applyShot(game, shot) {
  if (!shot) return false;
  if (shot === 'start') {
    game.state = 'title';
    game.loadLevel(0);
    return true;
  }
  if (shot === 'play') {
    game.loadLevel(0);
    // Mid-heist: some loot grabbed, alarm warm, a guard mid-patrol.
    game.thief.loot = 75;
    game.thief.x = 9 * 40 + 20;
    game.thief.y = 3 * 40 + 20;
    game.parsed.loot[0].taken = true;
    game.alarm.value = 34;
    game.guards[0].pos = { x: 11 * 40 + 20, y: 5 * 40 + 20 };
    game.guards[0].facing = Math.PI / 2;
    game.guards[0].suspicion = 0.55;
    game.state = 'playing';
    return true;
  }
  if (shot === 'vault') {
    game.loadLevel(1);
    game.thief.loot = 210;
    game.thief.x = 5 * 40 + 20;
    game.thief.y = 1 * 40 + 20;
    game.thief.inVent = true;
    game.parsed.loot[0].taken = true;
    game.parsed.loot[1].taken = true;
    game.alarm.value = 48;
    game.guards[0].pos = { x: 12 * 40 + 20, y: 2 * 40 + 20 };
    game.guards[0].facing = 0;
    game.guards[0].suspicion = 0.7;
    game.state = 'playing';
    return true;
  }
  if (shot === 'escape') {
    game.loadLevel(2);
    game.thief.loot = 385;
    game.parsed.target.taken = true;
    game.targetTaken = true;
    game.thief.x = 6 * 40 + 20;
    game.thief.y = 11 * 40 + 20;
    game.alarm.value = 72;
    game.guards[0].state = 'chase';
    game.guards[0].lastSeen = { x: game.thief.x, y: game.thief.y };
    game.guards[0].pos = { x: 10 * 40 + 20, y: 8 * 40 + 20 };
    game.guards[0].facing = Math.PI / 2;
    game.state = 'playing';
    return true;
  }
  return false;
}
