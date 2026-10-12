/**
 * Optional, local-only feedback for facts already revealed by a shared replay.
 * Nothing is created until an explicit enableFromGesture(). The app owns the
 * presentation clock and eligibility; this module has no input/model access.
 * Mock-context tests establish lifecycle/timing bounds, not acoustic quality.
 */
export const AUDIO_LIMITS = Object.freeze({ voices: 4, maxEventAge: .06, collisionInterval: .06,
  collisionDuration: .04, springDuration: .12, ringoutDuration: .16, resultDuration: .24 });

const defaultContextFactory = () => {
  const Constructor = globalThis.AudioContext || globalThis.webkitAudioContext;
  return typeof Constructor === 'function' ? new Constructor() : null;
};
const safely = operation => { try { return operation(); } catch { return undefined; } };
const finiteTime = value => typeof value === 'number' && Number.isFinite(value);

/**
 * Status: { enabled, state, reason, activeVoices }. enabled is an established
 * current-document preference, not an audibility claim. States are off,
 * enabling, running, suspended, paused, unsupported, and disposed.
 * Async methods always settle to a status, including on browser failures.
 */
export function createReplayAudio({ contextFactory = defaultContextFactory, onStatus } = {}) {
  let context = null, master = null, removeStateListener = null;
  let enabled = false, disposed = false, unsupported = false, pauseReason = null, failureReason = null;
  let generation = 0, activation = null, publishedStatus = '';
  let replay = null, voiceOrder = 0, lastCollisionAudioTime = -Infinity;
  const voices = new Set(), results = new Set();

  function contextState() { return safely(() => context?.state) || 'suspended'; }
  function getStatus() {
    const state = disposed ? 'disposed' : activation ? 'enabling' : unsupported ? 'unsupported'
      : !enabled ? 'off' : pauseReason ? 'paused' : contextState() === 'running' ? 'running' : 'suspended';
    return { enabled: enabled && !disposed, state,
      reason: state === 'paused' ? pauseReason : state === 'suspended' ? (failureReason || contextState())
        : state === 'unsupported' ? (failureReason || 'unavailable') : null,
      activeVoices: voices.size, contextState: context ? safely(() => context.state) ?? null : null };
  }
  function notify() {
    const status = getStatus(), signature = JSON.stringify(status);
    if (signature !== publishedStatus) {
      publishedStatus = signature;
      if (typeof onStatus === 'function') safely(() => onStatus(status));
    }
    return status;
  }
  function releaseVoice(voice, stop = true) {
    if (!voices.delete(voice)) return;
    safely(() => { voice.oscillator.onended = null; });
    if (stop) safely(() => voice.oscillator.stop());
    safely(() => voice.oscillator.disconnect());
    safely(() => voice.gain.disconnect());
  }
  function stopVoices() {
    for (const voice of [...voices]) releaseVoice(voice);
  }
  function closeContext(oldContext) {
    // Closing is best effort; every voice/master is already disconnected.
    const closing = safely(() => oldContext?.close());
    if (closing && typeof closing.then === 'function') Promise.resolve(closing).catch(() => {});
  }
  function detachContext(close = true) {
    // AudioContext clocks restart on replacement; retain throttling only within one context.
    lastCollisionAudioTime = -Infinity;
    stopVoices();
    safely(() => removeStateListener?.());
    removeStateListener = null;
    safely(() => master?.disconnect());
    const previous = context;
    context = master = null;
    if (close) closeContext(previous);
  }
  function canPlay() {
    return !disposed && enabled && !activation && !pauseReason && contextState() === 'running' && !!master;
  }
  function consumeThrough(time) {
    if (!replay || !finiteTime(time)) return;
    while (replay.index < replay.events.length && replay.events[replay.index].time <= time) replay.index++;
    replay.time = Math.max(replay.time, time);
  }
  function invalidateActivation() {
    generation++;
    if (activation) {
      activation = null;
      // A still-pending resume may later start the old context. Disconnect and
      // close it now, rather than letting it leak into the next activation.
      detachContext();
    }
  }
  function attachContext(nextContext) {
    if (!nextContext || typeof nextContext.createGain !== 'function' ||
      typeof nextContext.createOscillator !== 'function' || nextContext.state === 'closed') {
      closeContext(nextContext);
      return false;
    }
    context = nextContext;
    try {
      master = context.createGain();
      master.gain.setValueAtTime(.18, context.currentTime);
      master.connect(context.destination);
      const observed = context;
      const changed = () => {
        if (context !== observed || disposed) return;
        if (contextState() !== 'running') stopVoices();
        else failureReason = null;
        notify();
      };
      if (typeof context.addEventListener === 'function') {
        context.addEventListener('statechange', changed);
        removeStateListener = () => observed.removeEventListener?.('statechange', changed);
      } else {
        const previous = context.onstatechange;
        context.onstatechange = changed;
        removeStateListener = () => { if (observed.onstatechange === changed) observed.onstatechange = previous; };
      }
      return true;
    } catch {
      detachContext();
      return false;
    }
  }
  function activate(isEnable, currentTime) {
    if (disposed) return Promise.resolve(getStatus());
    if (!isEnable && !enabled && !activation) return Promise.resolve(getStatus());
    if (finiteTime(currentTime)) consumeThrough(currentTime);
    if (activation) return activation.promise;
    if (isEnable && enabled && !pauseReason && contextState() === 'running') return Promise.resolve(getStatus());
    const token = ++generation;
    const record = { promise: null };
    activation = record;
    unsupported = false;
    failureReason = null;
    stopVoices();
    consumeThrough(replay?.time);
    // Context construction AND a synchronous context's resume are invoked
    // inside the caller's gesture stack, before an asynchronous continuation.
    let candidate;
    try { candidate = context || contextFactory(); } catch { candidate = null; }
    const accept = async nextContext => {
      if (token !== generation || disposed) {
        if (nextContext !== context) closeContext(nextContext);
        return getStatus();
      }
      if (nextContext !== context && !attachContext(nextContext)) {
        unsupported = true; enabled = false; failureReason = 'unavailable';
        return getStatus();
      }
      if (!context) {
        unsupported = true; enabled = false; failureReason = 'unavailable';
        return getStatus();
      }
      const acceptedContext = context;
      try {
        if (acceptedContext.state !== 'running' && typeof acceptedContext.resume === 'function') await acceptedContext.resume();
      } catch { if (token === generation) failureReason = 'resume-failed'; }
      if (token !== generation || disposed || context !== acceptedContext) return getStatus();
      record.acceptedContext = acceptedContext;
      return getStatus();
    };
    let operation;
    try { operation = candidate && typeof candidate.then === 'function' ? Promise.resolve(candidate).then(accept) : accept(candidate); }
    catch { operation = Promise.reject(new Error('audio activation failed')); }
    record.promise = Promise.resolve(operation).catch(() => {
      if (token === generation && !disposed) {
        detachContext(); enabled = false; unsupported = true; failureReason = 'unavailable';
      }
    }).then(() => {
      if (token === generation && !disposed && record.acceptedContext === context && context) {
        enabled = true; pauseReason = null; consumeThrough(replay?.time);
      }
      if (activation === record) activation = null;
      return notify();
    });
    notify();
    return record.promise;
  }
  function enableFromGesture() { return activate(true); }
  function resumeFromGesture(currentTime) { return activate(false, currentTime); }
  function disable() {
    invalidateActivation(); enabled = false; unsupported = false; pauseReason = null; failureReason = null;
    detachContext(); consumeThrough(replay?.time);
    return notify();
  }
  function beginReplay(id, events, currentTime = 0) {
    if (disposed || !finiteTime(currentTime)) return getStatus();
    if (replay?.id === id) return getStatus();
    stopVoices();
    const revealed = [];
    // Only public event fields are copied; flick power/angle/owner and all
    // private commands are intentionally outside this interface.
    if (Array.isArray(events)) for (const event of events) {
      if (!event || !finiteTime(event.time)) continue;
      revealed.push({ type: event.type, time: event.time, padId: event.type === 'spring-pulse' ? event.padId : null });
    }
    replay = { id, events: revealed, index: 0, time: currentTime, collisionTime: -Infinity, pads: new Set() };
    const includeBoundary = canPlay();
    while (replay.index < revealed.length && (includeBoundary ? revealed[replay.index].time < currentTime : revealed[replay.index].time <= currentTime)) replay.index++;
    return notify();
  }
  function playCue(kind) {
    if (!canPlay()) return false;
    const priority = { collision: 1, spring: 2, ringout: 3, win: 4, draw: 4 }[kind];
    const now = safely(() => context.currentTime);
    if (!finiteTime(now)) return false;
    for (const voice of [...voices]) if (voice.end <= now) releaseVoice(voice);
    if (voices.size >= AUDIO_LIMITS.voices) {
      const removable = [...voices].filter(voice => voice.priority <= priority)
        .sort((a, b) => a.priority - b.priority || a.order - b.order)[0];
      if (!removable) return false;
      releaseVoice(removable);
    }
    const duration = kind === 'collision' ? AUDIO_LIMITS.collisionDuration : kind === 'spring' ? AUDIO_LIMITS.springDuration
      : kind === 'ringout' ? AUDIO_LIMITS.ringoutDuration : AUDIO_LIMITS.resultDuration;
    let oscillator, gain, voice;
    try {
      oscillator = context.createOscillator(); gain = context.createGain();
      voice = { oscillator, gain, priority, order: ++voiceOrder, end: now + duration };
      oscillator.type = kind === 'collision' ? 'triangle' : 'sine';
      const pitches = kind === 'collision' ? [160, 90] : kind === 'spring' ? [360, 680]
        : kind === 'ringout' ? [250, 90] : kind === 'win' ? [440, 554, 660] : [330, 294, 330];
      oscillator.frequency.setValueAtTime(pitches[0], now);
      for (let index = 1; index < pitches.length; index++) {
        oscillator.frequency.linearRampToValueAtTime(pitches[index], now + duration * index / (pitches.length - 1) * .85);
      }
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(.1, now + Math.min(.005, duration / 4));
      gain.gain.linearRampToValueAtTime(0, now + duration);
      oscillator.connect(gain); gain.connect(master);
      oscillator.onended = () => { releaseVoice(voice, false); notify(); };
      voices.add(voice);
      oscillator.start(now); oscillator.stop(now + duration);
      return true;
    } catch {
      if (voice && voices.has(voice)) releaseVoice(voice);
      else {
        safely(() => oscillator?.stop()); safely(() => oscillator?.disconnect()); safely(() => gain?.disconnect());
      }
      failureReason = 'audio-failed';
      // A failing node API disables audio rather than repeatedly failing each
      // gameplay frame. Nothing escapes into the match/rendering code.
      enabled = false; unsupported = true; detachContext();
      return false;
    }
  }
  function tick(currentTime, eligible) {
    if (disposed || !finiteTime(currentTime)) return getStatus();
    if (!eligible || !canPlay()) {
      stopVoices(); consumeThrough(currentTime); return notify();
    }
    if (!replay || currentTime < replay.time) return getStatus();
    const due = [];
    while (replay.index < replay.events.length && replay.events[replay.index].time <= currentTime) due.push(replay.events[replay.index++]);
    replay.time = currentTime;
    let ringout = false, collision = null;
    const springs = [];
    for (const event of due) {
      const age = currentTime - event.time;
      if (age < 0 || age > AUDIO_LIMITS.maxEventAge) continue;
      if (event.type === 'ringout') ringout = true;
      else if (event.type === 'spring-pulse' && event.padId != null && !replay.pads.has(event.padId)) {
        replay.pads.add(event.padId); springs.push(event);
      } else if (event.type === 'collision' && event.time - replay.collisionTime >= AUDIO_LIMITS.collisionInterval) collision = event;
    }
    // Highest-value cues claim the bounded pool first; there is no queue.
    if (ringout) playCue('ringout');
    for (const event of springs.slice(0, AUDIO_LIMITS.voices - Number(ringout))) playCue('spring');
    const audioTime = safely(() => context?.currentTime);
    if (collision && finiteTime(audioTime) && audioTime - lastCollisionAudioTime >= AUDIO_LIMITS.collisionInterval && playCue('collision')) {
      replay.collisionTime = collision.time; lastCollisionAudioTime = audioTime;
    }
    return notify();
  }
  function pause(reason = 'paused') {
    if (disposed) return getStatus();
    invalidateActivation(); stopVoices(); pauseReason = String(reason || 'paused');
    consumeThrough(replay?.time);
    return notify();
  }
  function result(matchId, outcome) {
    if (disposed || !outcome || !['win', 'draw'].includes(outcome.type) || results.has(matchId)) return getStatus();
    // Consume the official result even while muted: a later enable must never
    // play an old result, and handoff is not an outcome.
    results.add(matchId);
    if (canPlay()) { stopVoices(); playCue(outcome.type); }
    return notify();
  }
  function reset() {
    if (disposed) return getStatus();
    invalidateActivation(); stopVoices(); replay = null; results.clear();
    // Preserve only an established preference, never a pending activation.
    return notify();
  }
  function dispose() {
    if (disposed) return getStatus();
    invalidateActivation(); enabled = false; disposed = true; pauseReason = null;
    detachContext(); replay = null; results.clear();
    return notify();
  }
  return Object.freeze({ enableFromGesture, disable, beginReplay, tick, pause, resumeFromGesture,
    result, reset, dispose, getStatus });
}
