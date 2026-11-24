# 个人支出看板

`$personal-expense-dashboard` 是一个 Codex 技能。它用支付流水计算实际支出和退款，用平台原订单补充商品、菜品与店铺信息，并保留可追溯的对账和分类依据。

## 使用方法

1. 下载 [技能压缩包](personal-expense-dashboard.zip?raw=1) 并解压。
2. 将解压后的 `personal-expense-dashboard` 整个目录放入自己的 Codex 技能目录。macOS 或 Linux 默认是 `~/.codex/skills/`。
3. 在 Codex 输入「用 `$personal-expense-dashboard` 处理我的支付宝和微信账单，生成本地支出看板」。

压缩包包含本地看板模板、数据采集指南、对账和标签规则、四份虚构账单及验证脚本。使用者可在本机导入自己的账单。

## 校验

在解压后的技能目录运行 `node scripts/verify-example.mjs`。虚构样例的实付为 ¥178.00，退款为 ¥45.00，净支出为 ¥133.00。

压缩包 SHA-256 为 `b976984b785273813b3f816c24600a775f795c9623810cd143c816a61b8e47dd`。
