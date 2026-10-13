/** Business choices are game assumptions. Clock values are minutes after midnight. */
export const OPERATING_DEFAULTS=Object.freeze({openingMinute:540,closingMinute:1020,lastEntryMinute:990,promotionBudget:0,servicePace:'balanced',terraceEnabled:true});
export const SERVICE_PACES=Object.freeze({balanced:Object.freeze({name:'バランス',timeFactor:1,satisfactionBonus:0}),quick:Object.freeze({name:'スピード重視',timeFactor:.75,satisfactionBonus:-6}),careful:Object.freeze({name:'丁寧な接客',timeFactor:1.3,satisfactionBonus:6})});
export function getOperatingSettings(state){return {...OPERATING_DEFAULTS,...state?.settings}}
export function validateOperatingSettings(settings){
 if(!settings||typeof settings!=='object'||Array.isArray(settings)||Object.keys(settings).some(key=>!Object.hasOwn(OPERATING_DEFAULTS,key)))return '営業方針の形式が不正です';
 const {openingMinute:o,closingMinute:c,lastEntryMinute:l,promotionBudget:p,servicePace:s,terraceEnabled:t}=settings;
 if(![o,c,l].every(n=>Number.isSafeInteger(n)&&n%30===0)||o<360||o>840||c>1320||c-o<240||c-o>480||c-l<30||c-l>120)return '営業時間は06:00〜22:00の間で4〜8時間、開店は14:00まで、最終入店は閉店30〜120分前（30分単位）にしてください';
 if(!Number.isSafeInteger(p)||p<0||p>5000)return '宣伝予算は1日¥0〜¥5,000の整数にしてください';
 if(typeof s!=='string'||!Object.hasOwn(SERVICE_PACES,s)||typeof t!=='boolean')return '接客方針またはテラス設定が不正です';
 return null;
}
export function getOperatingTiming(state){const s=getOperatingSettings(state);return {...s,duration:s.closingMinute-s.openingMinute,lastEntryOffset:s.lastEntryMinute-s.openingMinute,maxMinutes:s.closingMinute-s.openingMinute+120}}
export function setOperatingSettings(state,patch){
 if(state.phase==='open')throw Error('営業中は変更できません。閉店後に調整してください');
 if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!Object.hasOwn(OPERATING_DEFAULTS,k)))throw Error('営業方針の項目が不正です');
 const settings={...getOperatingSettings(state),...patch},error=validateOperatingSettings(settings);if(error)throw Error(error);
 const s=JSON.parse(JSON.stringify(state));s.settings=settings;s.lastEvent='営業時間・宣伝・接客方針を更新しました';s.events.push({minute:s.minute,text:s.lastEvent});if(s.events.length>30)s.events.shift();return s;
}
