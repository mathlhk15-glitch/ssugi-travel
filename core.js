/** Pure calculation and comparison helpers. No DOM and no network. */
export function finiteNumber(value,{min=0,max=1e9,integer=false,empty=null}={}){if(value===''||value===null||value===undefined)return empty;const n=Number(value);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))return null;return n;}
export function calculateBudget(card,settings={}){
 const people=finiteNumber(settings.people??1,{min:1,max:20,integer:true});
 const singles=finiteNumber(settings.singles??0,{min:0,max:20,integer:true});
 const rate=finiteNumber(settings.rate??'',{min:.01,max:1000});
 const fields=['meal','upgrade','other','option','productExtra'];const values={};const errors=[];
 if(people===null)errors.push('성인 인원은 1~20명의 정수로 입력해 주세요.');
 if(singles===null||singles>people)errors.push('1인실 인원은 성인 인원 이하의 정수로 입력해 주세요.');
 if(settings.rate!==''&&settings.rate!==null&&settings.rate!==undefined&&rate===null)errors.push('가정 환율은 0보다 큰 숫자로 입력해 주세요.');
 for(const field of fields){values[field]=finiteNumber(settings[field]??0,{min:0,max:10000000});if(values[field]===null)errors.push('추가 예산은 0 이상의 숫자로 입력해 주세요.');}
 if(errors.length)return {valid:false,errors:[...new Set(errors)]};
 const guide=card.guide?.status==='불포함'?card.guide.value:null;
 const single=card.single?.value;
 const base=card.price*people;
 const guideKRW=guide?.currency==='KRW'?guide.amount*people:0;
 const guideJPY=guide?.currency==='JPY'?guide.amount*people:0;
 const singleKRW=single?.currency==='KRW'?single.amount*singles:0;
 const singleJPY=single?.currency==='JPY'?single.amount*singles:0;
 const documentedKRW=base+guideKRW+singleKRW;
 const documentedJPY=guideJPY+singleJPY;
 const assumedKRW=(values.meal+values.upgrade+values.other+values.productExtra)*people;
 const assumedJPY=values.option*people;
 const yenTotal=documentedJPY+assumedJPY;
 const convertedJPY=rate===null?null:Math.round(yenTotal*rate);
 const estimateKRW=documentedKRW+assumedKRW+(convertedJPY??0);
 const unresolved=[];
 if(card.guide?.status==='미확인')unresolved.push('가이드·기사 및 현지 필수경비');
 if(singles>0&&!single)unresolved.push('1인실 추가요금');
 if(card.style==='자유여행형')unresolved.push('불포함 식사·공항 개별 이동 비용');
 return {valid:true,people,singles,rate,base,guideKRW,guideJPY,singleKRW,singleJPY,documentedKRW,documentedJPY,assumedKRW,assumedJPY,yenTotal,convertedJPY,estimateKRW,
   currencyConversionPending:yenTotal>0&&rate===null,unresolved,totalIsConfirmed:false,errors:[]};
}
export function fieldSignature(value){if(value===null||value===undefined||value==='')return '미확인';return String(value).replace(/\s+/g,' ').trim();}
export function isDifferent(values){return new Set(values.map(fieldSignature)).size>1;}
export function addSelection(selected,id,validIds,max=4){if(!validIds.includes(id))return {ids:selected,error:'존재하지 않는 상품입니다.'};if(selected.includes(id))return {ids:selected,error:'이미 비교 목록에 담긴 상품입니다.'};if(selected.length>=max)return {ids:selected,error:'최대 4개까지 비교할 수 있어요. 먼저 선택한 상품을 하나 지워주세요.'};return {ids:[...selected,id],error:null};}
