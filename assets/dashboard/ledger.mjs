const fields = {
  date: ['交易时间', '交易日期', '消费日期', '记账日期', '付款时间', '支付时间', '创建时间', '下单时间', '日期', '时间'],
  amount: ['金额', '交易金额', '人民币金额', '消费金额', '交易金额人民币', '入账金额', '实收金额', '实付金额', '实际支付金额', '订单实付总额', '订单实付款', '实付款', '买家实付金额'],
  direction: ['收支', '收支方向', '收支类型', '资金流向', '借贷标志', '借贷方向', '收入支出'],
  status: ['交易状态', '当前状态', '订单状态', '状态'],
  category: ['交易分类', '交易类型', '业务类型', '消费类型', '类型', '分类', '业务名称'],
  merchant: ['交易对方', '对方', '商户名称', '商户', '收款方', '店铺名称', '卖家昵称', '交易摘要'],
  item: ['商品说明', '商品', '商品名称', '商品标题', '商品信息', '服务名称', '名称', '交易说明', '交易描述', '摘要', '备注'],
  variant: ['规格', '商品规格', '规格属性', '商品属性', 'sku', 'sku属性'],
  quantity: ['数量', '商品数量', '购买数量'],
  id: ['交易订单号', '交易单号', '支付宝交易号', '交易号', '流水号', '参考号', '订单编号', '订单号'],
  order: ['商家订单号交易号', '商家订单号', '商户单号', '商户订单号', '订单编号', '订单号', '主订单编号'],
  method: ['收付方式', '收付款方式', '支付方式', '付款方式', '出入账方式', '扣款账户', '资金渠道']
};
const platforms = [
  ['拼多多', /拼多多|多多买菜|多多钱包|PINDUODUO/i],
  ['美团', /美团|大众点评|MEITUAN/i],
  ['淘宝闪购', /淘宝闪购/],
  ['淘宝', /淘宝|天猫|TAOBAO|TMALL|闲鱼/i],
  ['京东', /京东|JD\.COM/i],
  ['饿了么', /饿了么/i],
  ['抖音', /抖音|DOUYIN/i],
  ['小红书', /小红书|小紅書|\bxiaohongshu\b|\brednote\b|行吟信息科技/i]
];
const merchantBrands = [
  ['魔盒 CITYBOX', /魔盒|CITYBOX/i],
  ['高德打车／顺风车', /高德打车|高德顺风车/],
  ['中国移动', /中国移动/],
  ['叮咚买菜', /叮咚买菜/],
  ['杭州地铁', /杭州(?:杭港)?地铁/],
  ['明康汇', /明康汇/],
  ['滴滴出行', /滴滴出行|滴滴打车/],
  ['携程', /携程|上海赫程国际旅行社/],
  ['App Store／Apple Music', /App Store|Apple Music|Apple Services/i],
  ['盒马', /盒马/],
  ['1688', /^(?:阿里巴巴)?1688(?:平台|先采后付|$)/],
  ['铁路 12306', /铁路\s*12306|中国铁路/],
  ['优衣库', /优衣库|UNIQLO/i],
  ['希尔顿', /希尔顿/],
  ['菜鸟', /菜鸟/],
  ['北京地铁', /北京地铁|北京轨道交通路网管理/],
  ['随申行', /随申行/],
  ['巴比馒头', /巴比馒头/],
  ['膳博士', /膳博士/],
  ['迪卡侬', /迪卡侬/],
  ['麦当劳', /麦当劳/],
  ['宜家', /宜家家居/],
  ['永辉超市', /永辉超市/],
  ['美宜佳', /美宜佳/],
  ['% Arabica', /拉比卡咖啡|% ?Arabica/i],
  ['小红书', /小红书|小紅書|行吟信息科技/],
  ['蜜雪冰城', /蜜雪冰城/],
  ['全家便利', /全家便利/]
];
const rules = [
  ['餐饮', '外卖', /外卖|饿了么|淘宝闪购|点餐/],
  ['餐饮', '咖啡茶饮', /咖啡|奶茶|瑞幸|星巴克|蜜雪|喜茶|霸王茶姬/],
  ['餐饮', '堂食', /餐饮|餐馆|美食|堂食|火锅|饭店|小吃|食堂/],
  ['购物', '日用品', /纸巾|卷纸|洗衣|洗发|牙刷|牙膏|日用品|垃圾袋|清洁/],
  ['购物', '鞋服', /鞋|服饰|衣服|女装|男装|外套|袜子|裤子|羽绒|泳衣/],
  ['购物', '数码', /数码|平板|耳机|手机壳|充电宝|充电器|键盘|鼠标/],
  ['居家', '房租水电', /房租|租房|水费|电费|燃气|物业|宽带/],
  ['居家', '家居家装', /家居|家具|家装|床垫/],
  ['交通', '公交地铁', /公交|地铁|轨道交通/],
  ['交通', '打车', /打车|滴滴|网约车/],
  ['交通', '用车费用', /加油|停车|过路费|充电桩|车主|养车/],
  ['交通', '公共交通', /交通|铁路|高铁|12306/],
  ['旅行', '住宿机票', /机票|酒店|客栈|民宿|旅行|差旅/],
  ['医疗健康', '医药', /医疗|医院|药店|药品|大药房|体检|看病/],
  ['娱乐', '休闲娱乐', /娱乐|电影|游戏|音乐|演出|展览|游乐/],
  ['娱乐', '数字商品', /元宝充值|微豆充值|礼品卡充值/],
  ['教育', '课程书籍', /教育|课程|学费|书籍|图书/],
  ['通讯', '话费流量', /话费|流量|中国移动|中国联通|中国电信/],
  ['生活服务', '家政维修', /家政|保洁|上门维修|理发|洗衣店/],
  ['生活服务', '生活缴费', /生活缴费|公共服务/],
  ['金融费用', '手续费和利息', /年费|手续费|利息|分期费用/]
];
export const categories = [...new Set(rules.map(([name]) => name)), '人情往来', '资金划转', '待分类'];
const alipayTransferText = /转账|账户互转|资金划转/;
const successfulTransfer = /^(交易成功|支付成功|转账成功|收款成功|对方已收钱)$/;
const isAlipayTransfer = row => row.source === '支付宝' && row.kind === 'movement';
const alipayTransferLabel = row => ({ 收入: '转入', 支出: '转出' }[row.direction] || '资金划转');

export function classify(row) {
  if (isAlipayTransfer(row)) return ['资金划转', alipayTransferLabel(row)];
  const clues = [row.item, row.orderMerchant, row.merchant, row.rawCategory, row.statementTitle].filter(Boolean).join(' ');
  const matched = rules.find(([, , pattern]) => pattern.test(clues));
  if (matched) return matched.slice(0, 2);
  if (/超市|粮油|菜场|水果|买菜|生鲜/.test(clues)) return ['餐饮', '买菜生鲜'];
  if (/红包|送礼/.test(clues)) return ['人情往来', '礼金'];
  if (['拼多多', '淘宝', '京东', '抖音'].includes(row.platform) || /购物/.test(clues)) return ['购物', '商品待补'];
  return ['待分类', ''];
}

export function describeTransaction(row) {
  if (isAlipayTransfer(row)) {
    return { name: row.merchant || row.item || '支付宝转账', availability: 'transfer',
      label: '支付宝流水 · ' + alipayTransferLabel(row) };
  }
  if (row.source === '示例') return { name: row.item, availability: 'sample', label: '示例商品' };
  if (row.products?.length) return { name: row.products.map(product => product.name).join('、'), availability: 'order', label: row.platform + '原订单' };
  const title = str(row.item);
  const xiaohongshu = title.match(/^小红书订单[：:]\s*[A-Z\d_-]+\s*(?:[;；]\s*(.*))?$/i);
  if (xiaohongshu) {
    const name = str(xiaohongshu[1]);
    return name ? { name, availability: 'statement', label: '账单商品说明' }
      : { name: '商品名待补', availability: 'missing', label: '账单仅提供小红书订单号' };
  }
  const vendingProduct = title.match(/^智能货柜消费[_：:]\s*(.+?)(?:\s*_消费时间[：:].*|$)/);
  if (vendingProduct?.[1]) return { name: vendingProduct[1], availability: 'statement', label: '从账单提取的商品名' };
  const storeName = title.match(/^(.+?)(?:外卖订单|到店订单)$/)?.[1];
  if (storeName) return { name: '商品名待补', availability: 'missing', label: '账单仅提供门店名', storeName };
  const platform = row.platform === '其他' ? '' : row.platform;
  const generic = /^(?:退款[-－\s]*)?(?:商户单号|商家订单号|商户订单号|平台订单号|订单号|交易号|流水号|订单编号)(?:[：:\s]|[A-Z\d]|$)/i.test(title)
    || /^(?:退款|支付|支付成功|线上支付|订单支付|订单付款|扫码支付|商户消费|交易付款|商品|购物|消费|付款|转账|订单|[-/]+)$/i.test(title)
    || /^(?:退款[-－\s]*)?[A-Z\d_-]{5,}$/i.test(title)
    || /^订单[：:\s]+[A-Z\d_-]+$/i.test(title)
    || /购买商品\s*(?:_消费时间[：:]|$)/.test(title)
    || !!platform && [platform, platform + '平台商户', platform + '订单', platform + '购物', platform + '支付'].includes(title)
    || /^(?:拼多多|淘宝|天猫|美团|京东)(?:退款|订单|支付|订单号)[：:\s]*[A-Z\d_-]*$/i.test(title)
    || title === str(row.merchant);
  if (title && !generic) return { name: title, availability: 'statement', label: '账单商品说明' };
  return { name: '商品名待补', availability: 'missing', label: '账单未提供商品名' };
}

const str = value => String(value ?? '').replace(/^\uFEFF/, '').trim();
const normalized = value => str(value).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}元]/gu, '');
const tidyId = value => str(value).replace(/^`/, '').replace(/^="(.*)"$/, '$1').trim();
function getDate(value) {
  if (typeof value === 'number' && value > 35000 && value < 90000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86400000)).toISOString().slice(0, 19);
  }
  const match = str(value).match(/^(\d{4})[.\/年-](\d{1,2})[.\/月-](\d{1,2})日?(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return '';
  const [, y, m, d, hours = '0', minutes = '00', seconds = '00'] = match;
  const day = [y, m.padStart(2, '0'), d.padStart(2, '0')].join('-');
  if (!Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day) return '';
  return day + 'T' + [hours.padStart(2, '0'), minutes, seconds].join(':');
}
function getAmount(value) {
  let raw = str(value).normalize('NFKC').replace(/[¥,元\s]/g, '');
  if (/^\(.*\)$/.test(raw)) raw = '-' + raw.slice(1, -1);
  if (!/^[+-]?\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, decimal = ''] = raw.replace(/^[+-]/, '').split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents * (raw.startsWith('-') ? -1 : 1) : null;
}
function headerInfo(row) {
  const headers = row.map(normalized);
  const indexes = {};
  for (const [key, names] of Object.entries(fields)) indexes[key] = headers.findIndex(h => names.includes(h));
  return indexes.date >= 0 && indexes.amount >= 0 ? { indexes, headers } : null;
}
function sourceFor(filename, headers) {
  const file = str(filename);
  if (/支付宝|alipay/i.test(file) || headers.includes('交易订单号')) return '支付宝';
  if (/微信|wechat/i.test(file) || (headers.includes('交易单号') && headers.includes('当前状态'))) return '微信';
  const platform = platforms.find(([, pattern]) => pattern.test(file))?.[0];
  if (platform && headers.some(h => ['订单号','订单编号','主订单编号','商品名称','商品标题','服务名称'].includes(h))) return platform;
  return '银行卡';
}

function inferPlatform(row) {
  const description = [row.merchant, row.item].filter(Boolean).join(' ');
  return platforms.find(([, pattern]) => pattern.test(description))?.[0] || '其他';
}

function identifyBrand(row) {
  const merchant = str(row.merchant);
  const description = str(row.statementTitle || row.item);
  const match = merchantBrands.find(([, pattern]) => pattern.test(row.orderMerchant || ''))
    || merchantBrands.find(([, pattern]) => pattern.test(merchant));
  if (match) return match[0];
  if (/Yuansfer|Pockyt/i.test(merchant) && /App Store|Apple Music|Apple Services/i.test(description)) return 'Apple 相关商品';
  if (/蜜雪冰城/.test(description)) return '蜜雪冰城';
  if (/全家便利/.test(description)) return '全家便利';
  if (row.platform === '小红书') return '小红书';
  return '';
}

function transactionKind(row, amount, source) {
  const { status, direction, rawCategory, item, merchant } = row;
  const label = [rawCategory, item, merchant].join(' ');
  if (/交易关闭|交易取消|已关闭|已取消|支付失败|等待买家付款|待付款|未付款|未支付|处理中|退款失败/.test(status)) return 'ignore';
  if (source === '支付宝' && alipayTransferText.test([rawCategory, item].join(' '))) {
    return successfulTransfer.test(status) ? 'movement' : 'ignore';
  }
  if (source === '微信') {
    if (/^转账(?:$|[\s－—-])|^零钱(?:充值|提现)|^信用卡还款|^零钱通/.test(rawCategory)) return 'ignore';
    if (rawCategory === '商户消费' && direction === '支出') return 'expense';
  }
  if (/退款|退货退款|撤销消费/.test(rawCategory) || (/退款|退货退款|撤销消费/.test(item) && /收入|贷/.test(direction))) return 'refund';
  if (/退款成功/.test(status) && /退款|退回/.test(label) && !/支出|借/.test(direction)) return 'refund';
  if (/信用卡还款|借呗还款|花呗还款|存入余额宝|转入零钱通|充值|提现|账户互转|转账收款/.test(label)) return 'ignore';
  if (/不计收支|收入|贷记|^贷$|入账收入/.test(direction)) return 'ignore';
  if (/^转账$/.test(rawCategory) || /^转账$/.test(item)) return 'ignore';
  if (/支出|借记|^借$|消费|扣款/.test(direction)) return 'expense';
  if (source === '银行卡' && /消费|购买|商户|刷卡|支付|扣款|年费|手续费/.test(rawCategory)) return 'expense';
  if (source === '银行卡' && /退款|退货|退回|冲正/.test(label)) return 'refund';
  if (source !== '银行卡' && /交易成功|买家已付款|已全额退款|退款成功|部分退款|已退款/.test(status)) {
    if (/^(支出|付款|支出交易)$/.test(rawCategory) || amount < 0 || row.direction === '-') return 'expense';
  }
  return 'unknown';
}

function parseAlipayTradeHistory(rows, headers, coveredThrough) {
  const column = name => headers.indexOf(name);
  const records = rows.flatMap(cells => {
    const read = name => str(cells[column(name)]);
    const created = getDate(read('交易创建时间'));
    const id = tidyId(read('交易号'));
    const amount = getAmount(read('金额'));
    if (!created || !id || amount === null) return [];
    const row = {
      id, amount, source: '支付宝', date: getDate(read('付款时间')) || created,
      order: tidyId(read('商家订单号')), merchant: read('交易对方'),
      item: read('商品名称'), direction: read('收支'), status: read('交易状态'),
      method: '', rawCategory: '', statementFormat: 'alipay-trade-history', coveredThrough
    };
    const inferredPlatform = inferPlatform(row);
    row.platform = inferredPlatform === '其他' && read('交易来源地') === '淘宝' ? '淘宝' : inferredPlatform;
    const transfer = alipayTransferText.test([row.item, read('类型'), read('备注')].join(' '));
    const movement = transfer || /信用卡还款|借呗还款|花呗还款|余额宝转入|存入余额宝|账户充值|余额充值|^普通充值$|^提现|基金/.test(row.item);
    return [{
      row, transfer, movement, modified: getDate(read('最近修改时间')) || created,
      refunded: getAmount(read('成功退款')) || 0
    }];
  });
  const originalById = new Map();
  const originalByOrder = new Map();
  for (const record of records) {
    const { row, refunded } = record;
    if (row.status === '退款成功' || !refunded) continue;
    originalById.set(row.id, record);
    if (row.order) {
      const same = originalByOrder.get(row.order) || [];
      same.push(record);
      originalByOrder.set(row.order, same);
    }
  }

  const result = { rows: [], skipped: 0, unknown: 0 };
  for (const { row, transfer, movement, modified, refunded } of records) {
    if (row.amount <= 0) continue;
    if (transfer && successfulTransfer.test(row.status)) {
      row.kind = 'movement';
    } else if (row.status === '退款成功') {
      const same = originalByOrder.get(row.order);
      const original = originalById.get(row.id.split('_')[0]) || (same?.length === 1 ? same[0] : null);
      if (original ? original.movement || original.row.direction !== '支出' : movement) continue;
      row.kind = 'refund';
      row.date = modified;
      if (original) {
        row.item = original.row.item || row.item;
        row.platform = original.row.platform;
      } else {
        row.item = row.item.replace(/^退款[－—:\s：-]+/, '');
      }
    } else {
      const paid = /^(交易成功|支付成功|等待确认收货)$/.test(row.status);
      const paidAndRefunded = row.status === '交易关闭' && refunded > 0;
      if (row.direction !== '支出' || movement || (!paid && !paidAndRefunded)) continue;
      row.kind = 'expense';
    }
    row.key = [row.source, row.kind, row.id].join('|');
    [row.category, row.subcategory] = classify(row);
    result.rows.push(row);
  }
  return result;
}

export function parseRows(rows, filename) {
  const headerPosition = rows.findIndex(row => headerInfo(row));
  if (headerPosition < 0) throw new Error('未识别到日期和金额列');
  const { indexes, headers } = headerInfo(rows[headerPosition]);
  const source = sourceFor(filename, headers);
  const preamble = rows.slice(0, headerPosition).flat().join(' ');
  if (source === '支付宝' &&
      ['交易创建时间', '最近修改时间', '成功退款', '交易来源地'].every(name => headers.includes(name))) {
    const end = preamble.match(/终止日期\s*[:：]\s*\[([^\]]+)\]/)?.[1];
    const date = getDate(end);
    const coveredThrough = date && new Date(Date.parse(date + 'Z') - 1000).toISOString().slice(0, 10);
    return parseAlipayTradeHistory(rows.slice(headerPosition + 1), headers, coveredThrough);
  }
  const wechatEnd = source === '微信' && preamble.match(/终止时间\s*[:：]\s*\[([^\]]+)\]/)?.[1];
  const wechatThrough = wechatEnd && getDate(wechatEnd).slice(0, 10);
  const isOrder = platforms.some(([platform]) => platform === source);
  const result = { rows: [], skipped: 0, unknown: 0 };
  const occurrences = new Map();
  for (const cells of rows.slice(headerPosition + 1)) {
    const cell = key => cells[indexes[key]];
    const date = getDate(cell('date'));
    const signed = getAmount(cell('amount'));
    if (!date) continue;
    if (!signed) { result.skipped++; continue; }
    const row = {
      source, date, amount: Math.abs(signed), merchant: str(cell('merchant')),
      item: str(cell('item')), rawCategory: str(cell('category')), method: str(cell('method')),
      variant: isOrder ? str(cell('variant')) : '',
      quantity: isOrder ? str(cell('quantity')) : '',
      status: str(cell('status')), direction: str(cell('direction')),
      order: tidyId(cell('order')), id: tidyId(cell('id'))
    };
    if (wechatThrough) row.coveredThrough = wechatThrough;
    row.platform = isOrder ? source : inferPlatform(row);
    row.kind = isOrder ? 'order' : transactionKind(row, signed, source);
    if (row.kind === 'ignore' || (isOrder && /关闭|取消|待付款|未付款/.test(row.status))) continue;
    if (row.kind === 'unknown') { result.unknown++; continue; }
    if (isOrder && (!row.item || !row.order)) { result.skipped++; continue; }
    const fingerprint = [source, row.kind, date, row.amount, row.merchant, row.item, row.order].join('|');
    const count = (occurrences.get(fingerprint) || 0) + 1;
    occurrences.set(fingerprint, count);
    row.key = row.id && !isOrder ? [source, row.kind, row.id].join('|') : fingerprint + '|' + count;
    [row.category, row.subcategory] = classify(row);
    result.rows.push(row);
  }
  return result;
}

function groupedOrders(rows) {
  const orders = new Map();
  for (const row of rows) {
    if (row.kind !== 'order') continue;
    const key = [row.platform, row.order].join('|');
    const previous = orders.get(key);
    const identity = JSON.stringify([row.item, row.variant || '', row.quantity || '']);
    const product = { name: row.item, variant: row.variant || '', quantity: row.quantity || '' };
    if (!previous) orders.set(key, { ...row, items: new Map([[identity, product]]) });
    else previous.items.set(identity, product);
  }
  return [...orders.values()];
}

export function reconcile(rows) {
  const payments = rows.filter(row => row.kind !== 'order').map(row =>
    row.platform && row.platform !== '其他' ? row : { ...row, platform: inferPlatform(row) });
  const ordersById = new Map(groupedOrders(rows).map(order =>
    [JSON.stringify([order.platform, order.order]), order]));
  const paymentReferences = row => [...new Set([row.id, row.order].filter(Boolean))]
    .map(value => JSON.stringify([row.kind, row.amount, value]));
  const providers = new Map();
  for (const row of payments) {
    if (row.source === '银行卡' || !['expense', 'refund'].includes(row.kind)) continue;
    for (const key of paymentReferences(row)) {
      const matches = providers.get(key) || new Set();
      matches.add(row);
      providers.set(key, matches);
    }
  }
  function isDuplicateBankRow(row) {
    if (row.source !== '银行卡') return false;
    const candidates = new Set(paymentReferences(row).flatMap(key => [...(providers.get(key) || [])]));
    return candidates.size === 1;
  }
  return payments.filter(row => !isDuplicateBankRow(row)).map(row => {
    const order = row.order ? ordersById.get(JSON.stringify([row.platform, row.order])) : undefined;
    const products = order ? [...order.items.values()] : [];
    const item = products.length ? products.map(product => product.name).join('、') : row.item;
    const result = { ...row, item, statementTitle: row.item, products, matchedOrder: order?.order || '',
      orderMerchant: order?.merchant || '' };
    const [category, subcategory] = classify(result);
    return { ...result, brand: identifyBrand(result), category: row.customCategory || category,
      subcategory: row.customCategory ? row.customDetail : subcategory };
  });
}

export function withoutFullyRefunded(rows) {
  const paymentsById = new Map();
  const paymentsByOrder = new Map();
  const transactionKey = (row, id) => JSON.stringify([row.source, id]);
  const orderKey = row => JSON.stringify([row.source, row.merchant, row.order]);
  const indexPayment = (index, key, payment) => index.set(key, index.has(key) ? null : payment);

  for (const row of rows) {
    if (row.kind !== 'expense' || row.amount <= 0) continue;
    if (row.id) indexPayment(paymentsById, transactionKey(row, row.id), row);
    if (row.order && row.merchant) indexPayment(paymentsByOrder, orderKey(row), row);
  }

  const refundsByPayment = new Map();
  for (const row of rows) {
    if (row.kind !== 'refund' || row.amount <= 0) continue;
    // Alipay's history export prefixes refund IDs with the original transaction ID.
    const originalId = row.statementFormat === 'alipay-trade-history' ? row.id?.split('_')[0] : row.id;
    const original = originalId ? paymentsById.get(transactionKey(row, originalId)) : undefined;
    const payment = original === undefined && row.order && row.merchant ? paymentsByOrder.get(orderKey(row)) : original;
    if (!payment || row.date < payment.date) continue;
    const refunds = refundsByPayment.get(payment) || [];
    refunds.push(row);
    refundsByPayment.set(payment, refunds);
  }

  const hidden = new Set();
  for (const [payment, refunds] of refundsByPayment) {
    if (refunds.reduce((sum, row) => sum + row.amount, 0) !== payment.amount) continue;
    hidden.add(payment);
    for (const refund of refunds) hidden.add(refund);
  }
  return rows.filter(row => !hidden.has(row));
}

export function totals(rows) {
  return rows.reduce((sum, row) => {
    if (row.kind === 'expense') { sum.expense += row.amount; sum.outCount++; }
    if (row.kind === 'refund') { sum.refund += row.amount; sum.refundCount++; }
    sum.net = sum.expense - sum.refund;
    return sum;
  }, { expense: 0, refund: 0, outCount: 0, refundCount: 0, net: 0 });
}
