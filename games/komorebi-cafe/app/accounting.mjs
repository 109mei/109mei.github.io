/** Fictional game bookkeeping, not real accounting, lending, tax or business advice. */
import {STOCK_ITEMS} from './catalog.mjs?v=20261013-qa6';
import {recordCash} from './progression.mjs?v=20261013-qa6';
const clone=s=>JSON.parse(JSON.stringify(s));
const assert=(ok,message)=>{if(!ok)throw Error(message)};
const integer=Number.isSafeInteger;
const bounded=n=>integer(n)&&Math.abs(n)<=1e12;
const nonnegative=n=>bounded(n)&&n>=0;
export const LOAN_TERMS=Object.freeze({limit:100000,minimum:1000,step:1000,dailyInterestRate:.002});
export const DEPRECIATION_DAYS=Object.freeze({expansion:120,equipment:60});
const categories=['deliveryFees','revenue','stock','wages','rent','utilities','expansion','research','recruitment','equipment','promotion','loanDraw','loanRepayment','interest'];
const expenseCategories=['deliveryFees','wages','rent','utilities','promotion','research','recruitment'];
export function inventoryValue(s){return Object.entries(STOCK_ITEMS).reduce((sum,[id,item])=>sum+(s.stock[id]??0)*item.unitCost,0)}
function asset(kind,cost,day){return {kind,cost,acquiredDay:day,elapsedDays:0,accumulatedDepreciation:0,usefulLife:DEPRECIATION_DAYS[kind]}}
/** Mutates only the supplied new/migrated state. Historical missing accruals are never invented. */
export function initializeAccounting(s,{migrated=false}={}){
 assert(!s.accounting,'会計の開始残高は既に設定されています');
 const openingEquipment=(s.finance.totals.expansion??0)+(s.finance.totals.equipment??0),openingInventory=inventoryValue(s);
 const assets=[];for(const kind of ['expansion','equipment'])if(s.finance.totals[kind]>0)assets.push(asset(kind,s.finance.totals[kind],s.phase==='closed'?s.day+1:s.day));
 s.accounting={version:1,basis:{kind:migrated?'legacy-opening':'initial',day:s.day,minute:s.minute,note:migrated?'旧保存の現金・在庫・取得済み設備を開始残高に引き継ぎました。過去の損益・償却は復元せず、この時点以降を集計します。':'開業時の現金80,000円と現物出資の初期在庫8,720円を元入金として計上。無料の内装・家具は簿価0円です。'},openingCash:s.cash,openingInventory,openingEquipment,openingFinanceTotals:Object.fromEntries(categories.map(k=>[k,s.finance.totals[k]??0])),contributedCapital:s.cash+openingInventory+openingEquipment,costOfGoods:0,spoilageCost:0,depreciation:0,assets,lastClosedDay:s.phase==='closed'?s.day:s.day-1};
 return s;
}
/** Hook runs BEFORE cash ledger mutation so an invalid asset cannot partially apply. */
export function recordAccountingCash(s,amount,category,description){
 if(!s.accounting)return;
 assert(integer(amount)&&categories.includes(category),'会計区分または金額が不正です');
 assert(['revenue','loanDraw'].includes(category)?amount>=0:amount<=0,'入出金の符号が不正です');
 if(['expansion','equipment'].includes(category)&&amount<0){
  // Same-day, same-life purchases share a cohort; capped by game days, not ledger retention.
  const day=s.phase==='closed'?s.day+1:s.day,existing=s.accounting.assets.find(a=>a.kind===category&&a.acquiredDay===day&&a.elapsedDays===0);
  if(existing)existing.cost-=amount;else s.accounting.assets.push(asset(category,-amount,day));
 }
}
export function recordInventoryExpense(s,amount,category){
 assert(nonnegative(amount)&&['costOfGoods','spoilageCost'].includes(category),'在庫費用の区分または金額が不正です');
 if(s.accounting)s.accounting[category]+=amount;
}
const delta=(s,key)=>s.finance.totals[key]-(s.accounting.openingFinanceTotals[key]??0);
export function getLoanOffer(s){
 const principal=(s.finance.totals.loanDraw??0)-(s.finance.totals.loanRepayment??0),available=Math.max(0,LOAN_TERMS.limit-principal),repayable=Math.max(0,Math.min(s.cash,principal)),locked=s.phase==='open';
 return {...LOAN_TERMS,principal,available,repayable,nextInterest:Math.ceil(principal/500),canBorrow:!locked&&available>=LOAN_TERMS.minimum,canRepay:!locked&&repayable>=1,reason:locked?'営業中は借入・返済できません':null};
}
function loanEvent(s,text){s.lastEvent=text;s.events.push({minute:s.minute,text});if(s.events.length>30)s.events.shift()}
export function borrowFunds(state,amount){
 const offer=getLoanOffer(state);assert(state.phase!=='open','営業中は借入できません');assert(offer.canBorrow&&integer(amount)&&amount>=offer.minimum&&amount%offer.step===0&&amount<=offer.available,'借入は1,000円単位、残高上限100,000円のゲーム内資金です');
 const s=clone(state);recordCash(s,amount,'loanDraw','ゲーム内借入（実際の金融取引ではありません）');loanEvent(s,`ゲーム内で ¥${amount.toLocaleString('ja-JP')}を借入。閉店ごとに残高の0.2%の利息`);return s;
}
export const takeLoan=borrowFunds;
export function repayLoan(state,amount){
 const offer=getLoanOffer(state);assert(state.phase!=='open','営業中は返済できません');assert(offer.canRepay&&integer(amount)&&amount>=1&&amount<=offer.repayable,'返済額は手元の現金と借入残高の範囲内にしてください');
 const s=clone(state);recordCash(s,-amount,'loanRepayment','ゲーム内借入の元金返済');loanEvent(s,`ゲーム内借入の元金 ¥${amount.toLocaleString('ja-JP')}を返済しました`);return s;
}
/** One charge per played business day, with integer yen, no charge for merely changing screens. */
export function closeAccountingDay(s){
 const a=s.accounting;assert(a,'財務の開始残高がありません');if(a.lastClosedDay>=s.day)return {depreciation:0,interest:0};
 let depreciation=0;
 for(const entry of a.assets){if(entry.elapsedDays>=entry.usefulLife||entry.acquiredDay>s.day)continue;entry.elapsedDays++;const next=Math.floor(entry.cost*entry.elapsedDays/entry.usefulLife);depreciation+=next-entry.accumulatedDepreciation;entry.accumulatedDepreciation=next;}
 a.depreciation+=depreciation;const interest=getLoanOffer(s).nextInterest;if(interest)recordCash(s,-interest,'interest','ゲーム内借入利息（残高の0.2%／営業日・端数切上げ）');a.lastClosedDay=s.day;
 return {depreciation,interest};
}
export function getFinancialStatements(s){
 assert(s.accounting,'財務の開始残高がありません');const a=s.accounting,t=Object.fromEntries(categories.map(k=>[k,delta(s,k)]));
 const incomeStatement={revenue:t.revenue,costOfGoods:a.costOfGoods,grossProfit:t.revenue-a.costOfGoods,...Object.fromEntries(expenseCategories.map(k=>[k,t[k]])),spoilageCost:a.spoilageCost,depreciation:a.depreciation};
 incomeStatement.operatingProfit=incomeStatement.grossProfit-expenseCategories.reduce((sum,k)=>sum+t[k],0)-a.spoilageCost-a.depreciation;incomeStatement.interest=t.interest;incomeStatement.netProfit=incomeStatement.operatingProfit-t.interest;
 const equipmentCost=a.assets.reduce((sum,e)=>sum+e.cost,0),accumulatedDepreciation=a.assets.reduce((sum,e)=>sum+e.accumulatedDepreciation,0),loanPrincipal=getLoanOffer(s).principal;
 const balanceSheet={cash:Math.max(0,s.cash),inventory:inventoryValue(s),equipmentCost,accumulatedDepreciation,equipmentNet:equipmentCost-accumulatedDepreciation,loanPrincipal,overdraft:Math.max(0,-s.cash),contributedCapital:a.contributedCapital,retainedEarnings:incomeStatement.netProfit};
 balanceSheet.totalAssets=balanceSheet.cash+balanceSheet.inventory+balanceSheet.equipmentNet;balanceSheet.totalLiabilities=loanPrincipal+balanceSheet.overdraft;balanceSheet.totalEquity=balanceSheet.contributedCapital+balanceSheet.retainedEarnings;balanceSheet.liabilitiesAndEquity=balanceSheet.totalLiabilities+balanceSheet.totalEquity;balanceSheet.balanceDifference=balanceSheet.totalAssets-balanceSheet.liabilitiesAndEquity;
 const cashFlow={openingCash:a.openingCash,customerReceipts:t.revenue,stockPayments:t.stock,operatingPayments:expenseCategories.reduce((sum,k)=>sum+t[k],0),interestPayments:t.interest,investing:0-t.expansion-t.equipment,loanDraws:t.loanDraw,loanRepayments:t.loanRepayment};
 cashFlow.operating=cashFlow.customerReceipts-cashFlow.stockPayments-cashFlow.operatingPayments-cashFlow.interestPayments;cashFlow.financing=cashFlow.loanDraws-cashFlow.loanRepayments;cashFlow.netChange=cashFlow.operating+cashFlow.investing+cashFlow.financing;cashFlow.closingCash=s.cash;cashFlow.reconciliationDifference=s.cash-a.openingCash-cashFlow.netChange;
 const warnings=[];if(s.cash<0)warnings.push('現金不足を資金不足残高（負債）として表示しています。追加の自動借入や利用枠ではありません。');if(balanceSheet.totalEquity<0)warnings.push('ゲーム内で債務超過です。純資産がマイナスになっています。');if(a.basis.kind==='legacy-opening')warnings.push(a.basis.note);if(balanceSheet.balanceDifference||cashFlow.reconciliationDifference)warnings.push('帳簿の整合性に差額があります。');
 return {basis:clone(a.basis),balanceSheet,incomeStatement,cashFlow,warnings};
}
export function validateAccounting(s){
 const a=s.accounting;if(!a||a.version!==1||!a.basis||!['initial','legacy-opening'].includes(a.basis.kind)||!integer(a.basis.day)||a.basis.day<1||a.basis.day>s.day||!integer(a.basis.minute)||a.basis.minute<0||a.basis.minute>600||typeof a.basis.note!=='string'||a.basis.note.length>500)return '財務の開始情報が不正です';
 if(!bounded(a.openingCash)||!bounded(a.contributedCapital)||!['openingInventory','openingEquipment','costOfGoods','spoilageCost','depreciation'].every(k=>nonnegative(a[k]))||a.contributedCapital!==a.openingCash+a.openingInventory+a.openingEquipment||!integer(a.lastClosedDay)||a.lastClosedDay!==(s.phase==='closed'?s.day:s.day-1))return '財務の開始残高または費用が不正です';
 if(!a.openingFinanceTotals||categories.some(k=>!nonnegative(a.openingFinanceTotals[k])||!nonnegative(s.finance?.totals?.[k])||a.openingFinanceTotals[k]>s.finance.totals[k]))return '財務の累計開始値が不正です';
 if(a.openingFinanceTotals.loanDraw!==0||a.openingFinanceTotals.loanRepayment!==0||a.openingEquipment!==a.openingFinanceTotals.expansion+a.openingFinanceTotals.equipment)return '財務の設備または借入開始残高が不正です';
 if(!Array.isArray(a.assets)||a.assets.length>200000)return '固定資産の情報が不正です';
 for(const e of a.assets)if(!e||!Object.hasOwn(DEPRECIATION_DAYS,e.kind)||!nonnegative(e.cost)||e.cost===0||!integer(e.acquiredDay)||e.acquiredDay<a.basis.day||e.acquiredDay>s.day+1||e.usefulLife!==DEPRECIATION_DAYS[e.kind]||!integer(e.elapsedDays)||e.elapsedDays<0||e.elapsedDays>e.usefulLife||e.elapsedDays!==Math.min(e.usefulLife,Math.max(0,a.lastClosedDay-e.acquiredDay+1))||e.accumulatedDepreciation!==Math.floor(e.cost*e.elapsedDays/e.usefulLife))return '固定資産の償却情報が不正です';
 if(['expansion','equipment'].some(k=>a.assets.filter(e=>e.kind===k).reduce((n,e)=>n+e.cost,0)!==s.finance.totals[k])||a.depreciation!==a.assets.reduce((n,e)=>n+e.accumulatedDepreciation,0))return '固定資産と投資台帳が一致しません';
 const expectedInventory=a.openingInventory+delta(s,'stock')-a.costOfGoods-a.spoilageCost;if(expectedInventory!==inventoryValue(s))return '在庫と食材費の帳簿が一致しません';
 const statements=getFinancialStatements(s),b=statements.balanceSheet;if(!nonnegative(b.loanPrincipal)||b.loanPrincipal>LOAN_TERMS.limit||b.balanceDifference!==0||statements.cashFlow.reconciliationDifference!==0)return '貸借対照表または資金収支が一致しません';
 return null;
}
/** Validate retained statement snapshots without recomputing unavailable historical events. */
export function validateFinancialStatements(f){
 if(!f||typeof f!=='object'||!f.basis||!['initial','legacy-opening'].includes(f.basis.kind)||!integer(f.basis.day)||f.basis.day<1||f.basis.day>100000||!integer(f.basis.minute)||f.basis.minute<0||f.basis.minute>600||typeof f.basis.note!=='string'||f.basis.note.length>500||!Array.isArray(f.warnings)||f.warnings.length>10||f.warnings.some(x=>typeof x!=='string'||x.length>500))return '財務諸表の形式が不正です';
 const b=f.balanceSheet,i=f.incomeStatement,c=f.cashFlow;
 const keys={balanceSheet:['cash','inventory','equipmentCost','accumulatedDepreciation','equipmentNet','totalAssets','loanPrincipal','overdraft','totalLiabilities','contributedCapital','retainedEarnings','totalEquity','liabilitiesAndEquity','balanceDifference'],incomeStatement:['revenue','costOfGoods','grossProfit',...expenseCategories,'spoilageCost','depreciation','operatingProfit','interest','netProfit'],cashFlow:['openingCash','customerReceipts','stockPayments','operatingPayments','interestPayments','operating','investing','loanDraws','loanRepayments','financing','netChange','closingCash','reconciliationDifference']};
 if(Object.entries(keys).some(([section,names])=>!f[section]||names.some(k=>!bounded(f[section][k]))))return '財務諸表の数値が不正です';
 if(['cash','inventory','equipmentCost','accumulatedDepreciation','equipmentNet','totalAssets','loanPrincipal','overdraft','totalLiabilities'].some(k=>b[k]<0)||['revenue','costOfGoods',...expenseCategories,'spoilageCost','depreciation','interest'].some(k=>i[k]<0)||['customerReceipts','stockPayments','operatingPayments','interestPayments','loanDraws','loanRepayments'].some(k=>c[k]<0)||c.investing>0)return '財務諸表の金額符号が不正です';
 if(b.equipmentNet!==b.equipmentCost-b.accumulatedDepreciation||b.totalAssets!==b.cash+b.inventory+b.equipmentNet||b.totalLiabilities!==b.loanPrincipal+b.overdraft||b.totalEquity!==b.contributedCapital+b.retainedEarnings||b.liabilitiesAndEquity!==b.totalLiabilities+b.totalEquity||b.balanceDifference!==0||b.totalAssets!==b.liabilitiesAndEquity||b.retainedEarnings!==i.netProfit||b.cash!==Math.max(0,c.closingCash)||b.overdraft!==Math.max(0,-c.closingCash))return '貸借対照表の数値が一致しません';
 if(i.grossProfit!==i.revenue-i.costOfGoods||i.operatingProfit!==i.grossProfit-expenseCategories.reduce((sum,k)=>sum+i[k],0)-i.spoilageCost-i.depreciation||i.netProfit!==i.operatingProfit-i.interest)return '損益計算書の数値が一致しません';
 if(c.customerReceipts!==i.revenue||c.operatingPayments!==expenseCategories.reduce((sum,k)=>sum+i[k],0)||c.interestPayments!==i.interest||c.operating!==c.customerReceipts-c.stockPayments-c.operatingPayments-c.interestPayments||c.financing!==c.loanDraws-c.loanRepayments||c.netChange!==c.operating+c.investing+c.financing||c.reconciliationDifference!==0||c.closingCash!==c.openingCash+c.netChange)return '資金収支の数値が一致しません';
 return null;
}
