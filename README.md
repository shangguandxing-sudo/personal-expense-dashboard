# 个人支出看板

`$personal-expense-dashboard` 是一个 Codex 技能。它用支付流水计算实际支出和退款，用平台原订单补充商品、菜品与店铺信息，并保留对账和分类依据。

## 安装

有此私有仓库访问权限后，可以把仓库克隆到 Codex 的个人技能目录。以下是 macOS 和 Linux 的命令。

```sh
mkdir -p "$HOME/.agents/skills"
git clone https://github.com/shangguandxing-sudo/personal-expense-dashboard.git "$HOME/.agents/skills/personal-expense-dashboard"
```

已安装同名技能时，更新已有目录即可。安装后在 Codex 输入「用 `$personal-expense-dashboard` 处理我的支付宝和微信账单，生成本地支出看板」。

## 仓库内容

- [SKILL.md](SKILL.md) 是技能入口。
- [references/](references/) 说明如何采集支付流水和原订单，以及如何对账、算净支出和贴标签。
- [assets/dashboard/](assets/dashboard/) 是可运行的本地看板模板，[assets/examples/](assets/examples/) 提供四份虚构账单。
- [scripts/verify-example.mjs](scripts/verify-example.mjs) 可以验证样例。实付为 ¥178.00，退款为 ¥45.00，净支出为 ¥133.00。

也可以下载 [技能 ZIP](personal-expense-dashboard.zip?raw=1) 并解压使用。ZIP 里的 `personal-expense-dashboard/` 为同一套技能文件。

关于 `SKILL.md` 和技能目录的说明见 [OpenAI 官方文档](https://learn.chatgpt.com/docs/build-skills)。
