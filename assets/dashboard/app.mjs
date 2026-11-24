import { categories, classify, describeTransaction, parseRows, reconcile, totals, withoutFullyRefunded } from './ledger.mjs';

const $ = id => document.getElementById(id);
const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' });
const fmt = cents => money.format(cents / 100);
const options = [$('payment-source'), $('platform'), $('brand'), $('category')];
const filterMenus = new Map();
const paymentLabel = source => source === '微信' ? '微信支付' : source;
const brandName = row => row.brand || row.orderMerchant || row.merchant || '未识别品牌';
const allPeriods = { value: 'all', mode: 'all', label: '全部时间' };
const localDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const localMonth = localDay.slice(0, 7);
const monthLabel = month => month.replace('-', ' 年 ') + ' 月';
const offlinePeriod = globalThis.monthlyLedgerPeriod;
const offlineRows = globalThis.monthlyLedgerSeed || [];
const rowPageSize = 24;
let data = [];
let datasetReady = false;
let demo = false;
let matchingRows = [];
let displayedRows = 0;
let editRecord = null;
let currentPeriod;
let periodIndex = new Map();
let draftMode = 'month';
let rangePicker;

function element(tag, value) {
  const node = document.createElement(tag);
  if (value != null) node.textContent = value;
  return node;
}
function fillOptions(select, entries, fallback) {
  const previous = select.value || fallback;
  select.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
  select.value = entries.some(([value]) => value === previous) ? previous : entries[0]?.[0] || '';
}
const filterValues = select => new Set([...select.selectedOptions].map(option => option.value));
const matchesFilter = (values, ...keys) => !values.size || keys.some(key => values.has(key));
const filterSummary = (values, empty, labelOf = value => value) => values.size ? [...values].map(labelOf).join('、') : empty;

function setFilterValues(select, values) {
  const selected = new Set(values);
  for (const option of select.options) option.selected = selected.has(option.value);
}

function toggleFilterValue(select, value) {
  const option = [...select.options].find(item => item.value === value);
  if (!option) return;
  option.selected = !option.selected;
  refresh();
}

function closeFilterMenu(menu, restoreFocus = false) {
  menu.panel.hidden = true;
  menu.button.setAttribute('aria-expanded', 'false');
  if (restoreFocus) menu.button.focus({ preventScroll: true });
}

function updateFilterMenu(select) {
  const menu = filterMenus.get(select);
  const selected = [...select.selectedOptions];
  menu.value.textContent = selected.length > 1 ? '已选 ' + selected.length + ' 项' : selected[0]?.text.trim() || menu.empty;
  if (menu.panel.hidden) return;
  const query = menu.search?.value.trim().toLowerCase() || '';
  menu.clear.disabled = !selected.length;
  for (const input of menu.list.querySelectorAll('input')) {
    const option = select.options[input.dataset.optionIndex];
    input.checked = option.selected;
    input.parentElement.hidden = !option.text.toLowerCase().includes(query);
  }
}

function renderFilterOptions(select) {
  const menu = filterMenus.get(select);
  menu.list.replaceChildren(...[...select.options].map((option, index) => {
    const label = element('label');
    label.className = 'multi-filter-option';
    const input = element('input');
    input.type = 'checkbox';
    input.dataset.optionIndex = index;
    label.append(input, element('span', option.text));
    return label;
  }));
  updateFilterMenu(select);
}

function fillFilterOptions(select, entries) {
  const current = [...select.options];
  if (current.length !== entries.length || entries.some(([value, label], i) => current[i].value !== value || current[i].text !== label)) {
    const selected = filterValues(select);
    select.replaceChildren(...entries.map(([value, label]) => new Option(label, value, false, selected.has(value))));
    if (!filterMenus.get(select).panel.hidden) renderFilterOptions(select);
  }
  updateFilterMenu(select);
}

function initMultiFilters() {
  const labels = ['全部渠道', '全部平台', '全部品牌', '全部类别'];
  for (const [index, select] of options.entries()) {
    const label = select.parentElement;
    const host = element('div');
    host.className = 'multi-filter';
    host.id = select.id + '-filter';
    label.replaceWith(host);
    const button = element('button');
    button.type = 'button';
    button.id = select.id + '-filter-button';
    button.className = 'multi-filter-button';
    const value = element('span', labels[index]);
    value.id = select.id + '-filter-value';
    button.append(value);
    const panel = element('div');
    panel.className = 'multi-filter-panel';
    panel.id = select.id + '-filter-panel';
    panel.hidden = true;
    label.id = select.id + '-filter-label';
    label.htmlFor = button.id;
    button.setAttribute('aria-controls', panel.id);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-labelledby', label.id + ' ' + value.id);
    const clear = element('button', labels[index]);
    clear.type = 'button';
    clear.className = 'multi-filter-clear';
    const search = select.id === 'brand' ? element('input') : null;
    if (search) {
      search.type = 'search';
      search.placeholder = '搜索品牌／商户';
      search.setAttribute('aria-label', search.placeholder);
      search.addEventListener('input', () => updateFilterMenu(select));
      panel.append(search);
    }
    const list = element('div');
    list.className = 'multi-filter-list';
    panel.append(clear, list);
    select.multiple = true;
    select.hidden = true;
    host.append(label, button, panel, select);
    const menu = { host, button, value, panel, clear, list, search, empty: labels[index] };
    filterMenus.set(select, menu);
    button.addEventListener('click', () => {
      const open = panel.hidden;
      for (const entry of filterMenus.values()) closeFilterMenu(entry);
      if (!open) return;
      panel.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      if (search) search.value = '';
      renderFilterOptions(select);
    });
    clear.addEventListener('click', () => {
      setFilterValues(select, []);
      closeFilterMenu(menu, true);
      refresh();
    });
    list.addEventListener('change', event => {
      const input = event.target;
      select.options[input.dataset.optionIndex].selected = input.checked;
      refresh();
    });
    host.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || panel.hidden) return;
      event.preventDefault();
      closeFilterMenu(menu, true);
    });
  }
  document.addEventListener('click', event => {
    for (const menu of filterMenus.values()) {
      if (!menu.panel.hidden && !menu.host.contains(event.target)) closeFilterMenu(menu);
    }
  });
}
function report(message) {
  const notice = $('import-notice');
  notice.textContent = message;
  notice.hidden = !message;
}
function pastMonths(last, count) {
  const [year, month] = last.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const d = new Date(Date.UTC(year, month - count + index, 1));
    return d.toISOString().slice(0, 7);
  });
}
function latestCoveredDate(rows) {
  return rows.reduce((latest, row) => row.coveredThrough > latest ? row.coveredThrough : latest, '');
}
function periodFor(rows) {
  if (demo) return null;
  const dates = rows.map(row => row.date).sort();
  const asOf = latestCoveredDate(rows) || offlinePeriod?.asOf;
  if (!asOf || !dates.length) return offlinePeriod;
  const firstYear = dates[0].slice(0, 4);
  const lastYear = [dates.at(-1).slice(0, 4), asOf.slice(0, 4)].sort().at(-1);
  return { start: firstYear + '-01', end: lastYear + '-12', asOf };
}
function reportMonths(period) {
  if (!period) return [];
  const firstYear = Number(period.start.slice(0, 4));
  const lastYear = Number(period.end.slice(0, 4));
  return pastMonths(period.end, (lastYear - firstYear + 1) * 12);
}
function periodStatus(month, channels, date) {
  if (!channels?.size && month > localMonth) return '未到期';
  if (!channels?.size) return month === localMonth ? '当月进行中 · 待补' : '待补账单';
  const coverage = [...channels].map(paymentLabel).join('、');
  return date?.startsWith(month) ? coverage + ' · 最近账单截至 ' + date.slice(5).replace('-', ' 月 ') + ' 日' : coverage;
}
function makePeriod(value, mode, label, months) {
  const last = months.at(-1);
  const [year, month] = last.split('-').map(Number);
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { value, mode, label, months, start: months[0] + '-01', end };
}
function indexPeriods(months) {
  const periods = new Map([[allPeriods.value, allPeriods]]);
  for (const month of months) {
    const year = month.slice(0, 4);
    const quarter = Math.ceil(Number(month.slice(5)) / 3);
    const quarterValue = year + '-Q' + quarter;
    if (!periods.has(year)) {
      periods.set(year, makePeriod(year, 'year', year + ' 年', pastMonths(year + '-12', 12)));
    }
    if (!periods.has(quarterValue)) {
      const last = year + '-' + String(quarter * 3).padStart(2, '0');
      periods.set(quarterValue, makePeriod(quarterValue, 'quarter', year + ' 年第 ' + quarter + ' 季度', pastMonths(last, 3)));
    }
    periods.set(month, makePeriod(month, 'month', monthLabel(month), [month]));
  }
  return periods;
}
function betweenMonths(start, end) {
  const [firstYear, firstMonth] = start.split('-').map(Number);
  const [lastYear, lastMonth] = end.split('-').map(Number);
  return pastMonths(end.slice(0, 7), (lastYear - firstYear) * 12 + lastMonth - firstMonth + 1);
}
function customPeriod(start, end) {
  return {
    value: 'custom', mode: 'custom', label: start === end ? start : start + ' 至 ' + end,
    start, end, months: betweenMonths(start, end)
  };
}
function periodWithinMonth(selection, month) {
  const full = makePeriod(month, 'month', monthLabel(month), [month]);
  const start = selection.start > full.start ? selection.start : full.start;
  const end = selection.end < full.end ? selection.end : full.end;
  return start === full.start && end === full.end ? full : customPeriod(start, end);
}
function transactionsByDate(rows, length) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.date.slice(0, length);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}
function dateKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(part => String(part).padStart(2, '0')).join('-');
}
function renderPeriodDraft() {
  for (const button of $('period-modes').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === draftMode));
  }
  const isCustom = draftMode === 'custom';
  $('period-custom').hidden = !isCustom;
  $('period-presets').hidden = isCustom || draftMode === 'all';
  $('period-error').hidden = true;
  let draft;
  if (draftMode !== 'all' && !isCustom) {
    const periods = [...periodIndex.values()].filter(period => period.mode === draftMode);
    const years = [...new Set(periods.map(period => period.start.slice(0, 4)))];
    fillOptions($('period-year'), years.map(year => [year, year + ' 年']), currentPeriod.start?.slice(0, 4));
    const year = $('period-year').value;
    const isYear = draftMode === 'year';
    $('period-unit-field').hidden = isYear;
    if (isYear) draft = periodIndex.get(year);
    else {
      const isQuarter = draftMode === 'quarter';
      $('period-unit-label').textContent = isQuarter ? '季度' : '月份';
      const entries = periods.filter(period => period.start.startsWith(year)).map(period => [
        period.value, isQuarter ? '第 ' + period.value.at(-1) + ' 季度' : Number(period.value.slice(5)) + ' 月'
      ]);
      fillOptions($('period-unit'), entries, currentPeriod.value);
      draft = periodIndex.get($('period-unit').value);
    }
  }
  $('period-preview').hidden = !draft;
  $('period-preview').textContent = draft ? draft.start + ' 至 ' + draft.end : '';
}
function syncRangePicker(move = false) {
  if (!rangePicker) return;
  const start = $('period-start').value;
  const end = $('period-end').value;
  rangePicker.clear({ silent: true });
  if (start && $('period-start').validity.valid) {
    const dates = end && end >= start && $('period-end').validity.valid ? [start, end] : [start];
    rangePicker.selectDate(dates, { silent: true });
    if (move) rangePicker.setViewDate(start);
  }
}
function openPeriodDialog() {
  draftMode = currentPeriod.mode;
  $('period-year').value = '';
  $('period-unit').value = '';
  const years = [...periodIndex.values()].filter(period => period.mode === 'year');
  const earliest = years.at(-1)?.start;
  const latest = years[0]?.end;
  const isCustom = draftMode === 'custom';
  for (const [field, value] of [['period-start', currentPeriod.start], ['period-end', currentPeriod.end]]) {
    const input = $(field);
    input.min = earliest || '';
    input.max = latest || '';
    input.value = isCustom ? value : '';
  }
  if (window.AirDatepicker && !rangePicker) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const months = Array.from({ length: 12 }, (_, index) => index + 1 + ' 月');
    rangePicker = new window.AirDatepicker($('range-calendar'), {
      inline: true, range: true, dynamicRange: false, toggleSelected: false,
      locale: { days, daysShort: days, daysMin: days.map(day => day.slice(1)), months, monthsShort: months,
        today: '今天', clear: '清除', dateFormat: 'yyyy-MM-dd', timeFormat: 'HH:mm', firstDay: 1 },
      navTitles: { days: 'yyyy 年 MMMM', months: 'yyyy 年', years: 'yyyy1 - yyyy2' },
      onSelect({ date }) {
        $('period-start').value = date[0] ? dateKey(date[0]) : '';
        $('period-end').value = date[1] ? dateKey(date[1]) : '';
        $('period-error').hidden = true;
      }
    });
  }
  rangePicker?.update({ minDate: earliest || false, maxDate: latest || false }, { silent: true });
  rangePicker?.setViewDate(currentPeriod.start || localMonth + '-01');
  syncRangePicker();
  renderPeriodDraft();
  $('period-dialog').showModal();
}
function spendingMetric() {
  return $('spending-metric').value === 'expense' ? 'expense' : 'net';
}
function spendingMetricLabel() {
  return spendingMetric() === 'net' ? '净支出' : '消费金额';
}
function groupedSpending(rows, keyOf) {
  const groups = new Map();
  for (const row of rows) {
    if (row.kind !== 'expense' && row.kind !== 'refund') continue;
    const key = keyOf(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups].map(([key, entries]) => ({ key, ...totals(entries) }));
}
function renderNetDistribution(area, groups, selected, labelOf, onSelect, emptyLabel) {
  area.replaceChildren();
  if (!groups.length) {
    area.append(element('p', emptyLabel));
    return;
  }
  const ranked = [...groups].sort((a, b) => b.net - a.net || a.key.localeCompare(b.key, 'zh-CN'));
  const scale = Math.max(1, ...ranked.map(group => Math.abs(group.net)));
  const tooltip = createChartTooltip(area);
  const headline = element('div');
  headline.className = 'net-distribution-total';
  headline.append(element('span', '净支出合计'), element('strong', fmt(ranked.reduce((sum, group) => sum + group.net, 0))));
  const list = element('div');
  list.className = 'net-distribution-list';
  for (const { key, expense, refund, net } of ranked) {
    const label = labelOf(key);
    const button = element('button');
    button.type = 'button';
    button.className = 'net-distribution-item';
    button.dataset.facet = key;
    button.setAttribute('aria-pressed', String(selected.has(key)));
    button.append(element('span', label), element('strong', fmt(net)));
    const rail = element('span');
    rail.className = 'net-distribution-rail';
    rail.setAttribute('aria-hidden', 'true');
    const bar = element('i');
    bar.className = net < 0 ? 'net-bar-refund' : 'net-bar-expense';
    bar.style.width = Math.abs(net) / scale * 50 + '%';
    rail.append(bar);
    button.append(rail);
    tooltip.bind(button, { title: label, fields: [
      ['净支出', fmt(net)], ['消费金额', fmt(expense)], ['到账退款', fmt(refund)]
    ] });
    button.addEventListener('click', () => onSelect(key));
    list.append(button);
  }
  area.append(headline, list);
}

function selectionStatus(selection, byMonth, asOf) {
  const range = selection.months;
  const calculation = '消费扣除到账退款';
  if (!range) return { missing: false, caption: calculation };
  const recorded = range.filter(month => byMonth.has(month));
  if (selection.mode === 'custom' && selection.start > (asOf || localDay) &&
      !recorded.some(month => byMonth.get(month).rows.some(row =>
        row.date.slice(0, 10) >= selection.start && row.date.slice(0, 10) <= selection.end))) {
    return { missing: true, caption: selection.start > localDay ? '未到期' : '待补账单' };
  }
  if (range.length === 1) {
    const [month] = range;
    const channels = byMonth.get(month)?.channels;
    return { missing: !channels, caption: !channels || asOf?.startsWith(month) && selection.end >= asOf
      ? periodStatus(month, channels, asOf) : calculation };
  }
  if (!recorded.length) return { missing: true, caption: range[0] > localMonth ? '未到期' : '待补账单' };
  const notes = [];
  if (recorded.length < range.length) notes.push(recorded.length + '/' + range.length + ' 个月有记录');
  if (asOf && selection.end >= asOf && range.includes(asOf.slice(0, 7))) {
    const date = asOf.slice(5).replace('-', ' 月 ') + ' 日';
    notes.push('最近账单截至 ' + date);
  }
  return { missing: false, caption: notes.join(' · ') || calculation };
}
const examples = [
  ['咖啡与轻食','美团',38900], ['晚餐与外卖','美团',78700], ['运动鞋','淘宝',52000],
  ['厨房纸巾','拼多多',12990], ['家居收纳','拼多多',34900], ['网约车与地铁','其他',48100],
  ['租房与水费','其他',225000], ['展览门票','美团',36000], ['无线耳机','淘宝',84900],
  ['体检','其他',28500], ['鞋服退款','淘宝',-26900]
];
const sampleRows = pastMonths(localMonth, 6).flatMap((month, index) => examples.map(([item, platform, value], i) => {
  const row = { date: month + '-' + String(i + 1).padStart(2,'0'), item, platform, merchant: platform, source: '示例',
    kind: value < 0 ? 'refund' : 'expense', amount: Math.round(Math.abs(value) * (0.72 + index * 0.051 + (((i + index) * 7) % 5) * 0.037)),
    key: 'demo-' + month + '-' + i };
  [row.category, row.subcategory] = classify(row);
  return row;
}));

const database = new Promise((resolve, reject) => {
  const request = indexedDB.open('yuezhang-local', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('rows', { keyPath: 'key' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function storedRows() {
  const db = await database;
  return new Promise((resolve, reject) => {
    const request = db.transaction('rows').objectStore('rows').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveRows(incoming, update = false) {
  const db = await database;
  return new Promise((resolve, reject) => {
    const txn = db.transaction('rows', 'readwrite');
    const store = txn.objectStore('rows');
    let added = 0;
    let repeated = 0;
    let enriched = 0;
    const request = store.getAll();
    request.onsuccess = () => {
      const known = new Map(request.result.map(row => [row.key, row]));
      for (const row of incoming) {
        const previous = known.get(row.key);
        if (previous && !update && row.statementFormat === 'alipay-trade-history' &&
            previous.statementFormat !== row.statementFormat) {
          const keepItem = describeTransaction(row).availability === 'missing' &&
            describeTransaction(previous).availability === 'statement';
          const value = { ...previous, ...row, method: row.method || previous.method || '',
            item: keepItem ? previous.item : row.item };
          known.set(row.key, value);
          store.put(value);
          enriched++;
          continue;
        }
        if (previous && !update) {
          const extra = {};
          for (const field of ['method', 'merchant', 'order', 'variant', 'quantity']) {
            if (!previous[field] && row[field]) extra[field] = row[field];
          }
          if (describeTransaction(previous).availability === 'missing' &&
              describeTransaction(row).availability === 'statement') extra.item = row.item;
          if (row.coveredThrough && row.coveredThrough > (previous.coveredThrough || '')) extra.coveredThrough = row.coveredThrough;
          if (Object.keys(extra).length) {
            const enrichedRow = { ...previous, ...extra };
            known.set(row.key, enrichedRow);
            store.put(enrichedRow);
            enriched++;
          } else repeated++;
          continue;
        }
        const value = { ...previous, ...row };
        known.set(value.key, value);
        store.put(value);
        if (!previous) added++;
      }
    };
    txn.oncomplete = () => resolve({ added, repeated, enriched });
    txn.onerror = () => reject(txn.error);
    txn.onabort = () => reject(txn.error || new Error('无法保存账单'));
  });
}

function refresh(preferredPeriod) {
  const all = demo ? sampleRows : reconcile(data);
  $('demo-bar').hidden = !demo;
  $('empty-ledger').hidden = demo || all.length > 0;
  $('ledger-type').textContent = demo ? '示例数据' : '本机账本';
  $('coverage').textContent = all.length && !demo ? '本机保存 · ' + all.length + ' 笔' : '账单保存在此浏览器';
  const paymentOptions = [...new Set(all.map(row => row.source))].sort((a, b) => paymentLabel(a).localeCompare(paymentLabel(b), 'zh-CN'));
  fillFilterOptions($('payment-source'), paymentOptions.map(source => [source, paymentLabel(source)]));
  const paymentSources = filterValues($('payment-source'));
  const sourceRows = all.filter(row => matchesFilter(paymentSources, row.source));
  const byMonth = new Map();
  for (const row of sourceRows) {
    const month = row.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, { rows: [], channels: new Set() });
    const entry = byMonth.get(month);
    entry.rows.push(row);
    entry.channels.add(row.source);
  }
  const months = [...byMonth.keys()].sort().reverse();
  const reportPeriod = periodFor(all);
  const asOf = !paymentSources.size ? reportPeriod?.asOf : latestCoveredDate(sourceRows) || undefined;
  const calendar = reportMonths(reportPeriod);
  const availableMonths = [...new Set([...all.map(row => row.date.slice(0, 7)), ...calendar])].sort().reverse();
  periodIndex = indexPeriods(availableMonths.length ? availableMonths : [localMonth]);
  const periodChoice = preferredPeriod || currentPeriod || months[0];
  const selection = (typeof periodChoice === 'string' ? periodIndex.get(periodChoice) : periodChoice) || allPeriods;
  currentPeriod = selection;
  $('period-value').textContent = selection.label;
  fillFilterOptions($('platform'), [...new Set(all.map(item => item.platform))].sort().map(p => [p,p]));
  const brands = [...new Set(all.map(brandName))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  fillFilterOptions($('brand'), brands.map(name => [name, name]));
  const roots = [...new Set(all.map(item => item.category))];
  const categoryOptions = roots.sort().flatMap(root => {
    const details = [...new Set(all.filter(row => row.category === root && row.subcategory).map(row => row.subcategory))].sort();
    return [[root, root], ...details.map(name => [root + ' / ' + name, '　' + name])];
  });
  fillFilterOptions($('category'), categoryOptions);
  const platforms = filterValues($('platform'));
  const brandsSelected = filterValues($('brand'));
  const categoriesSelected = filterValues($('category'));
  const hideFullRefunds = $('refund-view').value === 'hide-full';
  const visibleRows = hideFullRefunds ? withoutFullyRefunded(sourceRows) : sourceRows;
  const period = visibleRows.filter(item => {
    const date = item.date.slice(0, 10);
    return (!selection.start || date >= selection.start && date <= selection.end) &&
      matchesFilter(platforms, item.platform) && matchesFilter(brandsSelected, brandName(item)) &&
      matchesFilter(categoriesSelected, item.category, item.category + ' / ' + item.subcategory);
  });
  const sum = totals(period);
  const { missing: missingPeriod, caption } = selectionStatus(selection, byMonth, asOf);
  const metric = spendingMetric();
  const label = spendingMetricLabel();
  $('metric-label').textContent = label;
  $('trend-title').textContent = label + '折线';
  $('net').textContent = missingPeriod ? '—' : fmt(sum[metric]);
  $('spent').textContent = missingPeriod ? '—' : fmt(sum.expense);
  $('refund').textContent = missingPeriod ? '—' : fmt(sum.refund);
  $('out-count').textContent = missingPeriod ? caption : sum.outCount + ' 笔消费';
  $('refund-count').textContent = missingPeriod ? caption : sum.refundCount + ' 笔退款';
  const periodCaption = metric === 'expense' && caption === '消费扣除到账退款' ? '按付款时间汇总' : caption;
  $('period-caption').textContent = selection.label + ' · ' + periodCaption;
  $('empty').textContent = missingPeriod ? caption : '暂无符合条件的交易';
  const filters = [
    filterSummary(paymentSources, '全部渠道', paymentLabel),
    filterSummary(platforms, '全部平台'),
    filterSummary(brandsSelected, ''),
    filterSummary(categoriesSelected, ''),
    hideFullRefunds ? '隐藏全额退款' : ''
  ].filter(Boolean);
  const selected = [selection.label, ...filters];
  $('detail-scope').textContent = '当前范围：' + selected.join(' · ');
  renderCategories(period, categoriesSelected, sum.expense);
  const byBrand = $('spending-dimension').value === 'brand';
  $('spending-breakdown-title').textContent = byBrand ? '品牌／商户支出' : '平台支出';
  renderSpendingBreakdown(period,
    byBrand ? $('brand') : $('platform'), byBrand ? brandName : row => row.platform,
    byBrand ? '品牌／商户' : '平台');
  $('trend-scope').textContent = selected.join(' · ');
  renderTrend(period, byMonth, months, selection, asOf);
  renderAnnual(period, calendar, byMonth, selection, asOf);
  renderRows(period);
  updateOrderCatalogue(selection, platforms, brandsSelected, categoriesSelected, paymentSources);
}
function updateOrderCatalogue(selection, platforms, brandsSelected, categoriesSelected, paymentSources) {
  const catalogue = $('pdd-orders');
  if (!catalogue) return;
  catalogue.hidden = demo || spendingMetric() === 'net' || paymentSources.size > 0 || !matchesFilter(platforms, '拼多多');
  const restricted = Boolean(selection.start) || brandsSelected.size > 0 || categoriesSelected.size > 0 || $('refund-view').value === 'hide-full';
  for (const id of ['pdd-count', 'pdd-search-label', 'pdd-scroll', 'pdd-source-note']) $(id).hidden = restricted;
  $('pdd-filter-note').hidden = !restricted;
}
function renderAnnual(rows, calendar, byMonth, selection, asOf) {
  const visibleMonths = selection.months ? calendar.filter(month => selection.months.includes(month)) : calendar;
  $('annual').hidden = !visibleMonths.length;
  $('annual-link').hidden = !visibleMonths.length;
  const grid = $('annual-grid');
  grid.replaceChildren();
  if (!visibleMonths.length) return;
  const grouped = transactionsByDate(rows, 7);
  const years = [...new Set(visibleMonths.map(month => month.slice(0, 4)))];
  $('annual-title').textContent = years.join('—') + ' 年月度账单';
  for (const year of years) {
    const yearCard = element('div');
    yearCard.className = 'year-months';
    yearCard.append(element('h3', year + ' 年'));
    for (const month of visibleMonths.filter(value => value.startsWith(year))) {
      const monthScope = periodWithinMonth(selection, month);
      const monthRows = grouped.get(month) || [];
      const coverage = selectionStatus(monthScope, byMonth, asOf);
      const node = element('button');
      node.type = 'button';
      node.className = 'report-month';
      node.setAttribute('aria-pressed', String(selection.months?.length === 1));
      const period = element('span', Number(month.slice(5)) + ' 月');
      const subtitle = element('small', coverage.missing ? coverage.caption : monthRows.length
        ? periodStatus(month, byMonth.get(month)?.channels, monthScope.end >= asOf ? asOf : undefined)
        : '暂无匹配交易');
      period.append(subtitle);
      node.append(period, element('strong', coverage.missing ? '—' : fmt(totals(monthRows)[spendingMetric()])));
      node.addEventListener('click', () => {
        refresh(monthScope);
        $('details').focus({ preventScroll: true });
        $('details').scrollIntoView({ block: 'start' });
      });
      yearCard.append(node);
    }
    grid.append(yearCard);
  }
}
function renderCategories(rows, selected, expense) {
  const area = $('categories');
  const root = selected.size === 1 ? [...selected][0].split(' / ')[0] : '';
  const groupName = row => root ? (row.subcategory || row.category) : row.category;
  const selectedGroups = new Set([...selected].map(name => root ? name.split(' / ').at(-1) : name.split(' / ')[0]));
  const chooseCategory = name => {
    const select = $('category');
    const value = root ? root + ' / ' + name : name;
    if (![...select.options].some(option => option.value === value)) return false;
    if (root) {
      setFilterValues(select, selected.has(value) ? [root] : [value]);
      refresh();
    } else toggleFilterValue(select, value);
    return true;
  };
  if (spendingMetric() === 'net') {
    renderNetDistribution(area, groupedSpending(rows, groupName), selectedGroups, value => value, chooseCategory, '暂无支出与退款');
    return;
  }
  area.replaceChildren();
  if (!expense) { area.append(element('p','暂无消费数据')); return; }
  const values = new Map();
  for (const row of rows.filter(r => r.kind === 'expense')) {
    const name = groupName(row);
    const group = values.get(name) || { amount: 0, count: 0 };
    group.amount += row.amount;
    group.count++;
    values.set(name, group);
  }
  for (const [name, { amount, count }] of [...values].sort((a,b) => b[1].amount - a[1].amount)) {
    const percent = amount / expense * 100;
    const button = element('button');
    button.type = 'button';
    button.className = 'category-row';
    const heading = element('span', name);
    const link = element('small', '查看 ' + count + ' 笔消费');
    link.className = 'category-count';
    heading.append(link);
    button.append(heading, element('strong', fmt(amount) + '  ·  ' + percent.toFixed(1) + '%'));
    const rail = element('span');
    rail.className = 'rail';
    const fill = element('span');
    fill.className = 'fill';
    fill.style.width = percent + '%';
    rail.append(fill);
    button.append(rail);
    button.addEventListener('click', () => {
      $('search').value = '';
      $('only-missing').checked = false;
      if (!chooseCategory(name)) refresh();
      $('details').focus({ preventScroll: true });
      $('details').scrollIntoView({ block: 'start' });
    });
    area.append(button);
  }
  const note = element('p','占比按消费支出计算');
  note.className = 'breakdown-note';
  area.append(note);
}
function renderSpendingBreakdown(rows, select, nameOf, dimension) {
  const selected = filterValues(select);
  const area = $('platform-statistics');
  area.replaceChildren();
  if (!rows.length) { area.append(element('p', '暂无符合条件的交易')); return; }
  const groups = new Map();
  for (const row of rows) {
    const name = nameOf(row);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }
  const breakdown = [...groups].map(([name, entries]) => ({ name, ...totals(entries) }))
    .sort((a, b) => b[spendingMetric()] - a[spendingMetric()] || a.name.localeCompare(b.name, 'zh-CN'));
  const metric = spendingMetric();
  const columns = metric === 'net' ? [['net', '净支出']] : [['expense', '消费金额'], ['refund', '到账退款'], ['net', '净支出']];
  const table = element('table');
  table.className = 'platform-statistics';
  const heading = table.createTHead().insertRow();
  for (const column of [dimension, ...columns.map(([, text]) => text)]) {
    const cell = element('th', column);
    cell.scope = 'col';
    heading.append(cell);
  }
  const body = table.createTBody();
  for (const group of breakdown) {
    const { name } = group;
    const tr = body.insertRow();
    const heading = element('th');
    heading.scope = 'row';
    const button = element('button', name);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(selected.has(name)));
    button.addEventListener('click', () => {
      const index = [...body.rows].indexOf(tr);
      toggleFilterValue(select, name);
      area.querySelectorAll('button')[index]?.focus({ preventScroll: true });
    });
    heading.append(button);
    tr.append(heading);
    for (const [key] of columns) tr.insertCell().textContent = fmt(group[key]);
  }
  area.append(table);
}
function createChartTooltip(area) {
  const popup = element('div');
  popup.className = 'chart-tooltip';
  popup.id = area.id + '-tooltip';
  popup.setAttribute('role', 'tooltip');
  popup.hidden = true;
  area.append(popup);
  let displayed;

  function show(detail, x, y) {
    if (displayed !== detail) {
      const fields = element('dl');
      for (const [label, value] of detail.fields) fields.append(element('dt', label), element('dd', value));
      popup.replaceChildren(element('strong', detail.title), fields);
      displayed = detail;
    }
    popup.hidden = false;
    const { width, height } = popup.getBoundingClientRect();
    const left = Math.max(8, Math.min(x + 13, document.documentElement.clientWidth - width - 8));
    const preferredTop = y >= height + 20 ? y - height - 12 : y + 14;
    const top = Math.max(8, Math.min(preferredTop, document.documentElement.clientHeight - height - 8));
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  }

  const hide = () => { popup.hidden = true; };
  function bind(target, detail, followPointer = true) {
    target.setAttribute('aria-describedby', popup.id);
    target.addEventListener('focus', () => {
      const bounds = target.getBoundingClientRect();
      show(detail, bounds.left + bounds.width / 2, bounds.top);
    });
    target.addEventListener('blur', hide);
    target.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
    if (followPointer) {
      const track = event => { if (event.pointerType !== 'touch') show(detail, event.clientX, event.clientY); };
      target.addEventListener('pointerenter', track);
      target.addEventListener('pointermove', track);
      target.addEventListener('pointerleave', hide);
    }
  }
  return { show, hide, bind };
}

const trendGrainNames = { day: '日', week: '周', month: '月', quarter: '季度', year: '年' };
const trendGrainSteps = { day: 1, week: 7, month: 1, quarter: 3, year: 12 };
const trendDayMs = 86400000;
let trendGrain = 'auto';

function trendDate(key) {
  return new Date(key + 'T00:00:00Z');
}
function trendDayKey(date) {
  return date.toISOString().slice(0, 10);
}
function trendBucketStart(day, grain) {
  if (grain === 'day') return day;
  if (grain === 'week') {
    const date = trendDate(day);
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    return trendDayKey(date);
  }
  const month = Number(day.slice(5, 7));
  const first = grain === 'year' ? 1 : grain === 'quarter' ? Math.floor((month - 1) / 3) * 3 + 1 : month;
  return day.slice(0, 5) + String(first).padStart(2, '0') + '-01';
}
function nextTrendBucket(start, grain) {
  const date = trendDate(start);
  if (grain === 'day' || grain === 'week') date.setUTCDate(date.getUTCDate() + trendGrainSteps[grain]);
  else date.setUTCMonth(date.getUTCMonth() + trendGrainSteps[grain]);
  return date;
}
function defaultTrendGrain(start, end) {
  const days = (trendDate(end) - trendDate(start)) / trendDayMs + 1;
  if (days <= 45) return 'day';
  if (days <= 120) return 'week';
  if (days <= 730) return 'month';
  if (days <= 1461) return 'quarter';
  return 'year';
}
function trendBucketLabel(start, grain, sameYear) {
  const year = start.slice(0, 4);
  const month = Number(start.slice(5, 7));
  const day = Number(start.slice(8, 10));
  if (grain === 'year') return year;
  if (grain === 'quarter') return (sameYear ? '' : year.slice(2) + '/') + 'Q' + Math.ceil(month / 3);
  if (grain === 'month') return sameYear ? month + '月' : start.slice(2, 7).replace('-', '/');
  return month + '/' + day;
}
function buildTrendSeries(rows, byMonth, start, end, grain, asOf) {
  const buckets = new Map();
  for (const row of rows) {
    const day = row.date.slice(0, 10);
    if (day < start || day > end) continue;
    const key = trendBucketStart(day, grain);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }
  const series = [];
  for (let key = trendBucketStart(start, grain); key <= end;) {
    const next = nextTrendBucket(key, grain);
    const last = trendDayKey(new Date(next.valueOf() - trendDayMs));
    const from = key < start ? start : key;
    const through = last > end ? end : last;
    const quarter = Math.ceil(Number(key.slice(5, 7)) / 3);
    const presetKey = { month: key.slice(0, 7), quarter: key.slice(0, 4) + '-Q' + quarter, year: key.slice(0, 4) }[grain];
    const preset = periodIndex.get(presetKey);
    const clipped = customPeriod(from, through);
    const scope = preset?.start === from && preset.end === through ? preset : clipped;
    const title = grain === 'month' ? monthLabel(key.slice(0, 7)) :
      grain === 'quarter' ? key.slice(0, 4) + ' 年第 ' + quarter + ' 季度' :
      grain === 'year' ? key.slice(0, 4) + ' 年' : clipped.label;
    const coverage = selectionStatus(clipped, byMonth, asOf);
    const amounts = totals(buckets.get(key) || []);
    series.push({ key, scope, title, range: clipped.label, amounts,
      caption: coverage.caption, value: coverage.missing ? null : amounts[spendingMetric()] });
    key = trendDayKey(next);
  }
  return series;
}

function renderTrend(rows, byMonth, months, selection, asOf) {
  const area = $('trend');
  const controls = $('trend-granularity');
  controls.onclick = event => {
    const button = event.target.closest('button[data-grain]');
    if (!button || button.dataset.grain === trendGrain) return;
    trendGrain = button.dataset.grain;
    renderTrend(rows, byMonth, months, selection, asOf);
  };
  for (const button of controls.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.grain === trendGrain));
  }
  $('trend-grain-label').textContent = '';
  area.replaceChildren();
  if (!months.length) { area.append(element('p','暂无趋势数据')); return; }
  const start = selection.start || months.at(-1) + '-01';
  const lastMonth = months[0];
  const end = selection.end || makePeriod(lastMonth, 'month', monthLabel(lastMonth), [lastMonth]).end;
  const grain = trendGrain === 'auto' ? defaultTrendGrain(start, end) : trendGrain;
  $('trend-grain-label').textContent = '按' + trendGrainNames[grain] + '汇总' + (grain === 'week' ? ' · 周一至周日' : '');
  const series = buildTrendSeries(rows, byMonth, start, end, grain, asOf);
  const known = series.filter(point => point.value !== null);
  if (!known.length) { area.append(element('p', '暂无趋势数据')); return; }
  const values = known.map(point => point.value);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const targetStep = (maximum - minimum) / 4 || 100;
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));
  const step = Math.max(1, Math.round(magnitude * [1, 2, 2.5, 5, 10].find(factor => factor * magnitude >= targetStep)));
  const low = Math.floor(minimum / step) * step;
  const high = Math.max(low + step, Math.ceil(maximum / step) * step);
  const yAt = value => 1 - (value - low) / (high - low);
  const number = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });

  const scroll = element('div');
  scroll.className = 'trend-scroll';
  const chart = element('div');
  chart.className = 'line-chart';
  const labelWidth = { day: 34, week: 42, month: 47, quarter: 52, year: 52 }[grain];
  const slot = series.length > 100 ? 26 : labelWidth;
  const labelInterval = Math.ceil(labelWidth / slot);
  chart.style.minWidth = Math.max(230, series.length * slot + 72) + 'px';
  const unit = element('span', '元');
  unit.className = 'trend-unit';
  const axis = element('div');
  axis.className = 'trend-scale';
  axis.setAttribute('aria-hidden', 'true');
  const plot = element('div');
  plot.className = 'trend-plot';
  const canvas = element('canvas');
  canvas.width = Math.min(8192, Math.max(1400, series.length * slot));
  canvas.height = 400;
  canvas.setAttribute('aria-hidden', 'true');
  plot.append(canvas);
  const labels = element('div');
  labels.className = 'trend-labels';
  labels.setAttribute('aria-hidden', 'true');
  const readout = element('p');
  readout.className = 'trend-readout';
  const pointTitle = ({ title }) => title;
  const metricLabel = spendingMetricLabel();
  const showRefund = spendingMetric() === 'net';
  const details = series.map(point => ({
    title: pointTitle(point),
    fields: point.value === null ? [['账单状态', point.caption]] : [
      ...(point.range === point.title ? [] : [['时间范围', point.range]]),
      [metricLabel, fmt(point.value)],
      ...(showRefund ? [
        ['消费', fmt(point.amounts.expense) + '（' + point.amounts.outCount + ' 笔）'],
        ['退款', fmt(point.amounts.refund) + '（' + point.amounts.refundCount + ' 笔）']
      ] : [['消费笔数', point.amounts.outCount + ' 笔']]),
      ...(point.caption === '消费扣除到账退款' ? [] : [['账单覆盖', point.caption]])
    ]
  }));
  const summary = point => pointTitle(point) + (point.value === null ? ' · ' + point.caption :
    ' · ' + metricLabel + ' ' + fmt(point.value));
  const tooltip = createChartTooltip(area);
  const highlighted = known.at(-1);
  readout.textContent = summary(highlighted);
  const context = canvas.getContext('2d');
  context?.beginPath();
  let connected = false;
  for (let value = high; value >= low; value -= step) {
    const tick = element('span', number.format(value / 100));
    tick.style.top = yAt(value) * 100 + '%';
    axis.append(tick);
    const line = element('div');
    line.className = value === 0 ? 'trend-grid trend-zero' : 'trend-grid';
    line.style.top = tick.style.top;
    plot.append(line);
  }
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  for (const [index, point] of series.entries()) {
    const { key, value } = point;
    const axisLabel = index % labelInterval === 0 ? trendBucketLabel(key, grain, sameYear) : '';
    const label = element('span', axisLabel);
    labels.append(label);
    if (value === null) {
      label.className = 'no-data';
      label.title = point.caption;
      connected = false;
      continue;
    }
    const x = (index + 0.5) / series.length;
    const y = yAt(value);
    if (connected) context?.lineTo(x * canvas.width, y * canvas.height);
    else context?.moveTo(x * canvas.width, y * canvas.height);
    connected = true;
    const button = element('button');
    button.type = 'button';
    button.className = point === highlighted ? 'trend-point active' : 'trend-point';
    button.style.left = x * 100 + '%';
    button.style.top = y * 100 + '%';
    button.setAttribute('aria-label', pointTitle(point) + '，查看交易');
    tooltip.bind(button, details[index], false);
    button.addEventListener('focus', () => { readout.textContent = summary(point); });
    button.addEventListener('blur', () => { readout.textContent = summary(highlighted); });
    button.addEventListener('click', () => refresh(point.scope));
    plot.append(button);
  }
  if (context) {
    context.strokeStyle = '#307d60';
    context.lineWidth = 4;
    context.lineJoin = 'round';
    context.stroke();
  }
  const trackPoint = event => {
    if (event.pointerType === 'touch') return;
    const bounds = plot.getBoundingClientRect();
    if (!bounds.width) return;
    const index = Math.max(0, Math.min(series.length - 1,
      Math.floor((event.clientX - bounds.left) / bounds.width * series.length)));
    tooltip.show(details[index], event.clientX, event.clientY);
    readout.textContent = summary(series[index]);
  };
  const resetPoint = () => {
    tooltip.hide();
    readout.textContent = summary(highlighted);
  };
  plot.addEventListener('pointerenter', trackPoint);
  plot.addEventListener('pointermove', trackPoint);
  plot.addEventListener('pointerleave', resetPoint);
  scroll.addEventListener('scroll', resetPoint, { passive: true });
  chart.append(unit, axis, plot, labels);
  scroll.append(chart);
  area.append(scroll, readout);
}
function renderRows(rows) {
  const body = $('transactions');
  body.replaceChildren();
  const query = $('search').value.trim().toLowerCase();
  const sort = $('transaction-sort').value;
  const direction = { high: -1, low: 1 }[sort] || 0;
  const sortLabel = {
    high: '当前金额从高到低，点击切换为从低到高',
    low: '当前金额从低到高，点击切换为从高到低'
  }[sort] || '按金额从高到低排序';
  $('amount-sort-direction').textContent = { high: '↓', low: '↑' }[sort] || '↕';
  $('amount-sort').setAttribute('aria-label', sortLabel);
  $('amount-sort').title = sortLabel;
  const unresolved = rows.filter(row => describeTransaction(row).availability === 'missing').length;
  $('missing-filter').hidden = demo || (unresolved === 0 && !$('only-missing').checked);
  matchingRows = rows.map(row => ({ row, description: describeTransaction(row) }))
    .filter(({ row, description }) => (!$('only-missing').checked || description.availability === 'missing') &&
      (!query || [description.name, row.statementTitle, row.orderMerchant, row.merchant, row.platform, row.brand, row.source, row.method, row.order, row.id, row.category, row.subcategory].join(' ').toLowerCase().includes(query)))
    .sort((a,b) => direction * (a.row.amount - b.row.amount) || b.row.date.localeCompare(a.row.date));
  $('empty').hidden = !!matchingRows.length;
  $('row-count').textContent = matchingRows.length + ' 笔' + (unresolved ? ' · 当前范围 ' + unresolved + ' 笔商品名待补' : '');
  displayedRows = 0;
  $('transaction-scroll').scrollTop = 0;
  appendRows();
}
function appendRows() {
  const body = $('transactions');
  const batch = matchingRows.slice(displayedRows, displayedRows + rowPageSize);
  displayedRows += batch.length;
  for (const { row, description } of batch) {
    const card = element('article');
    card.className = 'transaction';
    const identity = element('div');
    const title = element('button', description.name);
    title.type = 'button';
    title.className = 'transaction-title';
    title.addEventListener('click', () => openTransaction(row, description));
    const source = element('small', description.label);
    source.className = 'evidence' + (description.availability === 'missing' ? ' missing' : '');
    const seller = [row.platform === '其他' ? '' : row.platform, row.merchant && row.merchant !== row.platform ? row.merchant : ''].filter(Boolean).join(' · ');
    identity.append(title, source);
    const info = element('div');
    info.className = 'transaction-info';
    const payment = row.source === '示例' ? '示例付款方式' : row.method || '扣款账户未提供';
    const type = element('div');
    const label = row.category + (row.subcategory ? ' / ' + row.subcategory : '');
    if (demo) type.textContent = label;
    else {
      const button = element('button', label);
      button.type = 'button';
      button.className = 'category-edit';
      button.setAttribute('aria-label','编辑类别：' + label);
      button.addEventListener('click', () => openEdit(row));
      type.append(button);
    }
    const storeName = row.orderMerchant || description.storeName;
    if (storeName) info.append(element('span', '门店：' + storeName));
    info.append(element('span', '商家：' + (seller || '账单未提供')));
    if (row.brand && row.brand !== row.platform && row.brand !== row.merchant) {
      info.append(element('span', '品牌：' + row.brand));
    }
    info.append(element('span', (row.kind === 'refund' ? '退款来源：' : '支付来源：') + row.source + ' · ' + payment), type);
    const numbers = element('div');
    numbers.className = 'transaction-numbers';
    const amount = element('strong', (row.kind === 'refund' ? '+ ' : '') + fmt(row.amount));
    if (row.kind === 'refund') amount.className = 'positive';
    numbers.append(amount, element('small', row.date.slice(0,10) + (row.kind === 'refund' ? ' · 退款' : '')));
    card.append(identity, info, numbers);
    body.append(card);
  }
}

function openTransaction(row, description) {
  $('transaction-title').textContent = description.name;
  $('transaction-evidence').textContent = description.label;
  $('transaction-amount').textContent = (row.kind === 'refund' ? '+ ' : '') + fmt(row.amount);
  const facts = element('dl');
  const channelLabel = row.kind === 'refund' ? '退款渠道' : '支付渠道';
  const accountLabel = row.kind === 'refund' ? '退款到账方式' : '实际扣款账户';
  const fields = [
    ['交易时间', row.date.replace('T', ' ')],
    ['下单平台', row.platform === '其他' ? '账单未标明平台' : row.platform],
    ['收款商家', row.merchant || '账单未提供'],
    [channelLabel, row.source],
    [accountLabel, row.method || '账单未提供'],
    ['消费类别', row.category + (row.subcategory ? ' / ' + row.subcategory : '')],
    ['交易状态', row.status || (row.kind === 'refund' ? '退款' : '消费')],
    ['账单原文', row.statementTitle || row.item || '账单未提供'],
    ['商家订单号', row.order || row.matchedOrder || '账单未提供'],
    ['支付交易号', row.id || '账单未提供']
  ];
  if (row.brand) fields.splice(3, 0, ['品牌／商户', row.brand]);
  if (row.orderMerchant) fields.splice(3, 0, ['原订单店铺', row.orderMerchant]);
  else if (description.storeName) fields.splice(3, 0, ['账单中的门店', description.storeName]);
  if (row.matchedOrder && row.matchedOrder !== row.order) fields.push(['已匹配平台订单', row.matchedOrder]);
  for (const [label, value] of fields) facts.append(element('dt', label), element('dd', value));
  $('transaction-facts').replaceChildren(facts);
  const productArea = $('transaction-products');
  productArea.hidden = !row.products?.length;
  productArea.replaceChildren();
  if (row.products?.length) {
    const list = element('ul');
    for (const product of row.products) {
      const attributes = [product.name, product.variant, product.quantity && '数量 ' + product.quantity].filter(Boolean);
      list.append(element('li', attributes.join(' · ')));
    }
    productArea.append(element('h3', '订单内商品'), list);
  }
  $('transaction-dialog').showModal();
}
function filterBy(select, value) {
  select.value = value;
  refresh();
}
function openEdit(row) {
  editRecord = row;
  $('edit-title').textContent = row.item || row.merchant || fmt(row.amount);
  fillOptions($('edit-category'), categories.map(name => [name,name]), row.category);
  $('edit-category').value = row.category;
  $('edit-detail').value = row.subcategory;
  $('edit-dialog').returnValue = '';
  $('edit-dialog').showModal();
}
$('edit-dialog').addEventListener('close', async () => {
  if ($('edit-dialog').returnValue !== 'save' || !editRecord) return;
  try {
    const row = data.find(item => item.key === editRecord.key);
    await saveRows([{ ...row, customCategory: $('edit-category').value, customDetail: $('edit-detail').value.trim() }], true);
    data = await storedRows();
    refresh();
  } catch {
    report('暂时无法在浏览器保存分类修改。');
  }
});
function requestPassword(filename) {
  const dialog = $('password-dialog');
  $('password-file').textContent = filename;
  $('password').value = '';
  dialog.returnValue = '';
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm' ? $('password').value : null), { once:true });
    dialog.showModal();
  });
}
function decodeText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  try { return new TextDecoder('utf-8', { fatal:true }).decode(bytes); }
  catch { return new TextDecoder('gb18030').decode(bytes); }
}
const supported = /\.(csv|txt|xlsx|xls)$/i;
const maxFile = 25 * 1024 * 1024;
function sheets(bytes, filename) {
  const compound = bytes[0] === 0xd0 && bytes[1] === 0xcf;
  const compressed = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const book = window.XLSX.read(compound || compressed ? bytes : decodeText(bytes),
    { type:compound || compressed ? 'array' : 'string', raw:true });
  const outputs = [];
  let errors = [];
  for (const sheet of book.SheetNames) {
    const rows = window.XLSX.utils.sheet_to_json(book.Sheets[sheet], { header:1, defval:'', raw:true });
    try { outputs.push(parseRows(rows, filename)); }
    catch (error) { errors.push(error.message); }
  }
  if (!outputs.length) throw new Error(errors[0] || '文件中没有可读取的工作表');
  return outputs;
}
async function readFile(file) {
  if (file.size > maxFile) throw new Error('单个文件请小于 25 MB');
  if (!/\.zip$/i.test(file.name)) {
    if (!supported.test(file.name)) throw new Error('请使用 CSV、TXT、Excel 或 ZIP 文件');
    return { outputs:sheets(new Uint8Array(await file.arrayBuffer()), file.name), warnings:[] };
  }
  const lib = window.zip;
  lib.configure({ useWebWorkers:false, useCompressionStream:false });
  const reader = new lib.ZipReader(new lib.BlobReader(file));
  try {
    const entries = (await reader.getEntries()).filter(entry => !entry.directory && supported.test(entry.filename) && !entry.filename.startsWith('__MACOSX/'));
    if (!entries.length) throw new Error('压缩包里没有账单表格');
    if (entries.length > 50 || entries.reduce((sum,e) => sum + e.uncompressedSize,0) > maxFile) throw new Error('解压后的账单请小于 25 MB');
    const password = entries.some(entry => entry.encrypted) ? await requestPassword(file.name) : undefined;
    const outputs = [];
    const warnings = [];
    for (const entry of entries) {
      if (entry.encrypted && password == null) { warnings.push(entry.filename + '：已跳过加密文件'); continue; }
      try {
        const bytes = await entry.getData(new lib.Uint8ArrayWriter(), { password, checkSignature:true, useWebWorkers:false });
        outputs.push(...sheets(bytes, file.name + '/' + entry.filename));
      } catch (error) {
        warnings.push(entry.filename + '：' + (entry.encrypted && /password|signature|crc/i.test(error.message) ? '解压密码有误或文件损坏' : error.message));
      }
    }
    return { outputs, warnings };
  } finally {
    await reader.close();
  }
}
async function importFiles(files) {
  if (!files.length) return;
  $('import-button').disabled = true;
  report('正在读取 ' + files.length + ' 份账单…');
  try {
    const entries = [];
    const warnings = [];
    let unknown = 0;
    let skipped = 0;
    for (const file of files) {
      try {
        const result = await readFile(file);
        warnings.push(...result.warnings);
        for (const parsed of result.outputs) {
          entries.push(...parsed.rows);
          unknown += parsed.unknown;
          skipped += parsed.skipped;
        }
      } catch (error) {
        warnings.push(file.name + '：' + error.message);
      }
    }
    const saved = await saveRows(entries);
    data = await storedRows();
    if (data.length) {
      demo = false;
      const newest = data.filter(row => row.kind !== 'order').map(row => row.date.slice(0,7)).sort().at(-1);
      for (const select of options) setFilterValues(select, []);
      refresh(newest);
    }
    const nOrders = entries.filter(row => row.kind === 'order').length;
    const result = ['新增 ' + saved.added + ' 条，已跳过 ' + saved.repeated + ' 条重复记录。'];
    if (saved.enriched) result.push('补全 ' + saved.enriched + ' 条已有交易的明细。');
    if (nOrders) result.push('本次读取 ' + nOrders + ' 条订单，用于补充商品明细。');
    if (unknown || skipped) result.push(unknown + ' 条交易方向不明，' + skipped + ' 条金额或订单字段缺失，未计入统计。');
    if (!entries.length && !warnings.length && !unknown && !skipped) result.push('文件里没有可计入的消费或退款。');
    report([...result, ...warnings].join('\n'));
  } catch (error) {
    report('无法保存账单：' + error.message);
  } finally {
    $('import-button').disabled = false;
    $('files').value = '';
  }
}
$('import-button').addEventListener('click', () => $('files').click());
$('files').addEventListener('change', event => importFiles([...event.target.files]));
$('filters').addEventListener('submit', event => event.preventDefault());
const filterBar = $('filters');
const updateFilterScrollOffset = () => document.documentElement.style.setProperty(
  '--filter-bar-height', Math.ceil(filterBar.getBoundingClientRect().height) + 'px');
updateFilterScrollOffset();
new ResizeObserver(updateFilterScrollOffset).observe(filterBar);
$('spending-metric').addEventListener('change', () => refresh());
$('refund-view').addEventListener('change', () => refresh());
initMultiFilters();
$('spending-dimension').addEventListener('change', () => refresh());
$('period-button').addEventListener('click', openPeriodDialog);
$('period-cancel').addEventListener('click', () => $('period-dialog').close());
for (const button of $('period-modes').querySelectorAll('button')) {
  button.addEventListener('click', () => {
    draftMode = button.dataset.mode;
    renderPeriodDraft();
  });
}
for (const id of ['period-year', 'period-unit']) $(id).addEventListener('change', renderPeriodDraft);
for (const id of ['period-start', 'period-end']) {
  $(id).addEventListener('change', () => {
    $('period-error').hidden = true;
    syncRangePicker(id === 'period-start');
  });
}
$('period-form').addEventListener('submit', event => {
  event.preventDefault();
  let selection;
  if (draftMode === 'custom') {
    const start = $('period-start');
    const end = $('period-end');
    if (!start.validity.valid || !end.validity.valid || start.value > end.value) {
      $('period-error').textContent = '请选择有效的开始和结束日期，结束日期需晚于或等于开始日期。';
      $('period-error').hidden = false;
      (!start.validity.valid ? start : end).focus();
      return;
    }
    selection = customPeriod(start.value, end.value);
  } else {
    const value = draftMode === 'all' ? 'all' : (draftMode === 'year' ? $('period-year').value : $('period-unit').value);
    selection = periodIndex.get(value) || allPeriods;
  }
  $('period-dialog').close();
  refresh(selection);
});
$('search').addEventListener('input', () => refresh());
$('only-missing').addEventListener('change', () => refresh());
$('transaction-sort').addEventListener('change', () => refresh());
$('amount-sort').addEventListener('click', () => {
  const sort = $('transaction-sort');
  filterBy(sort, sort.value === 'high' ? 'low' : 'high');
});
$('transaction-scroll').addEventListener('scroll', event => {
  const viewport = event.currentTarget;
  if (displayedRows < matchingRows.length &&
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 180) appendRows();
}, { passive: true });
$('reset').addEventListener('click', () => {
  $('refund-view').value = 'all';
  for (const select of options) setFilterValues(select, []);
  $('search').value = '';
  $('only-missing').checked = false;
  refresh(allPeriods);
});
$('hide-demo').addEventListener('click', () => {
  demo = false;
  refresh();
});
$('show-demo').addEventListener('click', () => {
  demo = true;
  currentPeriod = undefined;
  $('search').value = '';
  $('only-missing').checked = false;
  refresh();
});
$('import-button').disabled = true;
try {
  if (offlineRows.length) await saveRows(offlineRows);
  data = await storedRows();
  datasetReady = true;
} catch {
  data = offlineRows;
  report('此浏览器暂时无法保存账单。');
}
$('import-button').disabled = !datasetReady;
refresh();
