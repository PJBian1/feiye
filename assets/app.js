/* 扉页 · Open Quiz Business Playbook
 * 纯静态 SPA：商业模式、内容分析、AI 出题、JSON 导入、结果卡与开源方法。
 * 自建测试经 deflate 压缩后编码进 URL hash，不上传、不追踪。 */

(function () {
  "use strict";

  var PRESETS = window.FEIYE_PRESETS || [];
  var REPO_URL = "https://github.com/PJBian1/feiye";
  var app = document.getElementById("app");
  var quiz = null;
  var toastTimer = null;
  var MARKS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛"];
  var CNUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

  /* ---------- shared helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function numCN(number) {
    var n = Math.floor(number);
    if (n <= 10) return n === 10 ? "十" : CNUM[n];
    if (n < 20) return "十" + CNUM[n - 10];
    if (n < 100) return CNUM[Math.floor(n / 10)] + "十" + (n % 10 ? CNUM[n % 10] : "");
    return String(n);
  }

  function baseURL() {
    if (location.origin === "null" || location.protocol === "file:") return location.href.split("#")[0];
    return location.origin + location.pathname;
  }

  function categoryOf(test) {
    return String(test.tag || "文学测评").split("·")[0].trim() || "文学测评";
  }

  function hueOf(test, fallback) {
    var keys = Object.keys(test.results || {});
    var raw = keys.length ? Number(test.results[keys[0]].hue) : Number(fallback || 18);
    return isFinite(raw) ? Math.max(0, Math.min(360, raw)) : 18;
  }

  function testHash(ref) {
    return ref.kind === "preset" ? "#/t/" + ref.id : "#/x/" + ref.payload;
  }

  function resultHash(ref, first, second) {
    return testHash(ref) + "/r/" + encodeURIComponent(first) + (second ? "/" + encodeURIComponent(second) : "");
  }

  function showToast(message) {
    var node = document.getElementById("toast");
    if (!node) return;
    clearTimeout(toastTimer);
    node.textContent = message;
    node.classList.add("show");
    toastTimer = setTimeout(function () { node.classList.remove("show"); }, 1800);
  }

  function legacyCopy(text) {
    var input = document.createElement("textarea");
    input.value = text;
    input.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(input);
    input.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (error) {}
    document.body.removeChild(input);
    return ok;
  }

  function copyText(text, successMessage) {
    var promise;
    if (navigator.clipboard && window.isSecureContext) {
      promise = navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    } else {
      promise = Promise.resolve(legacyCopy(text));
    }
    return promise.then(function (ok) {
      showToast(ok ? (successMessage || "已复制") : "复制失败，请手动复制");
      return ok;
    });
  }

  function downloadText(text, filename, type) {
    var blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function safeFilename(value) {
    return String(value || "feiye-quiz").replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "feiye-quiz";
  }

  function shareOrCopy(data, fallbackMessage) {
    if (navigator.share) {
      return navigator.share(data).catch(function (error) {
        if (error && error.name !== "AbortError") return copyText(data.text + " " + data.url, fallbackMessage);
      });
    }
    return copyText(data.text + " " + data.url, fallbackMessage);
  }

  /* ---------- encode / decode ---------- */

  function b64urlEncode(bytes) {
    var value = "";
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      value += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function b64urlDecode(value) {
    var normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) normalized += "=";
    var binary = atob(normalized);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function pipeBytes(bytes, stream) {
    var source = new Blob([bytes]).stream().pipeThrough(stream);
    return new Response(source).arrayBuffer().then(function (buffer) { return new Uint8Array(buffer); });
  }

  function encodeTest(test) {
    var bytes = new TextEncoder().encode(JSON.stringify(test));
    if (typeof CompressionStream !== "undefined") {
      return pipeBytes(bytes, new CompressionStream("deflate-raw")).then(function (compressed) {
        return "1." + b64urlEncode(compressed);
      });
    }
    return Promise.resolve("0." + b64urlEncode(bytes));
  }

  function decodeTest(payload) {
    var dot = payload.indexOf(".");
    if (dot < 1) return Promise.reject(new Error("链接中的题目编码不完整。"));
    var version = payload.slice(0, dot);
    var bytes = b64urlDecode(payload.slice(dot + 1));
    var output;
    if (version === "1") {
      if (typeof DecompressionStream === "undefined") {
        return Promise.reject(new Error("当前浏览器过旧，无法解开这个链接，请换一个浏览器打开。"));
      }
      output = pipeBytes(bytes, new DecompressionStream("deflate-raw"));
    } else if (version === "0") {
      output = Promise.resolve(bytes);
    } else {
      return Promise.reject(new Error("这个链接使用了暂不支持的题目版本。"));
    }
    return output.then(function (result) {
      return JSON.parse(new TextDecoder().decode(result));
    });
  }

  /* ---------- validation ---------- */

  function normalizeTest(raw) {
    var errors = [];
    var warnings = [];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { errors: ["顶层必须是一个 JSON 对象（用 { } 包住）。"] };
    }

    var test = {
      title: String(raw.title || "").trim(),
      subtitle: String(raw.subtitle || "").trim(),
      tag: String(raw.tag || "").trim(),
      desc: String(raw.desc || raw.intro || "").trim(),
      questions: [],
      results: {}
    };

    if (!test.title) errors.push("缺少 title（测试标题）。");
    if (test.title.length > 30) errors.push("title 太长了，请控制在 30 字以内。");
    if (test.subtitle.length > 70) test.subtitle = test.subtitle.slice(0, 70);
    if (test.tag.length > 40) test.tag = test.tag.slice(0, 40);
    if (test.desc.length > 320) test.desc = test.desc.slice(0, 320);

    var rawResults = raw.results;
    if (!rawResults || typeof rawResults !== "object" || Array.isArray(rawResults)) {
      errors.push("缺少 results（结果列表），它应该是一个对象。");
      rawResults = {};
    }
    var resultKeys = Object.keys(rawResults);
    if (resultKeys.length > 0 && resultKeys.length < 2) errors.push("results 至少要有 2 个结果。");
    if (resultKeys.length > 24) errors.push("results 最多 24 个结果。");

    resultKeys.forEach(function (key) {
      var source = rawResults[key] || {};
      if (typeof source === "string") source = { name: source };
      var name = String(source.name || "").trim();
      if (!name) {
        errors.push("结果「" + key + "」缺少 name。");
        return;
      }
      var traits = Array.isArray(source.traits)
        ? source.traits.slice(0, 6).map(function (item) { return String(item).trim().slice(0, 14); }).filter(Boolean)
        : [];
      test.results[key] = {
        name: name.slice(0, 24),
        source: String(source.source || source.book || "").trim().slice(0, 60),
        quote: String(source.quote || source.motto || "").trim().slice(0, 160),
        desc: String(source.desc || source.description || "").trim().slice(0, 650),
        traits: traits,
        hue: Math.max(0, Math.min(360, Number(source.hue) || 18))
      };
    });

    var rawQuestions = raw.questions;
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      errors.push("缺少 questions（题目列表），它应该是一个数组。");
      rawQuestions = [];
    }
    if (rawQuestions.length > 50) errors.push("题目最多 50 道。");

    var unknownKeys = {};
    rawQuestions.forEach(function (question, questionIndex) {
      var label = "第 " + (questionIndex + 1) + " 题";
      var text = String((question && (question.q || question.question || question.text)) || "").trim();
      if (!text) {
        errors.push(label + "缺少题干（q 字段）。");
        return;
      }
      var rawOptions = (question && (question.options || question.opts)) || [];
      if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
        errors.push(label + "至少要有 2 个选项。");
        return;
      }
      if (rawOptions.length > 8) {
        errors.push(label + "选项最多 8 个。");
        return;
      }
      var options = [];
      rawOptions.forEach(function (rawOption, optionIndex) {
        var option = typeof rawOption === "string" ? { text: rawOption } : (rawOption || {});
        var optionText = String(option.text || option.t || "").trim();
        if (!optionText) {
          errors.push(label + "第 " + (optionIndex + 1) + " 个选项缺少文字。");
          return;
        }
        var rawScores = option.scores || option.s || option.a;
        var scores = {};
        if (typeof rawScores === "string") {
          scores[rawScores] = 2;
        } else if (rawScores && typeof rawScores === "object" && !Array.isArray(rawScores)) {
          Object.keys(rawScores).forEach(function (key) {
            var weight = Number(rawScores[key]);
            if (isFinite(weight) && weight > 0) scores[key] = Math.min(10, weight);
          });
        }
        if (Object.keys(scores).length === 0) {
          errors.push(label + "选项「" + optionText.slice(0, 12) + "…」缺少 scores。");
        }
        Object.keys(scores).forEach(function (key) {
          if (!test.results[key]) unknownKeys[key] = label;
        });
        options.push({ text: optionText.slice(0, 130), scores: scores });
      });
      if (options.length >= 2) test.questions.push({ q: text.slice(0, 150), options: options });
    });

    Object.keys(unknownKeys).forEach(function (key) {
      errors.push(unknownKeys[key] + "的 scores 用到了「" + key + "」，但 results 里没有这个结果。");
    });

    var hits = {};
    var primaryHits = {};
    test.questions.forEach(function (question) {
      question.options.forEach(function (option) {
        var keys = Object.keys(option.scores);
        var max = keys.reduce(function (value, key) { return Math.max(value, option.scores[key]); }, 0);
        keys.forEach(function (key) {
          hits[key] = (hits[key] || 0) + 1;
          if (option.scores[key] === max) primaryHits[key] = (primaryHits[key] || 0) + 1;
        });
      });
    });
    Object.keys(test.results).forEach(function (key) {
      if (!hits[key]) warnings.push("结果「" + test.results[key].name + "」没有被任何选项指向，永远不会被测出。");
      else if ((primaryHits[key] || 0) < 2) warnings.push("结果「" + test.results[key].name + "」只有很少的主要得分机会，建议补到至少 2 次。");
    });

    if (errors.length === 0 && JSON.stringify(test).length > 40000) {
      errors.push("整套题太大了（超过 40KB），请精简题目或结果描述。");
    }
    return errors.length ? { errors: errors } : { test: test, warnings: warnings };
  }

  function parseLoose(input) {
    var source = String(input || "").trim();
    if (!source) return { error: "先粘贴 JSON，或者上传一份 .json 文件。" };
    source = source.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "");
    var start = source.indexOf("{");
    var end = source.lastIndexOf("}");
    if (start < 0 || end <= start) return { error: "没有找到完整 JSON：内容应该以 { 开头、以 } 结尾。" };
    source = source.slice(start, end + 1);
    try { return { data: JSON.parse(source) }; } catch (error) {}
    var cleaned = source.replace(/,\s*([}\]])/g, "$1");
    try { return { data: JSON.parse(cleaned) }; } catch (error) {
      var hint = /[“”]/.test(source)
        ? "看起来混入了中文引号 “ ”。请让 AI 重新输出标准 JSON，并全部使用英文双引号。"
        : "常见原因是引号不配对、缺少逗号或复制不完整。可以让 AI 重新完整输出一遍。";
      return { error: "JSON 格式解析失败。\n" + hint };
    }
  }

  function tally(test, answers) {
    var scores = {};
    var order = Object.keys(test.results);
    order.forEach(function (key) { scores[key] = 0; });
    answers.forEach(function (optionIndex, questionIndex) {
      var option = test.questions[questionIndex] && test.questions[questionIndex].options[optionIndex];
      if (!option) return;
      Object.keys(option.scores).forEach(function (key) {
        if (key in scores) scores[key] += option.scores[key];
      });
    });
    order.sort(function (a, b) { return scores[b] - scores[a]; });
    return { first: order[0], second: order[1] || null, scores: scores };
  }

  /* ---------- site shell ---------- */

  function navLink(label, href, key, active) {
    var current = active === key ? " active" : "";
    return '<a class="nav-link' + current + '" href="' + href + '"' + (current ? ' aria-current="page"' : "") + '>' + label + '</a>';
  }

  function shell(inner, active) {
    return '<div class="page">' +
      '<div class="topbar-wrap"><header class="topbar">' +
        '<a class="brand" href="#/" aria-label="扉页首页"><span class="brand-mark">扉</span><span>扉页</span><span class="brand-sub">· Open Playbook</span></a>' +
        '<nav aria-label="主导航">' +
          navLink("模式", "#/business", "business", active) +
          navLink("从零制作", "#/roadmap", "roadmap", active) +
          navLink("案例", "#/case", "case", active) +
          navLink("工具", "#/tools", "tools", active) +
          navLink("开源", "#/opensource", "opensource", active) +
        '</nav>' +
        '<a class="repo-link" href="' + REPO_URL + '" target="_blank" rel="noopener">GITHUB ↗</a>' +
      '</header></div>' +
      '<main id="main-content">' + inner + '</main>' +
      '<footer class="site-foot"><div class="content foot-inner">' +
        '<div><div class="foot-brand">扉页 · Open Quiz Business Playbook</div><div class="foot-copy">项目本身免费开源；它展示的是经营者如何做出、销售并用链接交付一件测评数字商品。</div></div>' +
        '<div class="foot-links"><a href="#/business">商业模式</a><a href="#/roadmap">七步闭环</a><a href="#/tests">可运行样品</a><a href="' + REPO_URL + '" target="_blank" rel="noopener">MIT · GitHub</a></div>' +
      '</div></footer><div class="toast" id="toast" role="status" aria-live="polite"></div>' +
    '</div>';
  }

  function render(inner, title, active) {
    app.innerHTML = shell(inner, active);
    document.title = title ? title + " · 扉页" : "扉页 · 开源测评数字商品操作手册";
    window.scrollTo(0, 0);
  }

  function testCard(test, index) {
    var resultCount = Object.keys(test.results || {}).length;
    var glyph = String(test.title || "扉").replace(/[你的·\s]/g, "").charAt(0) || "扉";
    return '<a class="test-card" href="#/t/' + esc(test.id) + '" data-title="' + esc((test.title + " " + test.subtitle + " " + test.tag).toLowerCase()) + '" data-category="' + esc(categoryOf(test)) + '">' +
      '<div class="test-art" style="--hue:' + hueOf(test, index * 60) + '"><span class="test-index">' + String(index + 1).padStart(2, "0") + '</span><span class="test-glyph">' + esc(glyph) + '</span></div>' +
      '<div class="test-card-body"><span class="tag">' + esc(test.tag || "文学测评") + '</span><h3>' + esc(test.title) + '</h3><p>' + esc(test.subtitle || test.desc || "翻开一页，看看谁替你活过。") + '</p>' +
      '<div class="test-meta"><span>' + test.questions.length + ' QUESTIONS</span><span>' + resultCount + ' ARCHETYPES →</span></div></div>' +
    '</a>';
  }

  /* ---------- home and library ---------- */

  function viewHome() {
    var firstHref = PRESETS.length ? "#/t/" + PRESETS[0].id : "#/tests";
    var cards = PRESETS.slice(0, 3).map(testCard).join("");
    render(
      '<section class="home-hero"><div class="content hero-copy">' +
        '<div class="eyebrow">FEIYE · OPEN QUIZ BUSINESS PLAYBOOK</div>' +
        '<h1>把一个想测的话题，<span>做成一件可以销售的数字商品。</span></h1>' +
        '<p>免费开源从内容分析、题目制作、生成网站，到平台销售和发送链接交付的完整方法。无需先做支付、账号或服务器，先跑通最小的一单。</p>' +
        '<div class="hero-actions"><a class="btn primary" href="#/business">先看懂这门生意 →</a><a class="btn" href="#/roadmap">直接做第一件商品</a></div>' +
        '<div class="manifesto"><span><b>内容</b>是销售员 · <b>平台商品</b>是收银台</span><span><b>测评链接</b>是交付物 · <b>结果页面</b>是消费体验</span></div>' +
      '</div></section>' +
      '<section class="section-block compact"><div class="content"><div class="loop-line" aria-label="七步最小闭环">' +
        '<span>看需求</span><i>→</i><span>定商品</span><i>→</i><span>做题目</span><i>→</i><span>生成链接</span><i>→</i><span>发布内容</span><i>→</i><span>用户购买</span><i>→</i><span>发送链接</span>' +
      '</div></div></section>' +
      '<section class="section-block"><div class="content">' +
        '<div class="section-head"><span class="section-kicker">BUSINESS IN PLAIN WORDS · 把生意说人话</span><h2>经营者卖的不是几道题，<br>而是一段完整体验。</h2><p>消费者为“我会得到一个关于自己的答案”而购买；经营者用内容找到他，用链接完成交付。</p></div>' +
        '<div class="value-grid"><article><span>01 · 需求</span><h3>我到底是哪一种人？</h3><p>自我解释、身份表达、好奇和分享谈资，是测评商品最基础的消费动机。</p></article><article><span>02 · 供给</span><h3>一套可完成的测评</h3><p>主题、题目、计分、结果解释、网站和结果卡共同组成商品，而不是单独一份题库。</p></article><article><span>03 · 连接</span><h3>平台内容制造“我也想测”</h3><p>内容负责展示问题、结果切片和使用场景；平台现有商品能力负责交易。</p></article><article><span>04 · 交付</span><h3>付款后发送完整链接</h3><p>买家能打开、答题并看到结果，本次数字商品交付就已经完成。</p></article></div>' +
        '<div class="section-cta"><a class="btn wine" href="#/business">展开需求、供给与连接 →</a></div>' +
      '</div></section>' +
      '<section class="section-block"><div class="content">' +
        '<div class="section-head"><span class="section-kicker">FOUR WORKBENCHES · 四个工作台</span><h2>不是读完一篇教程，<br>而是逐件产出可用资产。</h2></div>' +
        '<div class="stage-grid"><a href="#/research"><b>01</b><span>内容分析</span><h3>找到有人想测的题目</h3><p>收集平台需求证据，写出明确的人群、问题、购买动机与结果承诺。</p><em>产出：测评选题卡 →</em></a><a href="#/prompts"><b>02</b><span>题目制作</span><h3>把主题变成标准题库</h3><p>用公开提示词生成原型、场景题、计分和结果解释，再完成结构校验。</p><em>产出：标准 JSON →</em></a><a href="#/create"><b>03</b><span>建站</span><h3>把题库变成商品链接</h3><p>导入、校验、试玩，生成无需账号和服务器就能发送的完整测评链接。</p><em>产出：可交付链接 →</em></a><a href="#/sell"><b>04</b><span>销售与交付</span><h3>发布内容，付款后发链接</h3><p>准备封面、销售笔记、商品说明和交付话术，用最简单的方式完成第一单。</p><em>产出：已上架商品 →</em></a></div>' +
      '</div></section>' +
      '<section class="section-block"><div class="content">' +
        '<div class="section-head row"><div><span class="section-kicker">WORKING CASE · 可运行案例</span><h2>文学原型，是第一件完整样品。</h2><p>它展示了从题目、结果、网页到链接交付的最终形态，不把案例销量伪装成市场证据。</p></div><a class="text-link" href="#/case">查看案例全链路 →</a></div>' +
        '<div class="test-grid">' + cards + '</div><div class="section-cta"><a class="btn" href="' + firstHref + '">站在买家视角试玩 →</a></div>' +
      '</div></section>' +
      '<section class="section-block"><div class="content glass-panel open-banner">' +
        '<div><span class="section-kicker">100% OPEN · 完整开源</span><h2>网站不靠这套方法收费，<br>而是把整套方法交给你。</h2><p>商业地图、操作教程、提示词、题库格式、网站代码、内容模板、商品说明、交付话术和复盘表全部公开。你可以 Fork、修改与商用，但不能把案例当成收益承诺。</p></div>' +
        '<div class="btn-row"><a class="btn wine" href="#/tools">打开工具箱</a><a class="btn" href="' + REPO_URL + '" target="_blank" rel="noopener">查看源码 ↗</a></div>' +
      '</div></section>',
      "", "home"
    );
  }

  function viewBusiness() {
    render(
      '<section class="doc-hero business-hero"><div class="content"><span class="section-kicker">THE MODEL · 商业模式</span><h1>卖的不是答案，<br>是一次被解释的体验。</h1><p>经营者发现一个“有人想测”的问题，把它做成数字商品，用平台内容获得订单，付款后发送链接完成交付。扉页把这条最小路径完整开源。</p><div class="metrics"><div class="metric"><strong>3</strong><div class="metric-label">ROLES · 角色</div></div><div class="metric"><strong>7</strong><div class="metric-label">STEPS · 步骤</div></div><div class="metric"><strong>1</strong><div class="metric-label">LINK · 交付</div></div><div class="metric"><strong>0</strong><div class="metric-label">BACKEND · 后端</div></div></div></div></section>' +
      '<section class="section-block compact"><div class="content"><div class="section-head"><span class="section-kicker">VALUE EXCHANGE · 三方价值交换</span><h2>谁需要什么，谁提供什么。</h2></div><div class="role-grid"><article><span>经营者</span><h3>生产和销售商品</h3><p>选择主题，制作题目和网站，发布销售内容；订单完成后发送链接。</p><ul><li>得到：数字商品收入与需求反馈</li><li>付出：选题、制作、内容与交付劳动</li></ul></article><article><span>消费者</span><h3>购买关于自己的答案</h3><p>因为好奇、自我解释、身份表达或社交谈资，购买并完成测评。</p><ul><li>得到：可理解、可保存的结果体验</li><li>付出：价格、时间与注意力</li></ul></article><article><span>内容平台</span><h3>让需求与商品相遇</h3><p>评论、互动和既有商品提供需求信号；内容分发与平台商品完成连接和交易。</p><ul><li>得到：持续的内容与交易</li><li>提供：流量、信号和现有交易能力</li></ul></article></div></div></section>' +
      '<section class="section-block"><div class="content"><div class="section-head"><span class="section-kicker">SUPPLY → DEMAND → DELIVERY</span><h2>一件商品的五个组成部分。</h2><p>每一部分都缺一不可。只有题目，没有销售内容；只有内容，没有可打开的链接，都不是完整商品。</p></div><div class="business-map"><article><b>01</b><span>需求</span><h3>“我到底是哪一种？”</h3><p>用户原本就存在的好奇、困惑和身份表达需要。</p></article><i>→</i><article><b>02</b><span>供给</span><h3>一套可完成的测评</h3><p>主题、题目、计分、结果、网站和结果卡。</p></article><i>→</i><article><b>03</b><span>连接</span><h3>让人产生“我也想测”</h3><p>平台封面、标题、正文、结果切片与商品页。</p></article><i>→</i><article><b>04</b><span>交易</span><h3>使用平台现有收银台</h3><p>第一版不在测评网站里重复建设支付系统。</p></article><i>→</i><article><b>05</b><span>交付</span><h3>发送完整测评链接</h3><p>买家可以打开、答题、查看结果，交付结束。</p></article></div></div></section>' +
      '<section class="section-block"><div class="content split-statement"><div><span class="section-kicker">WHAT IS THE PRODUCT? · 商品边界</span><h2>经营者真正需要做出的，是一个商品包。</h2></div><div class="check-stack"><p>01 · 一张有需求证据的选题卡</p><p>02 · 一份通过校验的题库 JSON</p><p>03 · 一条完整可打开的测评链接</p><p>04 · 一套封面、销售内容和商品说明</p><p>05 · 一段可以直接发送的交付话术</p></div></div></section>' +
      '<section class="section-block"><div class="content glass-panel boundary-panel"><div><span class="section-kicker">MVP BOUNDARY · 第一版边界</span><h2>先证明有人愿意买，<br>不先证明系统足够复杂。</h2></div><div class="boundary-grid"><span>不接入支付</span><span>不做账号</span><span>不做订单系统</span><span>不做一客一码</span><span>不保存答案</span><span>不限制转发</span><span>不承诺盈利</span><span>不冒充专业诊断</span></div><div class="btn-row"><a class="btn primary" href="#/roadmap">进入七步最小闭环 →</a><a class="btn" href="playbook/README.md" download>下载商业模式说明</a></div></div></section>',
      "商业模式", "business"
    );
  }

  function viewRoadmap() {
    render(
      '<section class="doc-hero"><div class="content"><span class="section-kicker">FIRST PRODUCT · 从零制作</span><h1>从一个平台信号，<br>走到一条交付链接。</h1><p>每一步都必须留下一个具体产物。不是“学会了”，而是下一步可以直接使用。</p></div></section>' +
      '<section class="section-block compact"><div class="content"><div class="playbook-steps">' +
        '<article><b>01</b><div><span>内容分析</span><h2>看见真实需求</h2><p>采集相关内容、商品和评论区用户原话，判断什么问题已经有人关心。</p><strong>完成物：10 条以上需求证据</strong><a href="#/research">打开内容分析工作台 →</a></div></article>' +
        '<article><b>02</b><div><span>定义商品</span><h2>把主题写成一句承诺</h2><p>确定给谁测、测什么、结果是什么，以及用户为什么不能只看一篇免费内容。</p><strong>完成物：测评选题卡</strong><a href="playbook/templates/01-topic-card.md" download>下载选题卡 ↓</a></div></article>' +
        '<article><b>03</b><div><span>题目制作</span><h2>生成并校验标准题库</h2><p>先定结果原型，再写具体场景题；检查评分覆盖、事实和引文。</p><strong>完成物：标准 JSON</strong><a href="#/prompts">使用公开出题提示词 →</a></div></article>' +
        '<article><b>04</b><div><span>建站</span><h2>生成完整测评链接</h2><p>粘贴或上传 JSON，完成格式校验，站在买家视角从封面答到结果。</p><strong>完成物：已试玩的商品链接</strong><a href="#/create">打开链接生成器 →</a></div></article>' +
        '<article><b>05</b><div><span>发布销售内容</span><h2>让人产生“我也想测”</h2><p>用具体场景开头，展示结果切片，明确商品内容和行动指令。</p><strong>完成物：封面、笔记与商品说明</strong><a href="#/sell">打开销售与交付工作台 →</a></div></article>' +
        '<article><b>06</b><div><span>成交与交付</span><h2>买家付款后发送链接</h2><p>不在网站重复建设支付。使用平台现有交易能力，订单完成后发送完整链接。</p><strong>完成物：买家可以开始答题</strong><a href="playbook/templates/04-delivery-message.md" download>下载交付话术 ↓</a></div></article>' +
        '<article><b>07</b><div><span>复盘</span><h2>记录结果，再决定是否升级</h2><p>记录曝光、互动、商品访问、咨询、订单、退款和交付异常；不收集买家答题隐私。</p><strong>完成物：下一轮保留或修改的判断</strong><a href="playbook/templates/06-review-sheet.csv" download>下载复盘表 ↓</a></div></article>' +
      '</div><div class="roadmap-end glass-panel"><span>最小闭环完成判定</span><h2>不是网站上线，而是买家付款后收到链接，并且能够开始答题。</h2><a class="btn primary" href="playbook/templates/05-first-sale-checklist.md" download>下载首单检查表</a></div></div></section>',
      "从零制作", "roadmap"
    );
  }

  function viewResearch() {
    render(
      '<section class="doc-hero"><div class="content"><span class="section-kicker">CONTENT RESEARCH · 内容分析</span><h1>先找到有人想测的问题，<br>再开始写题。</h1><p>AI 可以快速生成供给，但不能替你证明需求存在。第一步是把平台信号和用户原话留下来。</p></div></section>' +
      '<section><div class="content doc-layout"><article class="doc-main glass-panel"><h2>内容分析不是追爆款</h2><p>你要找的不是“哪个标题点赞多”，而是一个反复出现、又适合被测评回答的问题。真正有用的证据包括：多人描述相似处境、评论区主动问“我是哪种”、现有商品在卖什么，以及用户怎样描述购买后的期待。</p>' +
        '<h2>第一轮只采十条</h2><div class="steps"><div class="step"><div><h3>锁定一个人群</h3><p>不要从“所有年轻人”开始。写清楚他们在哪个平台、正在经历什么。</p></div></div><div class="step"><div><h3>记录十条内容或商品</h3><p>保存来源、标题、互动信号、评论原话和你看到的需求，不用先追求大样本。</p></div></div><div class="step"><div><h3>把原话聚成一个问题</h3><p>例如“我为什么总在关系里先退一步”，而不是空泛的“人格测试”。</p></div></div><div class="step"><div><h3>写出结果承诺</h3><p>完成这套测评后，用户会知道什么？如果一句话说不清，就继续缩小主题。</p></div></div></div>' +
        '<h2>一个主题能不能进入制作</h2><table class="schema-table"><thead><tr><th>检查项</th><th>通过标准</th></tr></thead><tbody><tr><td>人群</td><td>能描述一个具体群体，而不是所有人</td></tr><tr><td>问题</td><td>用户已经用自己的话反复谈论</td></tr><tr><td>结果</td><td>至少能形成三个边界不同的结果</td></tr><tr><td>购买理由</td><td>结果比一篇免费内容更具体、更属于这个人</td></tr><tr><td>表达</td><td>一张封面可以让人看懂“测完得到什么”</td></tr></tbody></table>' +
        '<div class="notice">本项目不提供虚构的市场数据。文学原型案例证明的是生产和交付能力，不证明任何平台上的需求、销量或利润。</div>' +
      '</article><aside class="doc-aside glass-panel"><h3>完成物：测评选题卡</h3><p>把主题、人群、需求证据、购买理由和结果原型写在同一页。没有外部证据，就先不进入题目制作。</p><div class="asset-list"><a class="asset-row" href="playbook/templates/01-topic-card.md" download><span class="asset-ext">MD</span><span><strong>测评选题卡</strong><span>需求证据与商品定义</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="playbook/templates/06-review-sheet.csv" download><span class="asset-ext">CSV</span><span><strong>经营记录表</strong><span>发布后记录真实结果</span></span><span class="asset-arrow">↓</span></a></div><a class="btn block primary" href="#/prompts">选题通过，开始做题 →</a></aside></div></section>',
      "内容分析", "roadmap"
    );
  }

  function viewSell() {
    render(
      '<section class="doc-hero"><div class="content"><span class="section-kicker">SELL & DELIVER · 销售与交付</span><h1>平台负责收款，<br>你负责把链接发完整。</h1><p>第一版不做支付、账号、兑换码和自动化。内容让用户产生兴趣，商品页讲清交付物，买家付款后发送链接。</p></div></section>' +
      '<section><div class="content doc-layout"><article class="doc-main glass-panel"><h2>销售内容的五段结构</h2><div class="steps"><div class="step"><div><h3>从一个具体场景开始</h3><p>先让目标用户认出自己，不要先介绍“我们做了一套测试”。</p></div></div><div class="step"><div><h3>指出没被说清的问题</h3><p>把场景背后的身份、关系或选择困惑说出来。</p></div></div><div class="step"><div><h3>说明测完得到什么</h3><p>题目数、预计时长、结果数量，以及结果会解释什么。</p></div></div><div class="step"><div><h3>展示一个结果切片</h3><p>用名字、特征或结果卡制造具体期待，但不要虚构评价与销量。</p></div></div><div class="step"><div><h3>给出明确行动指令</h3><p>告诉用户商品入口在哪里、购买后收到的是一条测评链接。</p></div></div></div>' +
        '<h2>商品页只要说清四件事</h2><ul><li>这套测评叫什么、适合谁；</li><li>有多少题、大约多久、最后看到什么；</li><li>交付物是一条在线测评链接；</li><li>它是娱乐、自我观察与社交表达内容，不是专业诊断。</li></ul>' +
        '<h2>交付就是发一条完整链接</h2><p>订单完成后发送标准话术和完整链接。买家能够打开页面并开始答题，本次最小交付成立。特别提醒：链接中 <code>#</code> 后面的长文本也是题目的一部分，不能被聊天工具截断。</p>' +
        '<h2>第一版接受的损耗</h2><p>同一链接可以重复打开，也可能被转发。不要为了防住每一次转发，先建设支付回调、兑换码、账户和后台。先验证主题、内容、价格和交付是否能形成真实订单。</p>' +
        '<div class="notice">销售平台的规则会变化。模板只描述通用业务结构；经营者必须在发布前自行核对所用平台当期允许的商品、宣传、交付和售后方式。</div>' +
      '</article><aside class="doc-aside glass-panel"><h3>销售与交付包</h3><div class="asset-list"><a class="asset-row" href="playbook/templates/02-sales-note.md" download><span class="asset-ext">MD</span><span><strong>销售内容模板</strong><span>封面、标题与正文结构</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="playbook/templates/03-product-listing.md" download><span class="asset-ext">MD</span><span><strong>商品说明模板</strong><span>内容、边界与常见问题</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="playbook/templates/04-delivery-message.md" download><span class="asset-ext">MD</span><span><strong>链接交付话术</strong><span>标准发送与异常排查</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="playbook/templates/05-first-sale-checklist.md" download><span class="asset-ext">MD</span><span><strong>首单检查表</strong><span>发布前逐项核对</span></span><span class="asset-arrow">↓</span></a></div><a class="btn block primary" href="#/case">对照完整案例 →</a></aside></div></section>',
      "销售与交付", "roadmap"
    );
  }

  function viewCase() {
    var firstHref = PRESETS.length ? "#/t/" + PRESETS[0].id : "#/tests";
    render(
      '<section class="doc-hero"><div class="content"><span class="section-kicker">END-TO-END CASE · 完整案例</span><h1>文学原型测评，<br>从商品假设到链接交付。</h1><p>这是整套方法的可运行样品。它证明生产和交付链路可以跑通，但不伪装成市场销量或收益证明。</p><div class="hero-actions"><a class="btn primary" href="' + firstHref + '">先站在买家视角试玩 →</a><a class="btn" href="playbook/case-literary-archetype.md" download>下载案例文档</a></div></div></section>' +
      '<section class="section-block compact"><div class="content"><div class="case-chain"><article><span>商品假设</span><h3>文学人物提供一种有文化语境的身份解释</h3><p>目标用户喜欢文学人物、人格测评与可以分享的自我表达。</p></article><article><span>供给</span><h3>12 道场景题，8 个结果原型</h3><p>题目、计分、解释、结果卡与网站共同组成一件商品。</p></article><article><span>连接</span><h3>用场景和结果切片制造“我也想测”</h3><p>平台内容负责兴趣，商品页负责说明，平台能力负责交易。</p></article><article><span>交付</span><h3>付款后发送完整测评链接</h3><p>买家打开、答题、看到主原型与次要底色，交付完成。</p></article></div></div></section>' +
      '<section class="section-block"><div class="content"><div class="section-head row"><div><span class="section-kicker">THE PRODUCT · 最终商品体验</span><h2>买家实际拿到的，就是下面这套体验。</h2><p>从封面进入，一屏一题，完成后得到结果解释和可保存的结果卡。</p></div><a class="text-link" href="#/tests">查看全部样品 →</a></div><div class="test-grid">' + PRESETS.slice(0, 3).map(testCard).join("") + '</div></div></section>' +
      '<section class="section-block"><div class="content split-statement"><div><span class="section-kicker">EVIDENCE BOUNDARY · 证据边界</span><h2>案例可以证明“能做出来”，不能证明“必然卖得出去”。</h2></div><div class="check-stack"><p>已证明：题库可以生成和校验</p><p>已证明：网站可以完整答题</p><p>已证明：结果卡和链接可以交付</p><p>未证明：任何平台的需求与销量</p><p>未证明：价格、转化率或利润</p></div></div></section>',
      "完整案例", "case"
    );
  }

  function viewTools() {
    render(
      '<section class="doc-hero"><div class="content"><span class="section-kicker">OPEN TOOLBOX · 开源工具箱</span><h1>每一步，都有一份<br>可以直接带走的文件。</h1><p>从选题、出题、生成链接到销售与交付，所有模板、提示词、代码和案例都不设登录与付费墙。</p></div></section>' +
      '<section class="section-block compact"><div class="content tool-sections">' +
        '<div><div class="section-head"><span class="section-kicker">01 · 内容与选品</span><h2>先证明有人想测。</h2></div><div class="asset-grid"><a class="asset-row" href="playbook/templates/01-topic-card.md" download><span class="asset-ext">MD</span><span><strong>测评选题卡</strong><span>记录需求证据与商品定义</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="#/research"><span class="asset-ext">WEB</span><span><strong>内容分析教程</strong><span>十条证据到一句承诺</span></span><span class="asset-arrow">→</span></a></div></div>' +
        '<div><div class="section-head"><span class="section-kicker">02 · 题目与建站</span><h2>把主题变成一条链接。</h2></div><div class="asset-grid"><a class="asset-row" href="#/prompts"><span class="asset-ext">WEB</span><span><strong>AI 出题提示词</strong><span>输入主题，生成标准 JSON</span></span><span class="asset-arrow">→</span></a><a class="asset-row" href="skill/doubao-skill.md" download><span class="asset-ext">MD</span><span><strong>豆包使用说明</strong><span>给普通经营者</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="skill/create-feiye-quiz/SKILL.md" download><span class="asset-ext">SKILL</span><span><strong>Agent 出题 Skill</strong><span>提示、规范与验证脚本</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="#/create"><span class="asset-ext">APP</span><span><strong>测评链接生成器</strong><span>上传、校验、试玩与复制</span></span><span class="asset-arrow">→</span></a><a class="asset-row" href="examples/deep-night-cafe.json" download><span class="asset-ext">JSON</span><span><strong>最小题库示例</strong><span>可以直接导入试玩</span></span><span class="asset-arrow">↓</span></a></div></div>' +
        '<div><div class="section-head"><span class="section-kicker">03 · 销售与交付</span><h2>把商品说清楚、发完整。</h2></div><div class="asset-grid"><a class="asset-row" href="playbook/templates/02-sales-note.md" download><span class="asset-ext">MD</span><span><strong>平台销售内容模板</strong><span>标题、正文和发布检查</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="playbook/templates/03-product-listing.md" download><span class="asset-ext">MD</span><span><strong>商品说明模板</strong><span>交付物、边界与常见问题</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="playbook/templates/04-delivery-message.md" download><span class="asset-ext">MD</span><span><strong>链接交付话术</strong><span>标准发送与打不开排查</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="playbook/templates/05-first-sale-checklist.md" download><span class="asset-ext">MD</span><span><strong>首单检查表</strong><span>需求、题目、网站、销售、交付</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="playbook/templates/06-review-sheet.csv" download><span class="asset-ext">CSV</span><span><strong>最小经营记录表</strong><span>不收集答题隐私</span></span><span class="asset-arrow">↓</span></a></div></div>' +
        '<div><div class="section-head"><span class="section-kicker">04 · 完整项目</span><h2>复制全部，而不是拼碎片。</h2></div><div class="asset-grid"><a class="asset-row" href="playbook/README.md" download><span class="asset-ext">MD</span><span><strong>商业模式 Playbook</strong><span>三方、七步与 MVP 边界</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="playbook/case-literary-archetype.md" download><span class="asset-ext">CASE</span><span><strong>文学原型完整案例</strong><span>商品假设到链接交付</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="' + REPO_URL + '" target="_blank" rel="noopener"><span class="asset-ext">GIT</span><span><strong>全部网站源码</strong><span>MIT · Fork、修改与商用</span></span><span class="asset-arrow">↗</span></a></div></div>' +
      '</div></section>',
      "开源工具箱", "tools"
    );
  }

  function viewTests() {
    var categories = ["全部"];
    PRESETS.forEach(function (test) {
      var category = categoryOf(test);
      if (categories.indexOf(category) === -1) categories.push(category);
    });
    var resultTotal = PRESETS.reduce(function (sum, test) { return sum + Object.keys(test.results || {}).length; }, 0);
    render(
      '<section class="page-hero"><div class="content"><span class="section-kicker">RUNNING PRODUCTS · 可运行样品</span><h1>先完整体验一次，<br>再复制整套方法。</h1><p>这里展示的是买家实际拿到的消费体验：进入封面、完成答题、查看结果并保存结果卡。样品免费开放，用来验证生产与交付链路。</p>' +
      '<div class="metrics"><div class="metric"><strong>' + PRESETS.length + '</strong><div class="metric-label">TESTS</div></div><div class="metric"><strong>' + resultTotal + '</strong><div class="metric-label">ARCHETYPES</div></div><div class="metric"><strong>3</strong><div class="metric-label">MINUTES</div></div><div class="metric"><strong>∞</strong><div class="metric-label">SHARES</div></div></div></div></section>' +
      '<section class="section-block compact"><div class="content">' +
        '<div class="library-tools"><input class="searchbox" id="test-search" type="search" placeholder="搜索作品、人物或气质…" aria-label="搜索测评"><div class="filter-row" role="group" aria-label="测评分类">' +
          categories.map(function (category, index) { return '<button class="filter-chip' + (index === 0 ? ' active' : '') + '" data-category="' + esc(category) + '">' + esc(category) + '</button>'; }).join("") +
        '</div></div><div class="test-grid" id="test-grid">' + PRESETS.map(testCard).join("") + '</div><div class="empty-state" id="test-empty" hidden>书架上暂时没有符合条件的测评。</div>' +
      '</div></section>',
      "可运行样品", "case"
    );

    var input = document.getElementById("test-search");
    var currentCategory = "全部";
    function filterTests() {
      var keyword = input.value.trim().toLowerCase();
      var cards = Array.prototype.slice.call(document.querySelectorAll("#test-grid .test-card"));
      var visible = 0;
      cards.forEach(function (card) {
        var categoryMatch = currentCategory === "全部" || card.dataset.category === currentCategory;
        var keywordMatch = !keyword || card.dataset.title.indexOf(keyword) !== -1;
        card.hidden = !(categoryMatch && keywordMatch);
        if (!card.hidden) visible++;
      });
      document.getElementById("test-empty").hidden = visible !== 0;
    }
    input.addEventListener("input", filterTests);
    Array.prototype.forEach.call(document.querySelectorAll(".filter-chip"), function (button) {
      button.addEventListener("click", function () {
        currentCategory = button.dataset.category;
        Array.prototype.forEach.call(document.querySelectorAll(".filter-chip"), function (item) { item.classList.toggle("active", item === button); });
        filterTests();
      });
    });
  }

  /* ---------- cover, quiz and result ---------- */

  function viewCover(test, ref) {
    var questionCount = test.questions.length;
    var resultCount = Object.keys(test.results).length;
    render(
      '<section class="cover-page"><div class="content"><article class="cover-card glass-panel" style="--hue:' + hueOf(test) + '">' +
        '<span class="tag">' + esc(test.tag || "自建测评") + '</span><h1>' + esc(test.title) + '</h1><p class="cover-sub">' + esc(test.subtitle || "翻开一页，认出自己。") + '</p><div class="cover-rule"></div>' +
        (test.desc ? '<p class="cover-desc">' + esc(test.desc) + '</p>' : "") +
        '<button class="btn primary" id="start-quiz">翻开第一页 →</button>' +
        '<div class="cover-meta"><span>' + numCN(questionCount) + ' QUESTIONS</span><span>' + numCN(resultCount) + ' ARCHETYPES</span><span>ABOUT ' + Math.max(1, Math.round(questionCount / 4)) + ' MIN</span></div>' +
      '</article></div></section>',
      test.title, "case"
    );
    document.getElementById("start-quiz").addEventListener("click", function () {
      quiz = { test: test, ref: ref, idx: 0, answers: [] };
      viewQuiz();
    });
  }

  function viewQuiz() {
    var test = quiz.test;
    var index = quiz.idx;
    var question = test.questions[index];
    var total = test.questions.length;
    var chosen = quiz.answers[index];
    var options = question.options.map(function (option, optionIndex) {
      return '<button class="opt' + (chosen === optionIndex ? ' chosen' : '') + '" data-index="' + optionIndex + '"><span class="mark">' + (MARKS[optionIndex] || optionIndex + 1) + '</span><span>' + esc(option.text) + '</span></button>';
    }).join("");
    render(
      '<section class="quiz-page"><div class="content quiz-shell"><div class="quiz-head"><span>' + esc(test.title) + '</span><span>' + numCN(index + 1) + ' / ' + numCN(total) + '</span></div>' +
      '<div class="quiz-progress" role="progressbar" aria-label="答题进度" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + (index + 1) + '"><i id="quiz-bar"></i></div>' +
      '<div class="q-block" id="question-block"><h1 class="q-text">' + esc(question.q) + '</h1><div class="options">' + options + '</div></div>' +
      '<div class="quiz-foot"><button id="quiz-back">' + (index === 0 ? "← 返回封面" : "← 上一题") + '</button><span>选择没有对错，只有更像此刻的你</span></div></div></section>',
      test.title, "case"
    );
    requestAnimationFrame(function () {
      var bar = document.getElementById("quiz-bar");
      if (bar) bar.style.width = ((index + 1) / total * 100) + "%";
    });
    Array.prototype.forEach.call(document.querySelectorAll(".opt"), function (button) {
      button.addEventListener("click", function () {
        var optionIndex = Number(button.dataset.index);
        quiz.answers[index] = optionIndex;
        button.classList.add("chosen");
        document.getElementById("question-block").classList.add("leaving");
        setTimeout(function () {
          if (quiz.idx < total - 1) {
            quiz.idx++;
            viewQuiz();
          } else {
            finishQuiz();
          }
        }, 280);
      });
    });
    document.getElementById("quiz-back").addEventListener("click", function () {
      if (quiz.idx === 0) viewCover(quiz.test, quiz.ref);
      else { quiz.idx--; viewQuiz(); }
    });
  }

  function finishQuiz() {
    var test = quiz.test;
    var ref = quiz.ref;
    var result = tally(test, quiz.answers);
    viewResult(test, ref, result.first, result.second, { own: true });
  }

  function plateHTML(test, key, secondKey) {
    var result = test.results[key];
    var second = secondKey && test.results[secondKey];
    var accent = "hsl(" + (result.hue == null ? 18 : result.hue) + ", 42%, 36%)";
    var traits = (result.traits || []).map(function (trait) { return '<span>' + esc(trait) + '</span>'; }).join("");
    return '<article class="bookplate" id="result-card" style="--accent:' + accent + '"><div class="bookplate-inner">' +
      '<div class="plate-label"><span>FEIYE · LITERARY ARCHETYPE</span><span class="seal">EX LIBRIS</span></div>' +
      '<div class="plate-name">' + esc(result.name) + '</div>' +
      (result.source ? '<div class="plate-source">' + esc(result.source) + '</div>' : "") +
      (result.quote ? '<blockquote class="plate-quote">「' + esc(result.quote) + '」</blockquote>' : "") +
      (result.desc ? '<div class="plate-desc">' + esc(result.desc) + '</div>' : "") +
      (traits ? '<div class="plate-traits">' + traits + '</div>' : "") +
      (second ? '<div class="plate-second">你的次要底色 · <b>' + esc(second.name) + '</b>' + (second.source ? '（' + esc(second.source) + '）' : '') + '</div>' : "") +
      '<div class="plate-foot"><span>' + esc(test.title) + '</span><span>FEIYE · OPEN LAB</span></div>' +
    '</div></article>';
  }

  function viewResult(test, ref, key, secondKey, options) {
    var result = test.results[key];
    if (!result) return viewError("没有找到这张结果卡。");
    var own = !!options.own;
    var quizURL = baseURL() + testHash(ref);
    var myResultHash = resultHash(ref, key, secondKey);
    var resultURL = baseURL() + myResultHash;
    var actions = own
      ? '<div class="result-actions"><button class="btn primary primary-action" id="download-card">下载结果卡 PNG</button><button class="btn wine" id="share-result">分享我的结果</button><button class="btn" id="share-test">邀请朋友来测</button><button class="btn" id="copy-result">复制结果链接</button><a class="btn" href="' + esc(testHash(ref)) + '" id="retry-quiz">再测一次</a></div><p class="result-hint">结果卡会在你的设备上生成，不会上传任何答案。</p>'
      : '<div class="result-actions"><a class="btn primary primary-action" href="' + esc(testHash(ref)) + '">我也来测一测 →</a><button class="btn" id="download-card">保存这张结果卡</button><a class="btn" href="#/tests">看看别的测评</a></div>';
    render(
      '<section class="result-page"><div class="content"><div class="result-intro">' + (own ? "RESULT REVEALED · 制票完成" : "A BOOKPLATE FROM A FRIEND · 朋友寄来的藏书票") + '</div>' +
      plateHTML(test, key, secondKey) + actions + '</div></section>',
      result.name + " · " + test.title, "case"
    );
    document.getElementById("download-card").addEventListener("click", function () { downloadResultCard(test, key, secondKey); });
    var shareResultButton = document.getElementById("share-result");
    if (shareResultButton) shareResultButton.addEventListener("click", function () {
      shareOrCopy({ title: "我在「" + test.title + "」测出了 " + result.name, text: "我的文学原型是「" + result.name + "」。你会是谁？", url: resultURL }, "结果链接已复制");
    });
    var shareTestButton = document.getElementById("share-test");
    if (shareTestButton) shareTestButton.addEventListener("click", function () {
      shareOrCopy({ title: test.title, text: "我刚做完「" + test.title + "」，轮到你了。", url: quizURL }, "测评链接已复制");
    });
    var copyButton = document.getElementById("copy-result");
    if (copyButton) copyButton.addEventListener("click", function () { copyText(resultURL, "结果链接已复制"); });
    var retry = document.getElementById("retry-quiz");
    if (retry) retry.addEventListener("click", function (event) {
      event.preventDefault();
      quiz = { test: test, ref: ref, idx: 0, answers: [] };
      viewQuiz();
    });
  }

  function canvasLines(context, text, maxWidth) {
    var source = String(text || "");
    var lines = [];
    var current = "";
    source.split("").forEach(function (character) {
      if (character === "\n") {
        lines.push(current);
        current = "";
        return;
      }
      var next = current + character;
      if (context.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = character;
      } else {
        current = next;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function drawLines(context, lines, x, y, lineHeight, maxLines) {
    var count = Math.min(lines.length, maxLines || lines.length);
    for (var i = 0; i < count; i++) {
      var value = lines[i];
      if (i === count - 1 && lines.length > count) value = value.replace(/[，。！？、；：,.!?;:]?$/, "") + "…";
      context.fillText(value, x, y + i * lineHeight);
    }
    return y + count * lineHeight;
  }

  function downloadResultCard(test, key, secondKey) {
    var result = test.results[key];
    var second = secondKey && test.results[secondKey];
    var canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    var context = canvas.getContext("2d");
    context.fillStyle = "#eee7da";
    context.fillRect(0, 0, 1080, 1440);
    context.strokeStyle = "rgba(36,32,25,.58)";
    context.lineWidth = 3;
    context.strokeRect(38, 38, 1004, 1364);
    context.strokeStyle = "rgba(36,32,25,.18)";
    context.lineWidth = 1;
    context.strokeRect(52, 52, 976, 1336);

    context.fillStyle = "#746d63";
    context.font = '22px "SFMono-Regular", monospace';
    context.fillText("FEIYE · LITERARY ARCHETYPE", 96, 112);
    context.textAlign = "right";
    context.fillStyle = "hsl(" + (result.hue || 18) + ",42%,36%)";
    context.fillText("EX LIBRIS", 984, 112);
    context.textAlign = "left";

    var nameSize = result.name.length > 7 ? 86 : 112;
    context.fillStyle = "#242019";
    context.font = nameSize + 'px "Songti SC", "STSong", serif';
    context.fillText(result.name, 96, 300);
    var cursor = 352;
    if (result.source) {
      context.fillStyle = "hsl(" + (result.hue || 18) + ",42%,36%)";
      context.font = '27px "PingFang SC", sans-serif';
      context.fillText(result.source, 98, cursor);
      cursor += 88;
    }
    if (result.quote) {
      context.fillStyle = "#625b52";
      context.font = 'italic 34px "Songti SC", "STSong", serif';
      var quoteLines = canvasLines(context, "「" + result.quote + "」", 820);
      context.fillStyle = "hsl(" + (result.hue || 18) + ",42%,36%)";
      context.fillRect(96, cursor - 30, 4, Math.min(quoteLines.length, 4) * 52 + 12);
      context.fillStyle = "#625b52";
      cursor = drawLines(context, quoteLines, 126, cursor, 52, 4) + 48;
    }
    if (result.desc) {
      context.fillStyle = "#403a32";
      context.font = '31px "Songti SC", "STSong", serif';
      cursor = drawLines(context, canvasLines(context, result.desc, 888), 96, cursor, 53, 10) + 28;
    }
    if (result.traits && result.traits.length) {
      context.font = '23px "PingFang SC", sans-serif';
      var traitX = 96;
      result.traits.slice(0, 5).forEach(function (trait) {
        var width = context.measureText(trait).width + 48;
        context.strokeStyle = "rgba(36,32,25,.28)";
        context.lineWidth = 2;
        context.strokeRect(traitX, cursor, width, 48);
        context.fillStyle = "#625b52";
        context.fillText(trait, traitX + 24, cursor + 32);
        traitX += width + 14;
      });
      cursor += 84;
    }
    if (second && cursor < 1240) {
      context.strokeStyle = "rgba(36,32,25,.18)";
      context.beginPath();
      context.moveTo(96, cursor);
      context.lineTo(984, cursor);
      context.stroke();
      context.fillStyle = "#625b52";
      context.font = '23px "PingFang SC", sans-serif';
      context.fillText("你的次要底色 · " + second.name, 96, cursor + 50);
    }
    context.fillStyle = "rgba(36,32,25,.48)";
    context.font = '19px "SFMono-Regular", monospace';
    context.fillText(test.title, 96, 1344);
    context.textAlign = "right";
    context.fillText("FEIYE · OPEN LAB", 984, 1344);
    canvas.toBlob(function (blob) {
      if (!blob) return showToast("结果卡生成失败，请截图保存");
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "扉页-" + safeFilename(test.title) + "-" + safeFilename(result.name) + ".png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      showToast("结果卡已生成");
    }, "image/png");
  }

  /* ---------- prompt and creator ---------- */

  function skillPrompt(theme) {
    var finalTheme = String(theme || "").trim();
    return "你是开源文学测评站「扉页」的出题人。请围绕指定主题创作一套可直接导入网站的文学原型测评。\n\n" +
      "【内容要求】\n" +
      "1. 设计 8—12 道题，每题 4 个选项；设计 4—8 个结果原型。\n" +
      "2. 先确定结果原型，再写题。题目必须落在具体场景与瞬间里，例如深夜、雨天、散场后、旧物、来信；不要直接问‘你是否内向’。\n" +
      "3. 每个选项都没有高低好坏，并通过 scores 指向 1—2 个结果：主要倾向 2 分，次要倾向 1 分。每个结果至少获得 4 次主要得分机会，各结果覆盖尽量均衡。\n" +
      "4. 每个结果包含 name、source、quote、desc、traits、hue。desc 写 120—180 字：先肯定独特之处，再温柔点破隐秘软肋，最后用一句值得截图的话收尾。\n" +
      "5. quote 只有在能确认出处时才填写；不确定就写空字符串，禁止伪造名言。\n" +
      "6. result key 使用简短小写英文。所有字符串使用英文双引号，不要尾逗号。\n" +
      "7. 输出前自行检查：每个 scores key 都存在于 results；每个结果都能被测出；题目与结果数量符合要求。\n\n" +
      "【JSON 结构】\n" +
      "{\n" +
      '  "title": "测试标题，14 字以内",\n' +
      '  "subtitle": "一句有画面感的副标题",\n' +
      '  "tag": "分类 · 题数",\n' +
      '  "desc": "两三句邀请式开场白",\n' +
      '  "questions": [\n' +
      '    { "q": "题干", "options": [\n' +
      '      { "text": "选项文字", "scores": { "key1": 2, "key2": 1 } }\n' +
      "    ] }\n" +
      "  ],\n" +
      '  "results": {\n' +
      '    "key1": { "name": "原型名", "source": "出处", "quote": "真实引文或空字符串", "desc": "结果解读", "traits": ["词一", "词二", "词三"], "hue": 200 }\n' +
      "  }\n" +
      "}\n\n" +
      "只输出一个标准 JSON 对象，不要 Markdown 代码围栏，不要解释，不要在 JSON 前后添加任何文字。\n\n" +
      "我的主题是：" + (finalTheme || "（请在这里写主题，例如：测测你是《红楼梦》里的谁）");
  }

  var SAMPLE = {
    title: "深夜食堂原型",
    subtitle: "你是深夜食堂里的哪一道菜",
    tag: "示例 · 三题",
    desc: "这是一份最小示例，用来展示题目结构。你可以直接试玩，也可以改成自己的主题。",
    questions: [
      { q: "凌晨十二点半，你推门进店，最先做的是：", options: [
        { text: "坐到最角落的位置", scores: { chazuke: 2 } },
        { text: "跟老板点头，像老朋友", scores: { tamago: 2 } },
        { text: "看看今天墙上有什么新菜", scores: { karaage: 2 } }
      ] },
      { q: "你更喜欢哪种夜晚：", options: [
        { text: "下过雨的，街道发亮", scores: { chazuke: 2, tamago: 1 } },
        { text: "有人等你的", scores: { tamago: 2 } },
        { text: "还没有计划的", scores: { karaage: 2 } }
      ] },
      { q: "离开时你会：", options: [
        { text: "把碗轻轻推回去，说声谢谢", scores: { tamago: 2 } },
        { text: "在门口站一会儿再走", scores: { chazuke: 2 } },
        { text: "明天想吃什么已经想好了", scores: { karaage: 2, tamago: 1 } }
      ] }
    ],
    results: {
      chazuke: { name: "茶泡饭", source: "深夜食堂 · 第一夜", quote: "简单的东西，最难将就。", desc: "你安静，念旧，把很多话都泡在热水里咽下去。懂你的人不多，但都长久。", traits: ["安静", "念旧", "回甘"], hue: 150 },
      tamago: { name: "玉子烧", source: "深夜食堂 · 常客", quote: "甜一点，没什么不好。", desc: "你是人群里让人放松的那一个，温和、可靠，记得每个人的口味。你的温柔是练出来的。", traits: ["温和", "可靠", "微甜"], hue: 45 },
      karaage: { name: "唐扬鸡块", source: "深夜食堂 · 新面孔", quote: "趁热吃，别客气。", desc: "你活得热气腾腾，对明天永远有胃口。别人怕的麻烦，你觉得是滋味。", traits: ["热烈", "行动派", "外酥里嫩"], hue: 20 }
    }
  };

  function viewCreate() {
    render(
      '<section class="doc-hero"><div class="content"><span class="section-kicker">LINK BUILDER · 建站工作台</span><h1>把标准题库，<br>变成一条商品链接。</h1><p>让 AI 出题，或上传自己的 JSON。校验通过后，题目会被压缩进完整链接；买家付款后，把这条链接发送给他即可。</p></div></section>' +
      '<section><div class="content doc-layout"><article class="doc-main glass-panel">' +
        '<h2>最快的做法</h2><div class="steps"><div class="step"><div><h3>告诉 AI 你的主题</h3><p>复制出题提示词发给豆包、DeepSeek、Kimi 或任何 AI。</p></div></div><div class="step"><div><h3>拿回标准 JSON</h3><p>把 AI 返回的完整内容复制下来，也可以保存成 .json 文件。</p></div></div><div class="step"><div><h3>校验、试玩、保存</h3><p>生成链接后，必须站在买家视角完整答一遍，再把链接保存为商品交付物。</p></div></div></div>' +
        '<div class="field"><label for="quick-theme">先写主题，再复制定制提示词</label><input class="text-input" id="quick-theme" placeholder="例如：测测你是《红楼梦》里的谁"><button class="btn wine" id="copy-quick-prompt">复制带主题的提示词</button></div>' +
        '<h2>导入题目</h2><div class="upload-box"><input id="json-file" type="file" accept=".json,application/json"><strong id="upload-title">点击选择或拖入 .json 文件</strong><span>文件只在本机读取，不会上传</span></div>' +
        '<div class="field"><label for="json-paste">或者直接粘贴 JSON</label><textarea class="paste" id="json-paste" spellcheck="false" placeholder=\'{ "title": "…", "questions": [ … ], "results": { … } }\'></textarea></div>' +
        '<p class="field-note">解析器会自动去掉 ``` 围栏和尾逗号；题目最多 50 道、结果最多 24 个、原始 JSON 不超过 40KB。</p>' +
        '<div class="btn-row"><button class="btn primary" id="build-link">校验并生成商品链接</button><button class="btn" id="fill-sample">填入最小示例</button></div><div id="create-feedback" aria-live="polite"></div>' +
      '</article><aside class="doc-aside glass-panel"><h3>链接就是第一版交付物</h3><p>扉页不会保存题目和答案。整套题经压缩后编码在 URL 的 <code>#</code> 后面，服务器看不到这部分内容。</p><ul><li>不需要账号或支付接入</li><li>同一链接可以重复打开</li><li>链接在，题目就在</li><li>第一版接受链接被转发</li></ul><a class="btn block" href="#/prompts">查看完整提示词</a><a class="btn block" href="#/sell" style="margin-top:10px">下一步：销售与交付</a></aside></div></section>',
      "生成商品链接", "roadmap"
    );
    var textarea = document.getElementById("json-paste");
    var fileInput = document.getElementById("json-file");
    document.getElementById("copy-quick-prompt").addEventListener("click", function () {
      copyText(skillPrompt(document.getElementById("quick-theme").value), "出题提示词已复制");
    });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (file.size > 100000) return showCreateError("文件太大了。请选择 100KB 以内的 JSON 文件。");
      file.text().then(function (text) {
        textarea.value = text;
        document.getElementById("upload-title").textContent = file.name;
        showToast("JSON 文件已载入");
      }).catch(function () { showCreateError("无法读取这个文件，请确认它是文本格式的 JSON。"); });
    });
    document.getElementById("fill-sample").addEventListener("click", function () {
      textarea.value = JSON.stringify(SAMPLE, null, 2);
      showToast("示例已填入");
    });
    document.getElementById("build-link").addEventListener("click", function () {
      buildShareLink(textarea.value);
    });
  }

  function showCreateError(message) {
    var feedback = document.getElementById("create-feedback");
    if (feedback) feedback.innerHTML = '<div class="feedback-box error">' + esc(message) + '</div>';
  }

  function buildShareLink(input) {
    var feedback = document.getElementById("create-feedback");
    var parsed = parseLoose(input);
    if (parsed.error) return showCreateError(parsed.error);
    var normalized = normalizeTest(parsed.data);
    if (normalized.errors) return showCreateError(normalized.errors.join("\n"));
    feedback.innerHTML = '<div class="feedback-box success">格式通过，正在装订分享链接…</div>';
    encodeTest(normalized.test).then(function (payload) {
      var hash = "#/x/" + payload;
      var url = baseURL() + hash;
      var lengthWarning = url.length > 8000 ? ["分享链接超过 8,000 字符，部分 App 可能截断。建议精简结果描述。"] : [];
      var warnings = normalized.warnings.concat(lengthWarning);
      feedback.innerHTML = (warnings.length ? '<div class="feedback-box warning">' + esc(warnings.join("\n")) + '</div>' : '') +
        '<div class="generated glass-panel"><h3>《' + esc(normalized.test.title) + '》商品链接已生成</h3><div class="generated-meta">' + normalized.test.questions.length + ' 道题 · ' + Object.keys(normalized.test.results).length + ' 种结果 · 链接约 ' + (url.length > 1024 ? (url.length / 1024).toFixed(1) + ' KB' : url.length + ' 字符') + '</div>' +
        '<div class="linkline"><input class="text-input" id="made-url" readonly value="' + esc(url) + '"><button class="btn small wine" id="copy-made">复制链接</button></div><div class="btn-row" style="margin-top:12px"><a class="btn small" href="' + esc(hash) + '">先自己试玩 →</a><button class="btn small" id="download-json">下载标准 JSON</button></div></div>';
      document.getElementById("copy-made").addEventListener("click", function () { copyText(url, "分享链接已复制"); });
      document.getElementById("made-url").addEventListener("click", function () { this.select(); });
      document.getElementById("download-json").addEventListener("click", function () {
        downloadText(JSON.stringify(normalized.test, null, 2), safeFilename(normalized.test.title) + ".json", "application/json;charset=utf-8");
      });
    }).catch(function (error) { showCreateError(error && error.message ? error.message : "生成链接失败，请换一个现代浏览器重试。"); });
  }

  function viewPrompts() {
    var initialPrompt = skillPrompt("");
    render(
      '<section class="doc-hero"><div class="content"><span class="section-kicker">QUESTION PRODUCTION · 题目制作</span><h1>一句商品主题，<br>长成一套标准题库。</h1><p>完整提示词、变量、JSON 结构和可安装 Skill 全部公开。经营者需要核实内容质量，再把题库送进链接生成器。</p><div class="metrics"><div class="metric"><strong>1</strong><div class="metric-label">PROMPT</div></div><div class="metric"><strong>1</strong><div class="metric-label">SCHEMA</div></div><div class="metric"><strong>1</strong><div class="metric-label">SKILL</div></div><div class="metric"><strong>0</strong><div class="metric-label">PAYWALL</div></div></div></div></section>' +
      '<section><div class="content doc-layout"><article class="doc-main glass-panel"><h2>文学原型测评出题器</h2><p>输入一个具体主题，提示词会自动把它放到最后。复制整段发给豆包、DeepSeek、Kimi、ChatGPT 或任何支持长文本的 AI。</p>' +
        '<div class="field"><label for="prompt-theme">你的测试主题</label><input class="text-input" id="prompt-theme" placeholder="例如：你是哪种宋朝文人"></div>' +
        '<div class="code-wrap"><pre class="codeblock" id="prompt-block">' + esc(initialPrompt) + '</pre><button class="btn small wine copy-float" id="copy-prompt">复制提示词</button></div>' +
        '<div class="btn-row" style="margin-top:12px"><button class="btn" id="download-prompt">下载 Prompt.md</button><a class="btn" href="#/create">拿到 JSON 后去创建 →</a></div>' +
        '<h2>它解决了什么</h2><div class="steps"><div class="step"><div><h3>先定结果，再写问题</h3><p>避免题目写完才硬凑人格，保证每个结果都有清晰边界。</p></div></div><div class="step"><div><h3>用场景代替性格审问</h3><p>不问“你是否敏感”，而问雨停以后你会不会回头。</p></div></div><div class="step"><div><h3>做评分覆盖检查</h3><p>每个结果获得足够的主要得分机会，避免存在永远测不出的摆设结果。</p></div></div><div class="step"><div><h3>拒绝伪造文学引文</h3><p>不能确认出处时留空，不让“文学感”建立在假名言上。</p></div></div></div>' +
        '<h2>输出字段</h2><table class="schema-table"><thead><tr><th>字段</th><th>作用</th></tr></thead><tbody><tr><td><code>title / subtitle</code></td><td>封面标题与副标题</td></tr><tr><td><code>questions[].options[].scores</code></td><td>选项对应的原型权重</td></tr><tr><td><code>results</code></td><td>原型名、出处、引文、解读、特质和色相</td></tr><tr><td><code>hue</code></td><td>控制结果卡强调色，范围 0—360</td></tr></tbody></table>' +
      '</article><aside class="doc-aside glass-panel"><h3>三种带走方式</h3><div class="asset-list"><a class="asset-row" href="skill/doubao-skill.md" download><span class="asset-ext">MD</span><span><strong>豆包使用说明</strong><span>给普通创作者</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="skill/create-feiye-quiz/SKILL.md" download><span class="asset-ext">SKILL</span><span><strong>Codex / Agent Skill</strong><span>给 AI 工作台</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="skill/create-feiye-quiz/references/schema.md" download><span class="asset-ext">JSON</span><span><strong>字段与评分规范</strong><span>给开发者</span></span><span class="asset-arrow">↓</span></a></div><p style="margin-top:24px">拿到 AI 返回的 JSON 后，不要手改格式。先去创建工作台校验，它会用中文指出问题。</p><a class="btn block primary" href="#/create">打开创建工作台</a></aside></div></section>',
      "题目制作", "roadmap"
    );
    var themeInput = document.getElementById("prompt-theme");
    var promptBlock = document.getElementById("prompt-block");
    function currentPrompt() { return skillPrompt(themeInput.value); }
    themeInput.addEventListener("input", function () { promptBlock.textContent = currentPrompt(); });
    document.getElementById("copy-prompt").addEventListener("click", function () { copyText(currentPrompt(), "出题提示词已复制"); });
    document.getElementById("download-prompt").addEventListener("click", function () { downloadText(currentPrompt(), "扉页-文学测评出题提示词.md", "text/markdown;charset=utf-8"); });
  }

  /* ---------- open source method ---------- */

  function viewOpenSource() {
    render(
      '<section class="doc-hero"><div class="content"><span class="section-kicker">BUILD IN PUBLIC · 开源说明</span><h1>复制的不是一个页面，<br>是完整的生意生产线。</h1><p>商业模型、操作教程、题库、结果卡、销售模板、交付话术和部署方法全部摊开。项目本身免费开源，允许经营者用它制作自己的商业商品。</p></div></section>' +
      '<section><div class="content doc-layout"><article class="doc-main glass-panel">' +
        '<h2>仓库里的五层资产</h2><div class="architecture"><div class="tree-row"><code>index.html</code><span>入口、搜索分享描述与社交预览</span></div><div class="tree-row"><code>assets/</code><span>商业页面、答题应用、内置题库、评分、压缩、分享与结果卡</span></div><div class="tree-row"><code>playbook/</code><span>商业模式、完整案例、选题、销售、商品、交付与复盘模板</span></div><div class="tree-row"><code>skill/</code><span>豆包说明、可安装出题 Skill、字段规范和确定性验证脚本</span></div><div class="tree-row"><code>examples/</code><span>可以直接导入链接生成器的最小标准题库</span></div></div>' +
        '<div class="notice">没有框架、数据库、统计脚本或外部字体。浏览器就是运行环境；分享链接就是自建测试的数据库。</div>' +
        '<h2>从零部署</h2><div class="steps"><div class="step"><div><h3>Fork 仓库</h3><p>在 GitHub 右上角 Fork，或者 Use this template 创建自己的副本。</p></div></div><div class="step"><div><h3>修改品牌与题库</h3><p>改 index.html 的站点信息、app.js 的仓库地址，在 presets.js 增删题目。</p></div></div><div class="step"><div><h3>打开 GitHub Pages</h3><p>Settings → Pages → Deploy from a branch → main / root。</p></div></div><div class="step"><div><h3>拿到公开网址</h3><p>几分钟后访问 https://你的用户名.github.io/仓库名/。</p></div></div></div>' +
        '<h3>本地预览</h3><pre class="codeblock">git clone ' + REPO_URL + '.git\ncd feiye\npython3 -m http.server 8000\n# 打开 http://localhost:8000</pre>' +
        '<h2>评分是怎么工作的</h2><p>每个选项把 2 分给主要倾向、1 分给次要倾向。答完后累加所有结果的分数，最高分成为主原型，第二名作为“次要底色”。同分时按 results 中的顺序稳定决胜。</p><p>创建工作台还会检查：scores 是否引用了不存在的 key、每个结果是否被命中、主要得分机会是否过少、题目与文件是否超限。</p>' +
        '<h2>为什么第一版不存服务器</h2><p>自建题目经 <code>JSON → UTF-8 → deflate → base64url</code> 压缩后放进 URL hash。经营者拿到的这一条完整链接，就是可以保存和发送的商品交付物。</p><p>代价是链接较长、可以转发、无法统一删除或编辑。第一版接受这些损耗；只有真实订单证明复杂系统值得维护，才考虑短链接、兑换码或自动交付。</p>' +
        '<h2>安全、经营与证据边界</h2><ul><li>所有用户文本在渲染前转义，JSON 限制为 40KB、50 道题、24 个结果。</li><li>网站不记录答案、不写 Cookie、不加载统计脚本。</li><li>AI 生成的事实、作品名和文学引文仍需人工核实。</li><li>案例只证明生产和交付能力，不证明需求、销量、价格或利润。</li><li>平台规则会变化，经营者需要在发布前自行核对当期规则。</li></ul>' +
      '</article><aside class="doc-aside glass-panel"><h3>开源交付包</h3><div class="asset-list"><a class="asset-row" href="' + REPO_URL + '" target="_blank" rel="noopener"><span class="asset-ext">GIT</span><span><strong>完整源码</strong><span>MIT License</span></span><span class="asset-arrow">↗</span></a><a class="asset-row" href="playbook/README.md" download><span class="asset-ext">MD</span><span><strong>商业模式 Playbook</strong><span>三方、七步与 MVP 边界</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="README.md" download><span class="asset-ext">MD</span><span><strong>项目 README</strong><span>安装、使用与目录说明</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="skill/create-feiye-quiz/SKILL.md" download><span class="asset-ext">SKILL</span><span><strong>出题 Skill</strong><span>Agent 可直接使用</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="playbook/templates/05-first-sale-checklist.md" download><span class="asset-ext">MD</span><span><strong>首单检查表</strong><span>从需求到链接交付</span></span><span class="asset-arrow">↓</span></a></div><p style="margin-top:24px">MIT 协议允许 Fork、修改与商用。扉页网站本身不靠这套方法收费，也不对任何经营结果作保证。</p><a class="btn block primary" href="' + REPO_URL + '" target="_blank" rel="noopener">在 GitHub 查看源码 ↗</a></aside></div></section>',
      "开源说明", "opensource"
    );
  }

  /* ---------- loading, errors and routes ---------- */

  function viewLoading() {
    render('<section class="cover-page"><div class="content"><div class="cover-card glass-panel"><span class="section-kicker">BINDING · 装订中</span><h1>…</h1><p class="cover-sub">正在从链接里翻出这套题。</p></div></div></section>', "装订中", "case");
  }

  function viewError(message) {
    render('<section class="cover-page"><div class="content"><div class="cover-card glass-panel"><span class="section-kicker">DAMAGED PAGE · 页面破损</span><h1>打不开这套题</h1><p class="cover-desc">' + esc(message) + '</p><div class="btn-row" style="justify-content:center"><a class="btn primary" href="#/tests">回到样品库</a><a class="btn" href="#/create">重新生成链接</a></div></div></div></section>', "链接无效", "case");
  }

  function quizGuard(parts) {
    if (!quiz) return;
    var stay = (parts[0] === "t" && quiz.ref.kind === "preset" && parts[1] === quiz.ref.id) ||
      (parts[0] === "x" && quiz.ref.kind === "custom" && parts[1] === quiz.ref.payload);
    if (!stay) quiz = null;
  }

  function route() {
    var hash = location.hash.replace(/^#\/?/, "");
    var parts = hash.split("/").filter(Boolean);
    quizGuard(parts);
    if (parts.length === 0) return viewHome();
    if (parts[0] === "business" || parts[0] === "model") return viewBusiness();
    if (parts[0] === "roadmap" || parts[0] === "start") return viewRoadmap();
    if (parts[0] === "research" || parts[0] === "analyze") return viewResearch();
    if (parts[0] === "sell" || parts[0] === "deliver") return viewSell();
    if (parts[0] === "case") return viewCase();
    if (parts[0] === "tools" || parts[0] === "assets") return viewTools();
    if (parts[0] === "tests") return viewTests();
    if (parts[0] === "create") return viewCreate();
    if (parts[0] === "prompts" || parts[0] === "prompt" || parts[0] === "skill") return viewPrompts();
    if (parts[0] === "opensource" || parts[0] === "build") return viewOpenSource();

    if (parts[0] === "t" && parts[1]) {
      var preset = PRESETS.filter(function (test) { return test.id === parts[1]; })[0];
      if (!preset) return viewError("书架上没有找到这套测评。");
      var presetRef = { kind: "preset", id: preset.id };
      if (parts[2] === "r" && parts[3] && preset.results[decodeURIComponent(parts[3])]) {
        var presetSecond = parts[4] && preset.results[decodeURIComponent(parts[4])] ? decodeURIComponent(parts[4]) : null;
        return viewResult(preset, presetRef, decodeURIComponent(parts[3]), presetSecond, { own: false });
      }
      return viewCover(preset, presetRef);
    }

    if (parts[0] === "x" && parts[1]) {
      var payload = parts[1];
      viewLoading();
      return decodeTest(payload).then(function (raw) {
        var normalized = normalizeTest(raw);
        if (normalized.errors) return viewError("这套题的数据不完整：" + normalized.errors[0]);
        var customRef = { kind: "custom", payload: payload };
        if (parts[2] === "r" && parts[3] && normalized.test.results[decodeURIComponent(parts[3])]) {
          var customSecond = parts[4] && normalized.test.results[decodeURIComponent(parts[4])] ? decodeURIComponent(parts[4]) : null;
          return viewResult(normalized.test, customRef, decodeURIComponent(parts[3]), customSecond, { own: false });
        }
        viewCover(normalized.test, customRef);
      }).catch(function (error) {
        viewError(error && error.message ? error.message : "链接可能被截断，请让朋友重新发送完整链接。");
      });
    }
    viewHome();
  }

  window.addEventListener("hashchange", route);
  route();
})();
