# 扉页 · Open Literary Lab

> 每个人都是一本打开到一半的书。

**在线体验：<https://pjbian1.github.io/feiye/>**

扉页是一座免费、开源、无登录的文学原型测评实验室。你可以做馆藏测评、让 AI 替你出一套题、把 JSON 装订成分享链接，也可以复制源码部署自己的版本。

![扉页 · 开源文学原型测评实验室](assets/og.png)

![MIT](https://img.shields.io/badge/license-MIT-b65e53) ![backend](https://img.shields.io/badge/backend-none-36506d) ![tracking](https://img.shields.io/badge/tracking-none-36506d)

## 三条完整路径

1. **来测一测**：选测试 → 答题 → 查看原型 → 下载结果卡 → 分享给朋友。
2. **做一套自己的题**：复制提示词 → AI 生成 JSON → 粘贴或上传 → 校验 → 生成分享链接。
3. **复制整座网站**：查看建站方法 → Fork → 换品牌和题库 → GitHub Pages 免费部署。

## 功能

- 三套手写馆藏：《你的文学原型》《你的灵魂执笔人》《你的古典魂魄》；
- 一屏一题、进度显示、回退重选、主原型与次要底色；
- 原生 Canvas 生成 1080 × 1440 PNG 藏书票结果卡；
- 支持系统分享、测评链接、个人结果链接与重新测试；
- 支持粘贴 JSON、上传 `.json`、中文格式错误和评分覆盖检查；
- 自建测试经 deflate 压缩后编码进 URL hash，不上传数据库；
- 完整公开 AI 出题提示词、JSON 规范、建站方法与可安装 Skill；
- 纯静态 HTML/CSS/JS，无构建、无依赖、无 Cookie、无统计。

## 本地运行

```bash
git clone https://github.com/PJBian1/feiye.git
cd feiye
python3 -m http.server 8000
# 打开 http://localhost:8000
```

也可以直接打开 `index.html`。压缩链接、剪贴板等能力在 HTTP/HTTPS 环境下兼容性更好。

## 让 AI 替你出题

普通创作者直接阅读 [`skill/doubao-skill.md`](skill/doubao-skill.md)，复制提示词发给豆包、DeepSeek、Kimi、元宝、ChatGPT 等任意 AI。

Codex 或其他 Agent 可以安装 [`skill/create-feiye-quiz`](skill/create-feiye-quiz/SKILL.md)。正式 Skill 包含：

- 简洁的出题工作流；
- [`references/schema.md`](skill/create-feiye-quiz/references/schema.md) 字段与内容规范；
- [`scripts/validate_quiz.mjs`](skill/create-feiye-quiz/scripts/validate_quiz.mjs) 确定性校验与分享链接生成。

校验一份题目：

```bash
node skill/create-feiye-quiz/scripts/validate_quiz.mjs quiz.json
```

校验并直接生成分享链接：

```bash
node skill/create-feiye-quiz/scripts/validate_quiz.mjs quiz.json \
  --share-url https://pjbian1.github.io/feiye/
```

## JSON 最小结构

```json
{
  "title": "测试标题",
  "subtitle": "一句副标题",
  "tag": "分类 · 十题",
  "desc": "开场白",
  "questions": [
    {
      "q": "题干",
      "options": [
        { "text": "选项", "scores": { "key1": 2, "key2": 1 } }
      ]
    }
  ],
  "results": {
    "key1": {
      "name": "原型名",
      "source": "出处",
      "quote": "真实引文或空字符串",
      "desc": "解读",
      "traits": ["词一", "词二", "词三"],
      "hue": 200
    }
  }
}
```

计分方式：每个选项把权重累加到对应结果，最高分是主原型，第二名是次要底色。同分时按 `results` 中的顺序稳定决胜。

## 链接即数据库

自建测试的分享过程：

```text
JSON → UTF-8 → deflate-raw → base64url → URL hash
```

浏览器不会把 `#` 后面的 hash 发送给服务器，因此网站无法读取或存储用户的自建题目与答案。代价是链接较长，也无法在服务器端统一编辑或删除。

## 部署自己的版本

1. Fork 本仓库；
2. 修改 `index.html` 的站点信息；
3. 修改 `assets/app.js` 顶部的 `REPO_URL`；
4. 在 `assets/presets.js` 增删馆藏；
5. GitHub 仓库进入 Settings → Pages → Deploy from a branch → `main` / `/ (root)`。

完整解释也公开在网站的“开源”页面：<https://pjbian1.github.io/feiye/#/opensource>。

## 目录

```text
feiye/
├── index.html
├── assets/
│   ├── app.js
│   ├── presets.js
│   ├── style.css
│   └── og.png
├── skill/
│   ├── doubao-skill.md
│   └── create-feiye-quiz/
│       ├── SKILL.md
│       ├── agents/openai.yaml
│       ├── references/schema.md
│       └── scripts/validate_quiz.mjs
├── examples/deep-night-cafe.json
├── LICENSE
└── README.md
```

## 安全与隐私

- 所有用户内容在渲染前进行 HTML 转义；
- JSON 限制为 40KB、50 道题、24 个结果；
- 不使用登录、Cookie、广告、统计脚本或外部字体；
- 文学引文仍需人工核实，提示词明确要求“不确定就留空”；
- 这是一项娱乐与自我表达产品，不提供心理、医学或命运诊断。

## License

[MIT](LICENSE) · 欢迎 Fork、二创与商用。

额外但非强制的请求：请保持普通用户完成测评的基本链路免费。
