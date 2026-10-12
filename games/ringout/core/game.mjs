/** Reconstructed baseline, 2026-10-11. Pure turn rules; no private input lives here. */
import { simulate } from './physics.mjs?v=d7ca654dbee80c540f71c01e';

export const GAME = Object.freeze({ radius: 150, diskRadius: 14, springRadius: 10,
  anchorRange: 42, placementClearance: 4, minimumPower: .1, maximumPower: 1,
  defaultMaxTurns: 12, activeSpringTurns: 2 });
const clone = value => structuredClone(value);
const angleOf = angle => ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const ownValue = (object, key) => {
  if (!object || typeof object !== 'object') return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
};
const countLiving = disks => [0, 1].map(owner => disks.filter(d => d.alive && d.owner === owner).length);
const usable = pad => pad.status !== 'consumed' && pad.status !== 'expired';

export function createMatch({ count = 3, seed = 1, maxTurns = GAME.defaultMaxTurns } = {}) {
  if (count !== 1 && count !== 3) throw new RangeError('count must be 1 or 3');
  if (!Number.isSafeInteger(seed)) throw new RangeError('seed must be a safe integer');
  if (!Number.isSafeInteger(maxTurns) || maxTurns < 1 || maxTurns > 12) throw new RangeError('maxTurns must be 1..12');
  const xs = count === 1 ? [0] : [-42, 0, 42];
  const disks = [0, 1].flatMap(owner => xs.map((x, index) => ({
    id: `p${owner}-${index}`, owner, index, x, y: owner === 0 ? 75 : -75,
    r: GAME.diskRadius, vx: 0, vy: 0, alive: true,
  })));
  return { version: 'reconstructed-1', count, seed, radius: GAME.radius, disks,
    turn: 1, completedTurns: 0, maxTurns, inventory: [1, 1], pads: [], history: [], outcome: null };
}

/** This is a detached public snapshot. Current sealed choices never enter match state. */
export function publicState(state) { return clone(state); }

function padView(pad, turn) {
  const copy = clone(pad);
  if (!usable(copy)) { copy.activeTurnsRemaining = 0; return copy; }
  copy.status = turn < copy.armTurn ? 'unarmed' : turn <= copy.expiresTurn ? 'armed' : 'expired';
  copy.activeTurnsRemaining = copy.status === 'expired' ? 0 :
    Math.max(0, copy.expiresTurn - Math.max(turn, copy.armTurn) + 1);
  return copy;
}

/** Evaluate only public pre-turn geometry; this cannot inspect the opponent's sealed placement. */
export function assessPlacement(state, owner, placement) {
  const fail = reason => ({ ok: false, reason });
  if (owner !== 0 && owner !== 1) return fail('invalid-owner');
  if (state.outcome) return fail('game-over');
  if (state.turn >= state.maxTurns) return fail('no-future-exchange');
  if (state.inventory[owner] !== 1) return fail('no-spring-left');
  const anchorId = ownValue(placement, 'anchorId');
  const x = ownValue(placement, 'x'), y = ownValue(placement, 'y'), angle = ownValue(placement, 'angle');
  if (typeof anchorId !== 'string' || !finite(x) || !finite(y) || !finite(angle)) return fail('invalid-placement');
  const anchor = state.disks.find(d => d.id === anchorId && d.owner === owner && d.alive);
  if (!anchor) return fail('invalid-anchor');
  if (Math.hypot(x - anchor.x, y - anchor.y) > GAME.anchorRange) return fail('too-far');
  if (Math.hypot(x, y) + GAME.springRadius > state.radius) return fail('outside-ring');
  if (state.disks.some(d => d.alive && Math.hypot(x - d.x, y - d.y) < GAME.springRadius + d.r + GAME.placementClearance)) return fail('disk-clearance');
  const maxR = Math.max(GAME.diskRadius, ...state.disks.filter(d => d.alive).map(d => d.r));
  if (state.pads.some(p => usable(p) && Math.hypot(x - p.x, y - p.y) < GAME.springRadius + p.radius + 2 * maxR + GAME.placementClearance)) return fail('pad-clearance');
  return { ok: true, reason: null, pad: {
    id: `spring-${owner}-${state.turn}`, owner, placedBy: owner, anchorId, x, y,
    angle: angleOf(angle), radius: GAME.springRadius, status: 'unarmed',
    placedTurn: state.turn, armTurn: state.turn + 1, expiresTurn: state.turn + GAME.activeSpringTurns,
    activeTurnsRemaining: GAME.activeSpringTurns,
  } };
}

function validateState(state) {
  if (!state || !Array.isArray(state.disks) || !Array.isArray(state.pads) || !Array.isArray(state.history) ||
      !Array.isArray(state.inventory) || state.inventory.length !== 2 || state.radius !== GAME.radius ||
      (state.count !== 1 && state.count !== 3) || state.disks.length !== state.count * 2 ||
      !Number.isSafeInteger(state.turn) || state.turn < 1 || state.turn !== state.completedTurns + 1 ||
      !Number.isSafeInteger(state.maxTurns) || state.maxTurns < 1 || state.maxTurns > 12 ||
      state.completedTurns > state.maxTurns || state.history.length !== state.completedTurns ||
      state.inventory.some(n => n !== 0 && n !== 1) || state.pads.length > 2) {
    throw new TypeError('invalid match state');
  }
  const ids = new Set();
  for (const disk of state.disks) {
    if (!disk || typeof disk.id !== 'string' || ids.has(disk.id) ||
        (disk.owner !== 0 && disk.owner !== 1) || !finite(disk.x) || !finite(disk.y) ||
        disk.r !== GAME.diskRadius || typeof disk.alive !== 'boolean') throw new TypeError('invalid match disks');
    ids.add(disk.id);
  }
  const owners = new Set(), padIds = new Set();
  for (const pad of state.pads) {
    if (!pad || typeof pad.id !== 'string' || padIds.has(pad.id) || owners.has(pad.owner) ||
        (pad.owner !== 0 && pad.owner !== 1) || !finite(pad.x) || !finite(pad.y) || !finite(pad.angle) ||
        pad.radius !== GAME.springRadius || Math.hypot(pad.x, pad.y) + pad.radius > state.radius ||
        !Number.isSafeInteger(pad.placedTurn) || pad.placedTurn < 1 || pad.placedTurn > state.completedTurns ||
        pad.armTurn !== pad.placedTurn + 1 || pad.expiresTurn !== pad.placedTurn + GAME.activeSpringTurns ||
        !['unarmed', 'armed', 'consumed', 'expired'].includes(pad.status) ||
        state.inventory[pad.owner] !== 0) throw new TypeError('invalid match springs');
    owners.add(pad.owner); padIds.add(pad.id);
  }
  for (const owner of [0, 1]) {
    if (state.disks.filter(d => d.owner === owner).length !== state.count ||
        (state.inventory[owner] === 0) !== owners.has(owner)) throw new TypeError('invalid match ownership');
  }
}

function validatedChoice(state, command, owner) {
  const shot = ownValue(command, 'shot');
  const diskId = ownValue(shot, 'diskId'), angle = ownValue(shot, 'angle'), power = ownValue(shot, 'power');
  const disk = state.disks.find(d => d.id === diskId && d.owner === owner && d.alive);
  if (!disk || !finite(angle) || !finite(power) || power < GAME.minimumPower || power > GAME.maximumPower) {
    throw new TypeError(`player ${owner} must choose one living own disk with finite angle and power .1..1`);
  }
  const placement = ownValue(command, 'placement');
  return { shot: { diskId, angle: angleOf(angle), power }, placement,
    placementResult: placement == null ? { ok: false, reason: 'not-requested' } : assessPlacement(state, owner, placement) };
}

function decideOutcome(disks, turn, maxTurns) {
  const survivors = countLiving(disks);
  const reason = survivors.some(n => n === 0) ? 'elimination' : turn >= maxTurns ? 'turn-cap' : null;
  if (!reason) return null;
  const winner = survivors[0] === survivors[1] ? null : survivors[0] > survivors[1] ? 0 : 1;
  return { type: winner === null ? 'draw' : 'win', winner, reason, survivors };
}

/** Both commands must be sealed before calling. Invalid placement refunds; invalid shot rejects atomically. */
export function resolveTurn(state, commands) {
  validateState(state);
  if (state.outcome) throw new Error('match is already finished');
  if (state.turn > state.maxTurns) throw new Error('exchange budget exhausted');
  if (!Array.isArray(commands) || commands.length !== 2) throw new TypeError('exactly two sealed commands required');
  const selected = commands.map((command, owner) => validatedChoice(state, command, owner));
  const placements = selected.map(s => s.placementResult);
  if (placements.every(p => p.ok)) {
    const [a, b] = placements.map(p => p.pad);
    const maxR = Math.max(GAME.diskRadius, ...state.disks.filter(d => d.alive).map(d => d.r));
    if (Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius + 2 * maxR + GAME.placementClearance) {
      for (let owner = 0; owner < 2; owner++) placements[owner] = { ok: false, reason: 'simultaneous-conflict' };
    }
  }
  const before = clone(state), next = clone(state), itemEvents = [];
  const oldPads = state.pads.map(p => padView(p, state.turn));
  const activePads = oldPads.filter(p => p.status === 'armed');
  const newPads = placements.filter(p => p.ok).map(p => clone(p.pad));
  for (let owner = 0; owner < 2; owner++) {
    if (placements[owner].ok) {
      next.inventory[owner] = 0;
      itemEvents.push({ type: 'spring-placed', turn: state.turn, owner, padId: placements[owner].pad.id });
    } else if (placements[owner].reason !== 'not-requested') {
      itemEvents.push({ type: 'spring-placement-rejected', turn: state.turn, owner, reason: placements[owner].reason });
    }
  }
  const physics = simulate({ disks: clone(state.disks), radius: state.radius,
    shots: selected.map(s => s.shot), pads: activePads.map(p => ({ ...clone(p), armed: true })) });
  const consumed = new Set(physics.events.filter(e => e.type === 'spring-pulse').map(e => e.padId));
  const withStableIndex = disk => ({ ...clone(disk), index: state.disks.find(old => old.id === disk.id).index });
  next.disks = physics.disks.map(withStableIndex);
  next.completedTurns = state.turn;
  next.turn = state.turn + 1;
  next.outcome = decideOutcome(next.disks, state.turn, state.maxTurns);
  next.pads = [...oldPads, ...newPads].map(pad => {
    if (consumed.has(pad.id)) {
      itemEvents.push({ type: 'spring-consumed', turn: state.turn, owner: pad.owner, padId: pad.id });
      return { ...clone(pad), status: 'consumed', activeTurnsRemaining: 0, consumedTurn: state.turn };
    }
    const viewed = padView(pad, next.turn);
    if (viewed.status === 'expired' && pad.status !== 'expired') itemEvents.push({ type: 'spring-expired', turn: state.turn, owner: pad.owner, padId: pad.id });
    if (viewed.status === 'armed' && pad.status === 'unarmed') itemEvents.push({ type: 'spring-armed', turn: next.turn, owner: pad.owner, padId: pad.id });
    return viewed;
  });
  const record = { turn: state.turn, shots: clone(selected.map(s => s.shot)),
    placements: clone(placements), events: clone(physics.events), itemEvents: clone(itemEvents),
    survivors: countLiving(next.disks), outcome: clone(next.outcome) };
  next.history.push(record);
  return { before, state: next, events: clone(physics.events), frames: physics.frames.map(frame => ({ ...clone(frame), disks: frame.disks.map(withStableIndex) })),
    duration: physics.duration, replayPads: [...clone(oldPads), ...clone(newPads)],
    placementResults: clone(placements), itemEvents, outcome: clone(next.outcome) };
}
