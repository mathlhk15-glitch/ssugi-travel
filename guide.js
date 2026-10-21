import {isDifferent,calculateBudget} from './core.js';

export function chooseRepresentatives(cards,max=4){
 const sorted=[...cards].sort((a,b)=>a.price-b.price||a.id.localeCompare(b.id));
 if(sorted.length<=max)return sorted.map(c=>c.id);
 const chosen=[sorted[0],sorted.at(-1)];
 for(const c of sorted){if(chosen.length>=max)break;if(!chosen.some(x=>x.agency===c.agency))chosen.push(c);}
 for(const c of sorted){if(chosen.length>=max)break;if(!chosen.includes(c))chosen.push(c);}
 return chosen.sort((a,b)=>a.price-b.price).map(c=>c.id);
}
export function foodFacts(p){
 const meals=p.days.flatMap(d=>Object.entries(d.meals).map(([slot,m])=>({...m,day:d.day,slot})));
 const special=meals.filter(m=>m.status==='포함'&&(m.menu_tags?.some(t=>['게요리','샤브샤브','해산물','가이세키'].includes(t))||/가이세키|연어\s*스테이크|해물|스시|초밥/.test(m.value||'')));
 return {meals,special,included:meals.filter(m=>m.status==='포함'),excluded:meals.filter(m=>m.status==='불포함'),unknown:meals.filter(m=>m.status==='미확인')};
}
export function comparisonExtras({cell,sourceText}){
 const add=(key,label,category,getter)=>({key,label,category,getter});
 const refs=ms=>ms.flatMap(m=>m.sources||[]);
 return [
  add('agency','여행사','tour',p=>cell(p.agency.value,p.agency.sources)),
  add('code','상품코드','tour',p=>cell(p.product_code.value,p.product_code.sources)),
  add('airports','출발·도착 공항','tour',p=>cell(p.flights.map(f=>`${f.direction==='outbound'?'출국':'귀국'}: ${f.departure_airport.value||'미확인'} → ${f.arrival_airport.value||'미확인'}`).join('\n'),p.flights.flatMap(f=>[...f.departure_airport.sources,...f.arrival_airport.sources]))),
  add('baggage','위탁수하물','tour',p=>cell(p.original_fields.checked_baggage.value||'상품 적용 허용량 미확인',p.original_fields.checked_baggage.sources)),
  ...[0,1,2].map(i=>add('city'+i,`${i+1}박째 숙박도시`,'hotel',p=>cell(p.days[i].hotel.overnight_city.value?.join(' / ')||'미확인',p.days[i].hotel.overnight_city.sources,'후보별 도시 · 최종 배정 아님'))),
  add('hotelDinner','호텔식 석식','meal',p=>{const ms=p.days.map(d=>d.meals.dinner).filter(m=>m.status==='포함'&&/호텔식/.test(m.value||''));return cell(ms.length?`${ms.length}회 기재 · `+ms.map(m=>m.value).join(' / '):'호텔식 석식 제공 미확인',refs(ms),'일반 호텔식과 뷔페·가이세키는 원문 메뉴로 구분');}),
  add('mealCount','전체 끼니 포함 상태','meal',p=>{const f=foodFacts(p);return cell(`포함 ${f.included.length} / 불포함 ${f.excluded.length} / 미확인 ${f.unknown.length}`,refs(f.meals),'4일 × 조·중·석식. 출국 전·귀국 후 끼니도 원문 상태 유지');}),
  add('specialMeals','메뉴가 명시된 특식','meal',p=>{const ms=foodFacts(p).special;return cell(ms.length?ms.map(m=>`${m.day}일차 ${m.slot==='lunch'?'중식':m.slot==='dinner'?'석식':'조식'}: ${m.value}`).join('\n'):'포함 특식 메뉴 미확인',refs(ms),'구체 메뉴가 있는 포함 끼니만 집계 · 같은 끼니의 메뉴를 중복 횟수로 세지 않음');}),
  ...['가이세키','게요리','해산물','뷔페'].map(t=>add('menu'+t,t+' 안내','meal',p=>{const ms=foodFacts(p).included.filter(m=>(m.menu_tags||[]).includes(t)||(m.value||'').includes(t));return cell(ms.length?ms.map(m=>`${m.day}일차: ${m.value}`).join('\n'):'포함 메뉴 기재 미확인',refs(ms));})),
  add('excludedMeal','불포함·자유식','meal',p=>{const ms=foodFacts(p).meals.filter(m=>m.status==='불포함'||/자유식/.test(m.value||''));return cell(ms.length?ms.map(m=>`${m.day}일차 ${m.slot==='lunch'?'중식':m.slot==='dinner'?'석식':'조식'}: ${m.value||'미확인'} (${m.status})`).join('\n'):'해당 식사 기재 미확인',refs(ms));}),
  ...[0,1,2,3].map(i=>add('sites'+i,`${i+1}일차 방문 순서`,'tour',p=>cell(p.days[i].sites.map(s=>s.name).join(' → ')||'개별 방문지 미확인',p.days[i].sites.flatMap(s=>s.sources),'정리된 원문 방문 순서. 자유여행 추천지는 포함관광이 아님'))),
  ...[0,1,2,3].map(i=>add('transportMode'+i,`${i+1}일차 이동수단`,'tour',p=>{const segments=p.days[i].transport.segments.filter(s=>s.mode.value);return cell(segments.length?segments.map(s=>`${s.segment.value}: ${s.mode.value}`).join('\n'):'이동수단 미확인',segments.flatMap(s=>s.mode.sources),'구간에 명시된 이동수단만 표시');})),
  add('freeTime','자유시간 안내','tour',p=>{const xs=p.days.flatMap(d=>d.free_time.map(x=>({...x,day:d.day})));return cell(xs.length?xs.map(x=>`${x.day}일차: ${x.value}`).join('\n'):'자유시간 미확인',refs(xs));}),
  add('paidExceptions','별도 유료 관광·체험','tour',p=>cell(p.tour_admission.known_paid_exceptions.map(x=>x.text).join('\n')||'개별 유료 예외 미확인',p.tour_admission.known_paid_exceptions.flatMap(x=>x.sources),'무료 관광·상품가 포함 관광·추가 유료 관광은 별개')),
  add('upgradeTerms','호텔 변경·추가요금 조건','hotel',p=>cell('호텔·객실 업그레이드 확정요금 미확인',p.costs.hotel_upgrade.observations.flatMap(x=>x.sources),'기본 포함 식사 업그레이드 문구를 객실 변경요금으로 취급하지 않음')),
  add('cancelRules','기재된 취소수수료','terms',p=>cell(p.terms.cancellation_rules.map(x=>x.text).join('\n')||'취소구간별 수수료 미확인',p.terms.sources,'실제 적용 약관·발권시점 별도 확인')),
  add('departureGuarantee','출발 보장 여부','terms',()=>cell('출발 보장·현재 행사 확정 미확인',[],'최소 출발인원과 출발 확정은 다름')),
 ];
}

export async function initGuide(api){
 const {catalog,state,getProduct,getFields,cell,esc,won,number,label,badge,evidence,photoButton,hotelPhoto,facilityText,changeSelection,sourceText,toast}=api;
 const $=s=>document.querySelector(s),byId=Object.fromEntries(catalog.cards.map(c=>[c.id,c]));
 let autoGroup=catalog.groups.find(g=>g.member_ids.length>=2).route_group_id,autoIds=[],autoDiff=true,focus='hotel',revision=0;
 let favorites=[];try{favorites=JSON.parse(localStorage.getItem('hokkaido-favorites')||'[]').filter(id=>byId[id]);}catch{}
 const currentIds=()=>state.selected.length?state.selected:autoIds;
 const getAll=()=>Promise.all(catalog.cards.map(c=>getProduct(c.id)));
 const getMany=ids=>Promise.all(ids.map(getProduct));
 const title=p=>`${label(byId[p.comparison_id])} · ${p.name.value}`;
 const summaryName=id=>`${label(byId[id])} · ${won(byId[id].price)}`;
 const selectOptions=(ids,selected)=>ids.map(id=>`<option value="${id}" ${id===selected?'selected':''}>${esc(summaryName(id))} · ${esc(byId[id].name)}</option>`).join('');
 function table(products,fields,only=false){
  if(!products.length)return '<p class="info-note">이 조건에 맞는 상품이 없습니다.</p>';
  let rows=fields.map(f=>({...f,cells:products.map(f.getter)}));rows.forEach(f=>f.diff=isDifferent(f.cells.map(c=>c.text)));
  if(only&&products.length>1)rows=rows.filter(f=>f.diff);rows.sort((a,b)=>Number(b.diff)-Number(a.diff));
  return `<p class="scroll-hint">↔ 표를 옆으로 밀어 후보를 비교하세요. 항목 이름은 고정됩니다.</p><div class="table-scroll guide-table-scroll" tabindex="0" aria-label="상품 조건 비교표"><table class="guide-table" style="min-width:${150+products.length*235}px"><thead><tr><th scope="col">비교 항목</th>${products.map(p=>`<th scope="col">${badge(byId[p.comparison_id].agency)}<strong>${esc(label(byId[p.comparison_id]))}</strong><span>${esc(p.name.value)}</span><small>${esc(p.departure_date.value)} · ${esc(p.duration.value.label)}</small><b>${won(p.adult_price.value)}</b><button class="evidence-button" data-action="detail" data-id="${p.comparison_id}">상품 자세히 ↗</button></th>`).join('')}</tr></thead><tbody>${rows.map(f=>`<tr class="${f.diff?'different':'common'}" data-field="${esc(f.key)}"><th scope="row">${esc(f.label)}${f.diff?'<small class="diff-mark">차이</small>':''}</th>${f.cells.map(c=>`<td><div class="cell-text">${esc(c.text)}</div>${c.note?`<small>${esc(c.note)}</small>`:''}${evidence(c.sources)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${products.length+1}">표시상 다른 항목이 없습니다. 미확인이 같다고 같은 조건은 아닙니다.</td></tr>`}</tbody></table></div>`;
 }
 function replacementControls(ids,allowed,kind){return ids.map((id,i)=>`<label class="replace-label">${i+1}번 상품 교체<select data-guide-replace="${kind}" data-slot="${i}" aria-label="${kind==='auto'?'자동':'직접'} 비교 ${i+1}번 상품 교체">${selectOptions(allowed,id)}</select></label>`).join('');}
 async function renderAuto(reset=true){
  const token=++revision;$('#autoPanel').setAttribute('aria-busy','true');const group=catalog.groups.find(g=>g.route_group_id===autoGroup);const members=catalog.cards.filter(c=>c.group===autoGroup);
  if(reset)autoIds=chooseRepresentatives(members);
  $('#autoGroups').innerHTML=catalog.groups.map(g=>`<button data-guide-group="${g.route_group_id}" aria-pressed="${g.route_group_id===autoGroup}">${esc(g.label)} <small>${g.member_ids.length}개</small></button>`).join('');
  const products=await getMany(autoIds);if(token!==revision)return;
  const allFields=getFields();const chosenKeys=['price','guide','shopping','hotel0','hotel1','hotel2','hotelDinner','specialMeals','options','flight0','departure'];
  const fields=allFields.filter(f=>chosenKeys.includes(f.key));
  const common=allFields.filter(f=>!isDifferent(products.map(p=>f.getter(p).text))).filter(f=>['duration','shopping','guide','options','airline'].includes(f.key));
  const low=Math.min(...members.map(c=>c.price)),high=Math.max(...members.map(c=>c.price));
  const priceOrdered=[...products].sort((a,b)=>a.adult_price.value-b.adult_price.value);
  const ends=[priceOrdered[0],priceOrdered.at(-1)];
  const pairedFacts=allFields.filter(f=>['guide','shopping','hotel0','specialMeals'].includes(f.key)).map(f=>({f,values:ends.map(f.getter)})).filter(x=>isDifferent(x.values.map(v=>v.text)));
  const priceContext=products.length>1?`<div class="price-context"><h4>${esc(label(byId[ends[0].comparison_id]))} ↔ ${esc(label(byId[ends[1].comparison_id]))}: 가격 차이와 함께 확인할 조건</h4>${pairedFacts.map(({f,values})=>`<p><b>${esc(f.label)}</b><br>${esc(label(byId[ends[0].comparison_id]))}: ${esc(values[0].text)}<br>${esc(label(byId[ends[1].comparison_id]))}: ${esc(values[1].text)} ${evidence(values.flatMap(v=>v.sources))}</p>`).join('')||'<p>핵심 포함 조건의 차이는 미확인입니다. 항공·예약 조건 등 전체 비교표를 확인하세요.</p>'}<small>동시에 관찰되는 조건의 차이입니다. 가격 차액의 원인·원가 배분을 확인한 것은 아닙니다.</small></div>`:'';
  $('#autoPanel').innerHTML=`<div class="guide-box auto-box"><h3>${esc(group.label)}</h3><p>${esc(group.variant_note||'유사한 코스 안에서도 호텔·식사·항공 조건이 다릅니다.')}</p><p class="guide-rule">대표 선정: 4개 이하면 전부, 초과하면 표시가 최저·최고를 포함하고 다른 여행사를 낮은 가격순으로 우선 채웁니다. 점수·품질 순위가 아닙니다.</p><div class="guide-controls">${replacementControls(autoIds,group.member_ids,'auto')}</div><div class="guide-controls"><label><input type="checkbox" id="autoDiff" ${autoDiff?'checked':''}> 차이만 보기</label><button class="button primary" data-guide="use-auto">이 후보로 직접 비교·경비 계산</button></div><p class="guide-price-note">이 코스 표시가 ${won(low)} ~ ${won(high)} · 차이 ${won(high-low)}. 아래 동반 조건을 확인하세요. 차액을 특정 호텔·식사의 원가로 단정하지 않습니다.</p>${table(products,fields,autoDiff)}<details class="guide-common"><summary>공통사항 ${common.length}개 펼치기</summary>${common.map(f=>{const c=f.getter(products[0]);return `<p><b>${esc(f.label)}</b> ${esc(c.text)} ${evidence(products.flatMap(p=>f.getter(p).sources))}</p>`;}).join('')||'<p>핵심 공통 조건은 상세 비교표를 확인하세요.</p>'}</details><details class="group-members"><summary>이 코스 전체 ${members.length}개 상품 확인</summary><div class="member-grid">${members.sort((a,b)=>a.price-b.price).map(c=>`<article><b>${esc(label(c))} · ${won(c.price)}</b><p>${esc(c.name)}</p><p>${esc(c.departure)} · ${esc(c.duration)}</p><button class="text-link" data-action="detail" data-id="${c.id}">일정·호텔·근거 ↗</button><button class="text-link" data-guide-add="${c.id}">직접 비교에 추가</button></article>`).join('')}</div></details></div>`;
  $('#autoPanel').dataset.group=group.route_group_id;$('#autoPanel').setAttribute('aria-busy','false');
  if(priceContext)$('#autoPanel .guide-price-note').insertAdjacentHTML('afterend',priceContext);
  if(!state.selected.length)await renderFocus();
 }
 let wholeVersion=0;
 async function renderWhole(){
  if(!$('#allTableDetails').open)return;
  const ids=catalog.cards.filter(c=>($('#allGroup').value==='all'||c.group===$('#allGroup').value)&&($('#allAgency').value==='all'||c.agency===$('#allAgency').value)).sort((a,b)=>a.price-b.price).map(c=>c.id);
  const version=++wholeVersion;const products=await getMany(ids);if(version!==wholeVersion)return;const category=$('#allCategory').value;
  $('#allTableContent').innerHTML=`<p class="soft-note">${ids.length}개 상품</p>`+table(products,getFields().filter(f=>category==='all'||f.category===category),$('#allDiff').checked);
 }
 function risk(p){const c=byId[p.comparison_id];return c.guide.status==='미확인'?'현지 필수경비 미확인':c.guide.status==='불포함'?'표시가 외 가이드·기사비 별도':'가이드·기사비 포함 · 기타 지출 확인';}
 async function renderConclusions(){
  const sorted=[...catalog.cards].sort((a,b)=>a.price-b.price);
  const categories=[['표시가가 가장 낮은 후보',sorted[0],'전체 코스·포함 조건이 같은 최저가는 아닙니다.'],['패키지 중 표시가 낮은 후보',sorted.find(c=>c.style!=='자유여행형'),'자유여행과 패키지를 구분해 살펴보세요.'],['쇼핑 0회 패키지 중 낮은 표시가',sorted.find(c=>c.shopping===0&&c.style!=='자유여행형'),'쇼핑센터 방문 횟수 기준입니다.'],['가이드·기사 경비 포함 중 낮은 표시가',sorted.find(c=>c.guide.status==='포함'),'그 밖의 식사·선택 지출은 별도 확인하세요.']];
  $('#conclusionCards').innerHTML=(await Promise.all(categories.map(async([heading,c,note])=>{const p=await getProduct(c.id);return `<article class="conclusion-card" style="--edge:${api.agencyColor(c.agency)}"><h3>${esc(heading)}</h3><strong>${esc(label(c))} · ${won(c.price)}</strong><p>${esc(c.name)}</p><p>${c.style==='자유여행형'?'자유여행 · 포함 관광과 패키지 관광을 구분':esc(c.duration)+' · 석식 '+c.dinnersIncluded+'회 포함 확인'}<br>${esc(risk(p))}</p><small>${esc(note)}</small><div>${evidence([...p.adult_price.sources,...p.shopping.count.sources,...p.costs.guide_driver.sources])}<button class="text-link" data-action="detail" data-id="${c.id}">이 상품 보기 ↗</button></div></article>`;}))).join('');
 }
 let focusVersion=0;
 async function renderFocus(){
  const token=++focusVersion,products=await getMany(currentIds());if(token!==focusVersion)return;
  $('#focusTabs').querySelectorAll('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus===focus)));
  const context=`<p class="info-note">${state.selected.length?'직접 선택':'자동 코스 대표'} ${products.length}개 · ${products.map(p=>esc(label(byId[p.comparison_id]))).join(' / ')}. 다른 후보는 자동 비교 또는 직접 비교에서 교체하세요.</p>`;
  if(focus==='hotel'){
   $('#focusContent').innerHTML=context+[0,1,2].map(i=>`<details class="guide-box focus-night" ${i===0?'open':''}><summary><strong>${i+1}박째 · 도시·호텔·욕장·석식</strong><span>예정호텔과 후보별 조건 ⌄</span></summary><div class="focus-card-grid">${products.map(p=>{const d=p.days[i],h=d.hotel,c=byId[p.comparison_id],photo=hotelPhoto(h.candidates.map(x=>x.name.value));return `<article class="focus-card"><h3>${badge(c.agency)} ${esc(label(c))}</h3>${photo?photoButton(photo):'<div class="photo-placeholder">일치하는 호텔 사진 미확인</div>'}<p class="fine-print">${photo?esc(photo.label)+' · 참고 예시 · 실제 배정 아님':''}</p><b>숙박도시: ${esc(h.overnight_city.value?.join(' / ')||'미확인')}</b>${evidence(h.overnight_city.sources)}${h.candidates.map(x=>`<p class="hotel-candidate"><strong>${esc(x.name.value)}</strong><br>등급 ${esc(x.grade.value||'미확인')} · 예정 / 동급 대체 가능 ${evidence([...x.name.sources,...x.grade.sources])}</p>`).join('')}<dl><dt>온천</dt><dd>${esc(facilityText(h.onsen_status,'온천'))} ${evidence(h.onsen_status.sources)}</dd><dt>대욕장</dt><dd>${esc(facilityText(h.public_bath_status,'대욕장'))} ${evidence(h.public_bath_status.sources)}</dd><dt>노천탕</dt><dd>${esc(facilityText(h.open_air_bath_status,'노천탕'))} ${evidence(h.open_air_bath_status.sources)}</dd><dt>객실 조건</dt><dd>${esc(h.room_conditions.map(v=>v.value).join(' / ')||'미확인')} ${evidence(h.room_conditions.flatMap(v=>v.sources))}</dd><dt>석식</dt><dd>${esc(d.meals.dinner.value||'미확인')} · ${esc(d.meals.dinner.status)} ${evidence(d.meals.dinner.sources)}</dd></dl><details><summary>호텔 변경·추가요금 조건</summary><p>호텔·객실 업그레이드 확정요금 미확인. 포함 식사의 업그레이드 표현과 객실 변경은 별개입니다. ${evidence(p.costs.hotel_upgrade.observations.flatMap(x=>x.sources))}</p></details><p class="fine-print">시설은 일차별 안내이며 대체 후보 전체에 공통 보장되지 않습니다.</p></article>`;}).join('')}</div></details>`).join('');
  }else if(focus==='meal'){
   const fields=getFields().filter(f=>f.category==='meal');
   $('#focusContent').innerHTML=context+`<div class="menu-summary-grid">${products.map(p=>{const f=foodFacts(p);return `<article class="guide-box"><h3>${esc(label(byId[p.comparison_id]))}의 식사</h3><p>포함 ${f.included.length} · 불포함 ${f.excluded.length} · 미확인 ${f.unknown.length}끼니</p><p>구체 특식이 기재된 포함 끼니 <b>${f.special.length}회</b></p>${f.special.map(m=>`<p>${m.day}일차 ${m.slot==='lunch'?'중식':m.slot==='dinner'?'석식':'조식'}: ${esc(m.value)} ${evidence(m.sources)}</p>`).join('')||'<p>구체 메뉴 미확인</p>'}<p class="fine-print">같은 끼니의 게·샤브샤브는 1회입니다. 일반 호텔식/뷔페만 기재된 끼니는 특식 횟수에서 제외합니다.</p></article>`;}).join('')}</div>${table(products,fields)}`;
  }else{
   const siteNames=[...new Set(products.flatMap(p=>p.travel_style.value==='자유여행형'?[]:p.days.flatMap(d=>d.sites.map(s=>s.name))))];
   const siteFields=siteNames.map(name=>({key:'site-'+name,label:name,getter:p=>{const entries=p.days.flatMap(d=>d.sites.filter(s=>s.name===name).map(s=>({...s,day:d.day})));return cell(p.travel_style.value==='자유여행형'?'자유일정 · 포함 방문 미확인':entries.length?entries.map(s=>s.day+'일차 방문 기재').join(' / '):'방문 기재 미확인',entries.flatMap(s=>s.sources),'미기재는 미방문 확정이 아님. 입장료는 일반 정책과 예외 별도 확인');}}));
   $('#focusContent').innerHTML=context+`<div class="movement-cards">${products.map(p=>{const sites=p.days.flatMap(d=>d.sites);return `<article class="guide-box"><h3>${esc(label(byId[p.comparison_id]))}의 동선</h3><p>${p.travel_style.value==='자유여행형'?'자유일정 · 추천지 수를 포함관광 수로 세지 않음':'방문지 이름 '+new Set(sites.map(s=>s.name)).size+'개 기재'}</p>${p.days.map(d=>{const stated=d.transport.segments.filter(s=>s.stated_minutes!==null);return `<p><b>${d.day}일차</b> ${esc(d.sites.map(s=>s.name).join(' → ')||'개별 코스 미확인')} ${evidence(d.sites.flatMap(s=>s.sources))}<br>${stated.length?stated.map(s=>`${esc(s.segment.value)}: ${esc(s.display_duration)} · ${esc(s.mode.value||'이동수단 미확인')} ${evidence(s.sources)}`).join('<br>'):'이동시간 미확인'}<br><small>하루 전체 이동·관광시간 미확인${d.transport.stated_segments_partial_sum_minutes!==null?' · 명시 구간 부분합 '+d.transport.stated_segments_partial_sum_minutes+'분':''}</small></p>`;}).join('')}<p class="fine-print">방문지 수·명시 구간만 비교하며 이동 피로도나 여유를 점수화하지 않습니다.</p></article>`;}).join('')}</div><details class="guide-box"><summary>관광지 방문 여부·입장료·자유시간 비교 ⌄</summary>${table(products,[...siteFields,...getFields().filter(f=>['freeTime','admission','paidExceptions','options'].includes(f.key))])}</details>`;
  }
 }
 function decorateCards(){
  $('#productGrid').querySelectorAll('.product-card').forEach(card=>{let btn=card.querySelector('.favorite-button');if(!btn){btn=document.createElement('button');btn.className='favorite-button';btn.dataset.guideSave=card.dataset.card;card.querySelector('.card-top').append(btn);}const on=favorites.includes(card.dataset.card);const text=on?'♥ 저장됨':'♡ 관심';if(btn.textContent!==text)btn.textContent=text;btn.setAttribute('aria-pressed',String(on));btn.setAttribute('aria-label',label(byId[card.dataset.card])+' 관심상품 '+(on?'해제':'저장'));});
 }
 function renderFavorites(){
  $('#favoriteCount').textContent=favorites.length;
  $('#favoriteList').innerHTML=favorites.length?`<p>한 번에 최대 4개를 비교합니다. 관심상품은 이 브라우저에만 저장됩니다.</p><div class="member-grid">${favorites.map(id=>`<article><b>${esc(summaryName(id))}</b><p>${esc(byId[id].name)}</p><button class="text-link" data-action="detail" data-id="${id}">상세 보기</button> <button class="text-link" data-guide-add="${id}">비교에 추가</button> <button class="text-link" data-guide-save="${id}">저장 해제</button></article>`).join('')}</div><button class="button quiet" data-guide="compare-favorites">관심상품 앞 4개 비교</button>`:'<p>상품 카드의 ♡ 관심을 눌러 저장하세요.</p>';
 }
 function criteria(p,key){
  const c=byId[p.comparison_id],f=foodFacts(p);
  const definitions={onsen:[p.days.some(d=>d.hotel.onsen_status.value===true),'일차별 온천 안내 기재',p.days.flatMap(d=>d.hotel.onsen_status.sources)],bath:[p.days.some(d=>d.hotel.public_bath_status.value===true),'일차별 대욕장 안내 기재',p.days.flatMap(d=>d.hotel.public_bath_status.sources)],food:[f.special.length>0,'포함 특식: '+f.special.map(m=>m.value).join(' / '),f.special.flatMap(m=>m.sources)],biei:[c.style!=='자유여행형'&&c.regions.includes('비에이'),'비에이 방문 확인',p.route.core_regions['비에이']||[]],noshop:[c.shopping===0,'쇼핑센터 0회',p.shopping.count.sources],guide:[c.guide.status==='포함','가이드·기사 경비 포함',p.costs.guide_driver.sources],dinner:[c.dinnersIncluded===3,'저녁 3회 포함 확인',p.days.slice(0,3).flatMap(d=>d.meals.dinner.sources)],free:[p.days.some(d=>d.free_time.length),'자유시간 안내 기재 · 이동이 적다는 뜻은 아님',p.days.flatMap(d=>d.free_time.flatMap(x=>x.sources))]};
  return definitions[key];
 }
 let preferenceVersion=0;
 async function renderPreferences(){
  const version=++preferenceVersion,keys=[...$('#preferenceForm').querySelectorAll('input:checked')].map(el=>el.value);
  if(!keys.length){$('#preferenceResults').innerHTML='<p class="info-note">조건을 하나 이상 골라주세요. 점수 없이 확인된 포함 조건으로 후보를 좁힙니다.</p>';return;}
  const products=await getAll();if(version!==preferenceVersion)return;
  const matches=products.filter(p=>keys.every(key=>criteria(p,key)[0])).sort((a,b)=>a.adult_price.value-b.adult_price.value);
  $('#preferenceResults').innerHTML=`<p class="guide-count">선택한 모든 조건을 충족한 후보 <b>${matches.length}개</b> · 표시가 낮은 순</p><div class="preference-results">${matches.map(p=>`<article class="guide-box"><h3>${esc(title(p))}</h3><strong>${won(p.adult_price.value)}</strong><ul>${keys.map(key=>{const [,text,refs]=criteria(p,key);return `<li>${esc(text)} ${evidence(refs)}</li>`;}).join('')}</ul><p class="warn-text">${esc(risk(p))} · 호텔은 예정</p><button class="button quiet" data-action="detail" data-id="${p.comparison_id}">일정·근거 보기</button><button class="button primary" data-guide-add="${p.comparison_id}">비교에 추가</button></article>`).join('')||'<p class="info-note">동시에 충족하는 후보가 없습니다. 조건을 줄여보세요. 충족하지 않는 상품을 임의로 추천하지 않습니다.</p>'}</div>`;
 }
 function syncSelection(){
  $('#manualReplacements').innerHTML=state.selected.length?replacementControls(state.selected,catalog.cards.map(c=>c.id),'manual'):'';
  renderFocus().catch(api.showError);printReport(false).catch(api.showError);
 }
 async function clipboard(text){try{await navigator.clipboard.writeText(text);toast('복사했습니다.');}catch{const box=document.createElement('textarea');box.value=text;document.body.append(box);box.select();const ok=document.execCommand('copy');box.remove();toast(ok?'복사했습니다.':'복사 권한을 확인해 주세요.');}}
 function share(){const u=new URL(location.href);u.hash='compare';u.search='';u.searchParams.set('compare',state.selected.join(','));for(const key of ['agency','route','date','shopping','guide','dinner','search','sort','maxPrice'])if(state[key]!==api.initial[key])u.searchParams.set(key,String(state[key]));if(state.onsen)u.searchParams.set('onsen','1');clipboard(u.href);}
 let printVersion=0;
 async function printReport(open=true){
  const version=++printVersion;
  const ids=[...state.selected];if(!ids.length){$('#printReport').innerHTML='<h1>홋카이도 비교 보고서</h1><p>웹사이트에서 인쇄할 상품을 먼저 선택해 주세요.</p>';if(open)toast('인쇄할 상품을 먼저 선택해 주세요.');return;}
  const products=await getMany(ids);if(version!==printVersion)return;
  $('#printReport').innerHTML=`<h1>홋카이도 여행상품 비교</h1><p>자료 기준 ${esc(catalog.as_of)} · 원문 표시가 / 예정호텔 · 예약 확정 견적 아님</p>${products.map(p=>{const c=byId[p.comparison_id],calc=calculateBudget(c,{...state.budget,productExtra:state.productExtras[c.id]??0});return `<article><h2>${esc(title(p))}</h2><p>${esc(c.code)} · ${esc(c.departure)} · ${esc(c.duration)} · ${won(c.price)}</p><p>쇼핑 ${c.shopping??'미확인'}회 · ${esc(risk(p))}</p>${calc.valid?`<p>일행 ${calc.people}인 예상 원화 부분합 ${won(calc.estimateKRW)}${calc.currencyConversionPending?' + '+number(calc.yenTotal)+'엔 별도':''} · 1인 평균 ${won(Math.round(calc.perPersonKRW))}. 사용자 가정 포함 / 미확인 비용 미포함.</p>${calc.unresolved.length?'<p>확인 필요: '+esc(calc.unresolved.join(' / '))+'</p>':''}`:'<p>계산 입력값 확인 필요</p>'}${p.days.map(d=>`<div><h3>${d.day}일차</h3><p>${esc(d.sites.map(s=>s.name).join(' → ')||'개별 코스 미확인')}</p><p>예정호텔: ${esc(d.hotel.candidates.map(h=>h.name.value).join(' / ')||'미확인')}</p><p>${Object.entries(d.meals).map(([key,m])=>`${{breakfast:'조식',lunch:'중식',dinner:'석식'}[key]}: ${esc(m.value||'미확인')} (${esc(m.status)})`).join(' · ')}</p></div>`).join('')}<p>선택관광 ${esc(p.optional_tours.status)} · 취소 ${esc(p.terms.cancellation_status)}</p><p>원본: ${esc(p.file_name)} · 가격 ${p.adult_price.sources.map(id=>p.source_index[id]?.page).filter(Boolean).join(', ')}페이지. 자세한 근거는 웹사이트의 원문 버튼 참조.</p><p>예약 전: 호텔 확정·객실·욕장 운영·식사 메뉴·추가비용·실제 적용 취소료를 확인하세요.</p></article>`;}).join('')}`;
  if(open)window.print();
 }
 $('#allGroup').innerHTML+='<option disabled>────────</option>'+catalog.groups.map(g=>`<option value="${g.route_group_id}">${esc(g.label)}</option>`).join('');
 $('#allAgency').innerHTML+=[...new Set(catalog.cards.map(c=>c.agency))].map(a=>`<option>${esc(a)}</option>`).join('');
 $('#allTableDetails').addEventListener('toggle',()=>renderWhole().catch(api.showError));
 for(const id of ['allGroup','allAgency','allCategory','allDiff'])$('#'+id).addEventListener('change',()=>renderWhole().catch(api.showError));
 $('#preferenceForm').addEventListener('change',()=>renderPreferences().catch(api.showError));
 $('#shareCompare').addEventListener('click',share);$('#printCompare').addEventListener('click',()=>printReport().catch(api.showError));
 document.addEventListener('click',async event=>{try{
  const group=event.target.closest('[data-guide-group]');if(group){autoGroup=group.dataset.guideGroup;await renderAuto();return;}
  const f=event.target.closest('[data-focus]');if(f){focus=f.dataset.focus;await renderFocus();return;}
  const save=event.target.closest('[data-guide-save]');if(save){const id=save.dataset.guideSave;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];try{localStorage.setItem('hokkaido-favorites',JSON.stringify(favorites));}catch{toast('이 브라우저에서는 저장이 제한됩니다.');}decorateCards();renderFavorites();return;}
  const add=event.target.closest('[data-guide-add]');if(add){api.selectProduct(add.dataset.guideAdd);return;}
  const b=event.target.closest('[data-guide]');if(b){if(b.dataset.guide==='use-auto'){changeSelection(autoIds);$('#compare').scrollIntoView({behavior:'smooth'});}if(b.dataset.guide==='compare-favorites'){changeSelection(favorites.slice(0,4));$('#compare').scrollIntoView({behavior:'smooth'});}}
 }catch(e){api.showError(e);}});
 document.addEventListener('change',async event=>{try{const sel=event.target.closest('[data-guide-replace]');if(sel){const ids=sel.dataset.guideReplace==='auto'?[...autoIds]:[...state.selected];const i=Number(sel.dataset.slot);if(ids.some((id,j)=>j!==i&&id===sel.value)){toast('이미 비교 중인 상품입니다. 다른 상품을 골라주세요.');sel.value=ids[i];return;}ids[i]=sel.value;if(sel.dataset.guideReplace==='auto'){autoIds=ids;await renderAuto(false);}else changeSelection(ids);}if(event.target.id==='autoDiff'){autoDiff=event.target.checked;await renderAuto(false);}}catch(e){api.showError(e);}});
 const observer=new MutationObserver(decorateCards);observer.observe($('#productGrid'),{childList:true});decorateCards();renderFavorites();await renderPreferences();
 await Promise.all([renderConclusions(),renderAuto()]);syncSelection();
 return {syncSelection,renderWhole,printReport,updateBudget:()=>{renderWhole().catch(api.showError);printReport(false).catch(api.showError);}};
}
