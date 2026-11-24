/* Simple Budget — no analytics, accounts, or remote requests. */
(() => {
  'use strict';
  const STORE_KEY = 'simple-budget-local-v1';
  const $ = id => document.getElementById(id);
  const DEFAULT_CATEGORIES = ['Food', 'Gas', 'Entertainment', 'Girlfriend', 'Utilities'];
  const DEFAULT_UTILITIES = [
    {id:'electric', name:'Electric', amount:0},
    {id:'heat', name:'Heat', amount:0},
    {id:'water', name:'Water', amount:0},
    {id:'internet', name:'Internet', amount:0}
  ];
  const initial = () => ({schema:1, utilitiesBucketNeeds:true, categories:[...DEFAULT_CATEGORIES], utilityDefaults:structuredClone(DEFAULT_UTILITIES), months:{}});
  // Upgrade existing on-device records from the original Wants-only Utilities behavior.
  function migrateUtilitiesToNeeds(stored) {
    if (stored.utilitiesBucketNeeds !== true) {
      for (const m of Object.values(stored.months || {})) {
        for (const e of (m.entries || [])) {
          if (e.kind === 'expense' && e.category === 'Utilities') e.bucket = 'needs';
        }
      }
      stored.utilitiesBucketNeeds = true;
    }
    return stored;
  }
  // Version 5 adds date-only transaction dates, keeping the same storage key and schema
  // so existing iPhone budget data and exported backups remain compatible.
  const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  function validDate(text) {
    if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const [y,m,d] = text.split('-').map(Number);
    const v = new Date(y,m-1,d);
    return v.getFullYear()===y && v.getMonth()===m-1 && v.getDate()===d;
  }
  function upgradeEntryDates(stored) {
    for (const [key, m] of Object.entries(stored.months || {})) {
      for (const e of (m.entries || [])) {
        if (!validDate(e.date)) {
          const created = e.createdAt ? new Date(e.createdAt) : null;
          const candidate = created && !Number.isNaN(created.getTime()) ?
            `${created.getFullYear()}-${String(created.getMonth()+1).padStart(2,'0')}-${String(created.getDate()).padStart(2,'0')}` : '';
          // Old records belonged to the selected month, which was not necessarily
          // the month when they were entered. Keep those records in that month.
          e.date = validDate(candidate) && candidate.startsWith(key+'-') ? candidate : `${key}-01`;
        }
      }
    }
    return stored;
  }
  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE_KEY));
      if (stored && stored.schema === 1 && Array.isArray(stored.categories) && Array.isArray(stored.utilityDefaults) && stored.months && typeof stored.months === 'object') return upgradeEntryDates(migrateUtilitiesToNeeds(stored));
    } catch (e) { console.warn('Could not read saved budget.', e); }
    return initial();
  }
  let data = load();
  let shownMonth = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');
  let kind = 'expense';
  let editingId = null;
  let categoriesVisible = false;
  let budgetsVisible = false;
  let expandedCategory = null;
  let utilityEditMode = null;
  let activeView = 'dashboard';
  let selectedCalendarDay = null;
  let expenseDateCustomized = false;
  let toastTimer;
  const money = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
  const shortMoney = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(v)||0);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeAmount = v => Number.isFinite(Number(v)) && Number(v)>=0 ? Math.round(Number(v)*100)/100 : 0;
  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch(e) { alert('Could not save to this device. Please export a backup or free storage space.'); console.error(e); } }
  function toast(message) { const el=$('toast'); el.textContent=message; el.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.add('hidden'),2300); }
  function getMonth(key=shownMonth) {
    if (!data.months[key]) {
      const prevKey = Object.keys(data.months).filter(k=>/^\d{4}-\d{2}$/.test(k)&&k<key).sort().at(-1);
      const prev = prevKey ? data.months[prevKey] : null;
      // New months start with no category allocations; users copy the previous calendar month on demand.
      data.months[key] = {income:prev ? safeAmount(prev.income) : 0, budgets:{}, utilityOverride:null, includeCardPayments:false, entries:[]};
      save();
    }
    const month = data.months[key];
    month.budgets ||= {};
    month.entries ||= [];
    return month;
  }
  const month = () => getMonth(shownMonth);
  const utilities = () => month().utilityOverride ?? data.utilityDefaults;
  const utilityForecast = () => utilities().reduce((s,u)=>s+safeAmount(u.amount),0);
  // Count each estimated utility dollar only until it has been replaced by a counted Utilities expense.
  // The unspent estimate fills the grey portion of the Needs meter without double counting payments.
  const utilityRemainingEstimate = () => Math.max(0, Math.round((utilityForecast()-categoryTotal('Utilities','needs'))*100)/100);
  // Card payments normally repay purchases already recorded as expenses.
  // A single per-month switch can intentionally include them if desired.
  const isCountedExpense = e => e.kind==='expense' && (!e.cardPayment || month().includeCardPayments===true);
  const calculatedSavings = () => Math.round((safeAmount(month().income)-total('needs')-total('wants'))*100)/100;
  const customCategories = () => data.categories.filter(c=>c!=='Utilities');
  const categoryBudget = (c,b) => {
    if (c==='Utilities') return b==='needs' ? utilityForecast() : null;
    const value = month().budgets?.[c]?.[b];
    return value === undefined || value === null || value === '' ? null : safeAmount(value);
  };
  function progress(value,target) { return target<=0 ? 0 : Math.max(0, Math.min(100,(value/target)*100)); }
  function total(bucket) { return month().entries.filter(e=>bucket==='savings' ? e.kind==='savings' : (isCountedExpense(e) && e.bucket===bucket)).reduce((sum,e)=>sum+safeAmount(e.amount),0); }
  function categoryTotal(category,bucket) { return month().entries.filter(e=>isCountedExpense(e) && e.category===category && (!bucket||e.bucket===bucket)).reduce((s,e)=>s+safeAmount(e.amount),0); }
  function monthLabel(key) { const [year,mo]=key.split('-').map(Number); return new Date(year,mo-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'}); }
  function render() {
    $('monthLabel').textContent = monthLabel(shownMonth);
    $('incomeValue').textContent = money(month().income);
    renderGoals(); renderCardPayments(); renderCategorySelect(); renderCategories(); renderUtilities(); renderBudgets(); renderEntries(); renderCategoryManager(); renderCalendar(); renderView();
  }
  function renderGoals() {
    const income=safeAmount(month().income);
    const pendingUtilities=utilityRemainingEstimate();
    const needsSpent=total('needs');
    const goals=[
      {bucket:'needs',label:'Needs',pct:0.5,color:'var(--blue)',actual:needsSpent},
      {bucket:'wants',label:'Wants',pct:0.3,color:'var(--orange)',actual:total('wants')},
      {bucket:'savings',label:'Savings left',pct:0.2,color:'var(--green)',actual:calculatedSavings()}
    ];
    $('goals').innerHTML=goals.map(g=>{
      const goal=income*g.pct, over=g.bucket!=='savings' && income>0 && (g.bucket==='needs'?needsSpent+pendingUtilities:g.actual)>goal;
      const foot=g.bucket==='needs' && pendingUtilities>0 ? `<div class="goal-foot"><i class="dot utility-dot"></i> ${shortMoney(pendingUtilities)} utilities</div>` : '';
      const goalText=income>0?`<div class="goal-sub">/ ${shortMoney(goal)}</div>`:'';
      let bar;
      if (g.bucket==='needs') {
        const actualWidth=progress(needsSpent,goal);
        const forecastWidth=goal>0 ? Math.max(0,Math.min(100-actualWidth, pendingUtilities/goal*100)) : 0;
        bar=`<div class="meter meter-stacked" role="img" aria-label="Needs: ${money(needsSpent)} recorded, ${money(pendingUtilities)} estimated utilities, target ${money(goal)}"><span class="meter-actual" style="width:${actualWidth}%"></span><span class="meter-forecast" style="width:${forecastWidth}%"></span></div>`;
      } else {
        bar=`<div class="meter"><span style="width:${progress(g.actual,goal)}%;background:${g.color}"></span></div>`;
      }
      return `<article class="goal-card"><div class="goal-name">${g.label}</div><div class="goal-value ${over || (g.bucket==='savings' && g.actual<goal && income>0)?'over-budget':''}">${shortMoney(g.actual)}</div>${goalText}${bar}${foot}</article>`;
    }).join('');
  }
  function renderCardPayments() {
    $('includeCardPayments').checked=month().includeCardPayments===true;
  }
  function renderCategorySelect() {
    const el=$('category');
    const old=el.value;
    el.innerHTML=data.categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    el.value=data.categories.includes(old)?old:(data.categories[0]||'Utilities');
    syncUtilityBucket();
  }
  function syncUtilityBucket() {
    const locked=$('category').value==='Utilities';
    if(locked) $('bucket').value='needs';
    $('bucket').disabled=locked;
    $('bucket').title=locked?'Utilities are always assigned to Needs':'';
  }
  function renderView() {
    $('dashboardView').classList.toggle('hidden', activeView !== 'dashboard');
    $('calendarView').classList.toggle('hidden', activeView !== 'calendar');
    for (const [id, view] of [['dashboardTab','dashboard'],['calendarTab','calendar']]) {
      const button = $(id);
      button.classList.toggle('selected', activeView===view);
      if (activeView===view) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    }
  }
  function setView(view) {
    activeView = view;
    $('settingsPanel').classList.add('hidden');
    renderView();
    if (view==='calendar') renderCalendar();
  }
  const entryDate = (e, key=shownMonth) => validDate(e.date) ? e.date : `${key}-01`;
  const spendingForDay = date => month().entries.filter(e => isCountedExpense(e) && entryDate(e) === date).reduce((sum,e)=>sum+safeAmount(e.amount),0);
  const dailyMoney = value => {
    if (value >= 10000) return '$'+(value/1000).toFixed(0)+'k';
    if (value >= 1000) return '$'+(value/1000).toFixed(1)+'k';
    return money(value);
  };
  function renderCalendar() {
    const [year,mo] = shownMonth.split('-').map(Number);
    const firstWeekday = new Date(year,mo-1,1).getDay();
    const days = new Date(year,mo,0).getDate();
    const totalSpent=total('needs')+total('wants');
    $('calendarMonthlyTotal').textContent=money(totalSpent);
    if (selectedCalendarDay && !selectedCalendarDay.startsWith(shownMonth+'-')) selectedCalendarDay=null;
    let cells='';
    for(let i=0;i<firstWeekday;i++)cells+='<div class="calendar-empty" aria-hidden="true"></div>';
    for(let day=1;day<=days;day++){
      const date=`${shownMonth}-${String(day).padStart(2,'0')}`;
      const amount=spendingForDay(date), spent=amount>0;
      const isSelected=selectedCalendarDay===date;
      const isToday=localToday()===date;
      const aria=`${new Date(year,mo-1,day).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}: ${money(amount)} spent`;
      cells+=`<button type="button" class="calendar-day ${spent?'has-spend':''} ${isSelected?'selected':''} ${isToday?'today':''}" data-calendar-date="${date}" aria-label="${esc(aria)}" aria-pressed="${isSelected}"><span class="calendar-date-num">${day}</span>${spent?`<span class="calendar-date-amount" title="${money(amount)}">${dailyMoney(amount)}</span>`:''}</button>`;
    }
    $('calendarGrid').innerHTML=cells;
    renderCalendarDay();
  }
  function renderCalendarDay() {
    const panel=$('calendarDayPanel');
    if(!selectedCalendarDay){panel.classList.add('hidden');return;}
    panel.classList.remove('hidden');
    const day=selectedCalendarDay;
    const date=new Date(Number(day.slice(0,4)),Number(day.slice(5,7))-1,Number(day.slice(8,10)));
    const label=date.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
    const entries=month().entries.filter(e=>e.kind==='expense'&&entryDate(e)===day).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    const list=entries.map(e=>{
      const included=isCountedExpense(e);
      return `<div class="calendar-transaction ${included?'':'excluded-entry'}"><div class="calendar-transaction-main"><strong>${esc(e.description)}</strong><span>${esc(e.category)} · ${e.bucket==='needs'?'Needs':'Wants'}${e.cardPayment?' · Card payment':''}</span></div><div class="calendar-transaction-side"><strong>${money(e.amount)}</strong><button type="button" data-calendar-edit="${esc(e.id)}">Edit</button></div></div>`;
    }).join('');
    panel.innerHTML=`<div class="section-heading"><h2>${esc(label)}</h2><strong>${money(spendingForDay(day))}</strong></div>${list || '<p class="empty-state">No expenses</p>'}<button type="button" class="small-button calendar-add" data-calendar-add="${day}">+ Add expense</button>`;
  }
  function renderCategories() {
    $('categoryTotals').classList.toggle('hidden',!categoriesVisible);
    $('toggleCategories').textContent=categoriesVisible?'Hide':'Show';
    $('toggleCategories').setAttribute('aria-expanded',String(categoriesVisible));
    if (!categoriesVisible) return;
    const rows=data.categories.map(c=>{
      const needs=categoryTotal(c,'needs'), wants=categoryTotal(c,'wants'), t=needs+wants;
      const nBudget=categoryBudget(c,'needs'), wBudget=categoryBudget(c,'wants');
      const detail=expandedCategory===c;
      const matching=month().entries.filter(e=>e.kind==='expense'&&e.category===c).sort((a,b)=>entryDate(b).localeCompare(entryDate(a)) || (b.createdAt||'').localeCompare(a.createdAt||''));
      const nText=`Needs ${money(needs)}${nBudget!==null?' / '+money(nBudget):''}`;
      const wText=c==='Utilities'?'':`Wants ${money(wants)}${wBudget!==null?' / '+money(wBudget):''}`;
      return `<div class="category-row"><div class="category-head"><span class="category-title">${esc(c)}</span><span class="category-amount">${money(t)}</span></div><div class="category-split"><span class="pill-need">${esc(nText)}</span>${c==='Utilities'?'':`<span class="pill-want">${esc(wText)}</span>`}</div><button class="category-toggle" data-category-toggle="${esc(c)}" aria-expanded="${detail}">${detail?'Hide':'Show'} ${detail?'−':'+'}</button>${detail?`<div class="category-transactions">${matching.length?matching.map(e=>`<div class="category-transaction ${isCountedExpense(e)?'':'excluded-entry'}"><span>${esc(e.description)} <span class="subtle">(${e.bucket==='needs'?'Needs':'Wants'}${e.cardPayment?' · Card payment'+(isCountedExpense(e)?'':', not counted'):''})</span></span><strong>${money(e.amount)}</strong></div>`).join(''):'<p class="empty-state">No expenses in this category yet.</p>'}</div>`:''}</div>`;
    }).join('');
    $('categoryTotals').innerHTML=rows||'<p class="empty-state">No categories yet.</p>';
  }
  function renderUtilities() {
    const values=utilities();
    $('utilityRows').innerHTML=values.map(u=>`<div class="utility-item"><span>${esc(u.name)}</span><strong>${money(u.amount)}</strong></div>`).join('')||'<p class="empty-state">No utilities configured.</p>';
    $('utilityTotal').textContent=money(utilityForecast());
    $('resetUtilities').classList.toggle('hidden',month().utilityOverride===null);
    if (!utilityEditMode) { $('utilityEditor').classList.add('hidden'); return; }
    $('utilityEditor').classList.remove('hidden');
    const editing=utilityEditMode==='month'?(month().utilityOverride??data.utilityDefaults):data.utilityDefaults;
    const title=utilityEditMode==='month'?'Only for '+monthLabel(shownMonth):'Recurring utility defaults';
    $('utilityEditor').innerHTML=`<div class="editor-panel"><div class="editor-title">${esc(title)}</div><form id="utilityForm"><div id="editableUtilities">${editing.map(u=>utilityEditorRow(u)).join('')}</div><div class="utility-actions" style="margin-top:10px"><button type="button" class="small-button" id="addUtilityRow">+ Utility</button><button type="button" class="small-button" id="cancelUtilities">Cancel</button><button type="submit" class="primary-button" style="min-height:36px;padding:9px 12px">Save</button></div></form></div>`;
  }
  function utilityEditorRow(u) {return `<div class="utility-edit-row" data-utility-id="${esc(u.id)}"><input name="utilityName" maxlength="35" aria-label="Utility name" placeholder="Utility" value="${esc(u.name)}" required /><input name="utilityAmount" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Utility amount" placeholder="0.00" value="${safeAmount(u.amount)}" required /><button type="button" class="remove-utility" data-remove-utility aria-label="Remove utility">×</button></div>`;}
  function renderBudgets() {
    $('budgetEditor').classList.toggle('hidden',!budgetsVisible);
    $('toggleBudgets').textContent=budgetsVisible?'Hide':'Adjust';
    $('toggleBudgets').setAttribute('aria-expanded',String(budgetsVisible));
    if (!budgetsVisible) return;
    const rows=customCategories().map(c=>{
      const v1=categoryBudget(c,'needs'),v2=categoryBudget(c,'wants');
      return `<tr><td class="budget-name">${esc(c)}</td><td><input data-budget-category="${esc(c)}" data-bucket="needs" aria-label="${esc(c)} Needs budget" type="number" min="0" step="0.01" inputmode="decimal" placeholder="—" value="${v1===null?'':v1}"></td><td><input data-budget-category="${esc(c)}" data-bucket="wants" aria-label="${esc(c)} Wants budget" type="number" min="0" step="0.01" inputmode="decimal" placeholder="—" value="${v2===null?'':v2}"></td></tr>`;
    }).join('');
    const nAllocated=customCategories().reduce((s,c)=>s+(categoryBudget(c,'needs')??0),0)+utilityForecast();
    const wAllocated=customCategories().reduce((s,c)=>s+(categoryBudget(c,'wants')??0),0);
    const targetNeeds=safeAmount(month().income)*0.5, targetWants=safeAmount(month().income)*0.3;
    $('budgetEditor').innerHTML=`<div class="editor-panel"><table class="budget-table"><thead><tr><th>Category</th><th>Needs</th><th>Wants</th></tr></thead><tbody>${rows}</tbody></table><div class="budget-summary"><div>Needs <strong>${money(nAllocated)}</strong> / ${money(targetNeeds)}</div><div>Wants <strong>${money(wAllocated)}</strong> / ${money(targetWants)}</div></div></div>`;
  }
  function renderEntries() {
    const list=[...month().entries].sort((a,b)=>entryDate(b).localeCompare(entryDate(a)) || (b.createdAt||'').localeCompare(a.createdAt||''));
    $('entryCount').textContent=list.length?`${list.length} record${list.length===1?'':'s'}`:'';
    $('entries').innerHTML=list.length?list.map(e=>{
      const category=e.kind==='savings'?'Savings transfer':e.category;
      const symbol=e.kind==='savings'?'↗':e.cardPayment?'CC':(e.bucket==='needs'?'N':'W');
      const type=e.kind==='savings'?'savings':e.cardPayment?'card':e.bucket;
      const excluded=e.kind==='expense' && !isCountedExpense(e);
      const note=e.kind==='savings'?'Savings transfer':
        `${esc(category)} · ${e.bucket==='needs'?'Needs':'Wants'} · ${esc(entryDate(e))}${e.cardPayment?' · Card payment':''}`;
      return `<div class="activity-row ${excluded?'excluded-entry':''}"><div class="activity-icon ${type}">${symbol}</div><div class="activity-middle"><div class="activity-description">${esc(e.description)}</div><div class="activity-sub">${note}</div></div><div class="activity-right"><div class="activity-value">${e.kind==='savings'?'+':''}${money(e.amount)}</div><div class="activity-actions"><button type="button" data-edit="${esc(e.id)}">Edit</button><button type="button" class="delete" data-delete="${esc(e.id)}">Delete</button></div></div></div>`;
    }).join(''):'<p class="empty-state">No transactions this month. Add your first expense above.</p>';
  }
  function renderCategoryManager() {
    $('categoryManager').innerHTML=customCategories().map(c=>`<div class="managed-category"><span>${esc(c)}</span><div><button type="button" data-rename="${esc(c)}">Rename</button><button type="button" data-remove-category="${esc(c)}">Remove</button></div></div>`).join('');
  }
  function changeMonth(delta) {
    const [year,mon]=shownMonth.split('-').map(Number);
    const d=new Date(year,mon-1+delta,1);
    shownMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    utilityEditMode=null; expandedCategory=null; selectedCalendarDay=null;
    cancelEditing(); getMonth(); render();
  }
  function toggleKind(next) {
    kind=next;
    $('expenseFields').classList.toggle('hidden',kind==='savings');
    $('cardPaymentField').classList.toggle('hidden',kind==='savings');
    $('submitEntry').textContent=editingId?'Save changes':(kind==='savings'?'+ Add savings':'+ Add expense');
    $('description').placeholder=kind==='savings'?'e.g. Savings transfer':'e.g. Groceries';
  }
  function cancelEditing() {
    editingId=null; expenseDateCustomized=false;
    $('entryForm').reset(); $('expenseDate').value=localToday();
    $('cancelEdit').classList.add('hidden'); toggleKind('expense'); renderCategorySelect();
  }
  function editEntry(id) {
    const e=month().entries.find(entry=>entry.id===id); if(!e)return;
    editingId=id; toggleKind(e.kind==='savings'?'savings':'expense');
    $('description').value=e.description; $('amount').value=e.amount;
    $('expenseDate').value=entryDate(e); expenseDateCustomized=true;
    if(e.kind!=='savings'){$('category').value=e.category; $('bucket').value=e.bucket; $('cardPayment').checked=!!e.cardPayment; syncUtilityBucket();}
    $('cancelEdit').classList.remove('hidden'); $('submitEntry').textContent='Save changes';
    document.querySelector('.add-card').scrollIntoView({behavior:'smooth',block:'start'});
    $('description').focus();
  }
  function addExpense(event) {
    event.preventDefault();
    const description=$('description').value.trim(); const amount=Number($('amount').value);
    // If the date was never chosen manually, use today's actual date at submit time.
    const date=expenseDateCustomized ? $('expenseDate').value : localToday();
    if(!description||!Number.isFinite(amount)||amount<=0){toast('Enter a description and a valid amount');return;}
    if(!validDate(date)){toast('Choose a valid expense date');return;}
    const old=editingId?month().entries.find(e=>e.id===editingId):null;
    const entry={id:editingId||uid(),description,amount:safeAmount(amount),kind,bucket:kind==='savings'?'savings':$('category').value==='Utilities'?'needs':$('bucket').value,category:kind==='savings'?'':$('category').value,cardPayment:kind==='expense' && $('cardPayment').checked,date,createdAt:old?.createdAt||new Date().toISOString()};
    const targetKey=date.slice(0,7);
    if(old)month().entries=month().entries.filter(e=>e.id!==old.id);
    getMonth(targetKey).entries.push(entry);
    shownMonth=targetKey; selectedCalendarDay=null;
    save(); cancelEditing(); render(); toast(old?'Entry updated':'Added to '+monthLabel(shownMonth));
  }
  function renameCategory(oldName) {
    const next=window.prompt('New name for '+oldName,oldName);
    if(next===null)return;
    const name=next.trim(); if(!name||name===oldName)return;
    if(data.categories.some(c=>c.toLowerCase()===name.toLowerCase())){alert('That category already exists.');return;}
    data.categories=data.categories.map(c=>c===oldName?name:c);
    for(const m of Object.values(data.months)) {
      if(m.budgets?.[oldName]) {m.budgets[name]=m.budgets[oldName];delete m.budgets[oldName];}
      for(const e of (m.entries||[]))if(e.category===oldName)e.category=name;
    }
    if(expandedCategory===oldName)expandedCategory=name;
    save();render();toast('Category renamed');
  }
  function removeCategory(c) {
    if(Object.values(data.months).some(m=>(m.entries||[]).some(e=>e.category===c))){alert('This category has expenses in your history. Rename it instead to keep your records intact.');return;}
    if(!confirm('Remove '+c+' from the category list?'))return;
    data.categories=data.categories.filter(x=>x!==c);
    for(const m of Object.values(data.months))if(m.budgets)delete m.budgets[c];
    save();render();toast('Category removed');
  }
  function utilitySave(e) {
    e.preventDefault();
    const rows=[...$('editableUtilities').querySelectorAll('[data-utility-id]')];
    const next=[];
    for(const row of rows){
      const name=row.querySelector('[name="utilityName"]').value.trim();
      const amount=Number(row.querySelector('[name="utilityAmount"]').value);
      if(!name||!Number.isFinite(amount)||amount<0){alert('Enter a name and a valid amount for every utility.');return;}
      next.push({id:row.dataset.utilityId||uid(),name,amount:safeAmount(amount)});
    }
    if(utilityEditMode==='month')month().utilityOverride=next;else data.utilityDefaults=next;
    utilityEditMode=null;save();render();toast('Utility estimates saved');
  }
  function download(name,contents,mime) {
    const blob=new Blob([contents],{type:mime}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function csvCell(s) {return '"'+String(s??'').replace(/"/g,'""')+'"';}
  function exportCsv() {
    const rows=[['Month','Date','Description','Amount','Category','Needs / Wants / Savings','Credit card payment','Counted in totals']];
    Object.keys(data.months).sort().forEach(k=>(data.months[k].entries||[]).forEach(e=>rows.push([k,entryDate(e,k),e.description,e.amount,e.kind==='savings'?'Savings':e.category,e.bucket,e.cardPayment?'Yes':'No',e.kind==='savings'?'No':(e.cardPayment && data.months[k].includeCardPayments!==true?'No':'Yes')])));
    download('simple-budget-transactions.csv',rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');toast('CSV downloaded');
  }
  function validateImport(obj) {
    return obj && obj.schema===1 && Array.isArray(obj.categories) && obj.categories.includes('Utilities') && obj.categories.every(s=>typeof s==='string'&&s.length<=100) && Array.isArray(obj.utilityDefaults) && obj.months && typeof obj.months==='object' && Object.values(obj.months).every(m=>m && typeof m==='object' && Array.isArray(m.entries));
  }
  // Events
  $('dashboardTab').addEventListener('click',()=>setView('dashboard'));
  $('calendarTab').addEventListener('click',()=>setView('calendar'));
  $('expenseDate').addEventListener('input',()=>{expenseDateCustomized=true;});
  $('calendarGrid').addEventListener('click',e=>{
    const button=e.target.closest('[data-calendar-date]');
    if(!button)return;
    selectedCalendarDay=selectedCalendarDay===button.dataset.calendarDate ? null : button.dataset.calendarDate;
    renderCalendar();
  });
  $('calendarDayPanel').addEventListener('click',e=>{
    const edit=e.target.closest('[data-calendar-edit]');
    if(edit){setView('dashboard');editEntry(edit.dataset.calendarEdit);return;}
    const add=e.target.closest('[data-calendar-add]');
    if(add){
      cancelEditing();
      $('expenseDate').value=add.dataset.calendarAdd; expenseDateCustomized=true;
      setView('dashboard');
      document.querySelector('.add-card').scrollIntoView({behavior:'smooth',block:'start'});
      $('description').focus();
    }
  });
  $('prevMonth').addEventListener('click',()=>changeMonth(-1));
  $('nextMonth').addEventListener('click',()=>changeMonth(1));
  $('editIncome').addEventListener('click',()=>{$('incomeInput').value=month().income;$('modalOverlay').classList.remove('hidden');$('incomeInput').focus();});
  const closeModal=()=>$('modalOverlay').classList.add('hidden');
  $('closeModal').addEventListener('click',closeModal);
  $('modalOverlay').addEventListener('click',e=>{if(e.target===$('modalOverlay'))closeModal();});
  $('incomeForm').addEventListener('submit',e=>{e.preventDefault();month().income=safeAmount($('incomeInput').value);save();render();closeModal();toast('Monthly income saved');});
  $('category').addEventListener('change',syncUtilityBucket);
  $('includeCardPayments').addEventListener('change',e=>{month().includeCardPayments=e.target.checked;save();render();});
  $('entryForm').addEventListener('submit',addExpense);
  $('cancelEdit').addEventListener('click',cancelEditing);
  $('toggleCategories').addEventListener('click',()=>{categoriesVisible=!categoriesVisible;renderCategories();});
  $('categoryTotals').addEventListener('click',e=>{const btn=e.target.closest('[data-category-toggle]');if(!btn)return;expandedCategory=expandedCategory===btn.dataset.categoryToggle?null:btn.dataset.categoryToggle;renderCategories();});
  $('copyLastMonth').addEventListener('click',()=>{
    const [y,m]=shownMonth.split('-').map(Number);
    const prior=new Date(y,m-2,1);
    const key=prior.getFullYear()+'-'+String(prior.getMonth()+1).padStart(2,'0');
    const source=data.months[key];
    if (!source?.budgets || !Object.keys(source.budgets).length) {toast('No category budgets in '+monthLabel(key));return;}
    const existing=month().budgets;
    if (Object.keys(existing).some(c=>Object.values(existing[c]||{}).some(v=>v!==null&&v!==undefined&&v!=='')) &&
        !confirm('Replace category budgets for '+monthLabel(shownMonth)+'?')) return;
    month().budgets={};
    for (const c of customCategories()) if(source.budgets[c]) month().budgets[c]=structuredClone(source.budgets[c]);
    save();budgetsVisible=true;renderBudgets();renderCategories();toast('Copied '+monthLabel(key)+' budgets');
  });
  $('toggleBudgets').addEventListener('click',()=>{budgetsVisible=!budgetsVisible;renderBudgets();});
  $('budgetEditor').addEventListener('change',e=>{
    const el=e.target.closest('[data-budget-category]');if(!el)return;
    const c=el.dataset.budgetCategory,b=el.dataset.bucket;
    const text=el.value.trim();const n=Number(text);
    if(text!==''&&(!Number.isFinite(n)||n<0)){alert('Budget must be zero or a positive amount.');renderBudgets();return;}
    month().budgets[c]||={needs:null,wants:null};
    month().budgets[c][b]=text===''?null:safeAmount(n);
    save();renderBudgets();renderCategories();toast(c+' budget saved');
  });
  $('editMonthUtilities').addEventListener('click',()=>{utilityEditMode=utilityEditMode==='month'?null:'month';renderUtilities();});
  $('editDefaultUtilities').addEventListener('click',()=>{utilityEditMode=utilityEditMode==='default'?null:'default';renderUtilities();});
  $('resetUtilities').addEventListener('click',()=>{if(!confirm('Use the recurring utility defaults for this month?'))return;month().utilityOverride=null;utilityEditMode=null;save();render();});
  $('utilityEditor').addEventListener('click',e=>{
    if(e.target.closest('#addUtilityRow')){ $('editableUtilities').insertAdjacentHTML('beforeend',utilityEditorRow({id:uid(),name:'',amount:0})); }
    if(e.target.closest('[data-remove-utility]')){e.target.closest('[data-utility-id]').remove();}
    if(e.target.closest('#cancelUtilities')){utilityEditMode=null;renderUtilities();}
  });
  $('utilityEditor').addEventListener('submit',e=>{if(e.target.id==='utilityForm')utilitySave(e);});
  $('entries').addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit]');if(edit){editEntry(edit.dataset.edit);return;}
    const del=e.target.closest('[data-delete]');if(del){const entry=month().entries.find(x=>x.id===del.dataset.delete);if(entry && confirm('Delete "'+entry.description+'"?')){month().entries=month().entries.filter(x=>x.id!==entry.id);save();if(editingId===entry.id)cancelEditing();render();toast('Entry deleted');}}
  });
  $('settingsButton').addEventListener('click',()=>{$('settingsPanel').classList.toggle('hidden');if(!$('settingsPanel').classList.contains('hidden'))$('settingsPanel').scrollIntoView({behavior:'smooth'});});
  $('closeSettings').addEventListener('click',()=>$('settingsPanel').classList.add('hidden'));
  $('addCategoryForm').addEventListener('submit',e=>{e.preventDefault();const name=$('newCategory').value.trim();if(!name)return;if(data.categories.some(c=>c.toLowerCase()===name.toLowerCase())){alert('That category already exists.');return;}data.categories.splice(data.categories.length-1,0,name);$('newCategory').value='';save();render();toast('Category added');});
  $('categoryManager').addEventListener('click',e=>{const rename=e.target.closest('[data-rename]');if(rename)return renameCategory(rename.dataset.rename);const rm=e.target.closest('[data-remove-category]');if(rm)removeCategory(rm.dataset.removeCategory);});
  $('exportBackup').addEventListener('click',()=>{download('simple-budget-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(data,null,2),'application/json');toast('Backup downloaded');});
  $('exportCsv').addEventListener('click',exportCsv);
  $('importBackup').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const raw=JSON.parse(await file.text());if(!validateImport(raw)){alert('This does not appear to be a Simple Budget backup.');return;}if(confirm('Importing a backup replaces ALL current budget data on this device. Continue?')){data=upgradeEntryDates(migrateUtilitiesToNeeds(raw));save();cancelEditing();render();toast('Backup imported');}}catch(err){alert('Could not open that backup file.');}finally{e.target.value='';}});
  window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  getMonth(); save(); cancelEditing(); render();
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Offline setup unavailable:',err)));
})();
