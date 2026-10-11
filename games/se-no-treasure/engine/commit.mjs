import { assertChoiceShape, ROUNDS } from './game.mjs';
function cryptoApi() {
  if(!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues)throw new Error('Secure WebCrypto is required (HTTPS or localhost)');
  return globalThis.crypto;
}
function validate(matchId,turn,choice,nonce,playerIndex) {
  if(typeof matchId!=='string'||matchId.length<1||matchId.length>128)throw new TypeError('Invalid match ID');
  if(!Number.isInteger(turn)||turn<1||turn>ROUNDS)throw new TypeError('Invalid turn');
  if(playerIndex!==0 && playerIndex!==1)throw new TypeError('Invalid player index');
  assertChoiceShape(choice);
  if(typeof nonce!=='string'||!/^[0-9a-f]{64}$/.test(nonce))throw new TypeError('Nonce must be 32 random bytes as lowercase hex');
}
export function secureNonce() {
  return Array.from(cryptoApi().getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
}
export async function hashChoice(matchId,turn,choice,nonce,playerIndex) {
  validate(matchId,turn,choice,nonce,playerIndex);
  const canonical=JSON.stringify(['otakara-commit-v2',matchId,turn,playerIndex,choice.lane,choice.style,nonce]);
  const digest=await cryptoApi().subtle.digest('SHA-256',new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
}
export async function verifyChoice(commitment,matchId,turn,choice,nonce,playerIndex) {
  if(typeof commitment!=='string'||!/^[0-9a-f]{64}$/.test(commitment))throw new TypeError('Invalid commitment');
  const expected=await hashChoice(matchId,turn,choice,nonce,playerIndex);
  let mismatch=0; for(let i=0;i<64;i++)mismatch|=expected.charCodeAt(i)^commitment.charCodeAt(i);
  return mismatch===0;
}
