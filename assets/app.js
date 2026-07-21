/* 扉页 · Open Literary Lab
 * 纯静态 SPA：测评、AI 出题、JSON 导入、结果卡下载与开源方法。
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
        '<a class="brand" href="#/" aria-label="扉页首页"><span class="brand-mark">扉</span><span>扉页</span><span class="brand-sub">· Open Lab</span></a>' +
        '<nav aria-label="主导航">' +
          navLink("首页", "#/", "home", active) +
          navLink("测评", "#/tests", "tests", active) +
          navLink("创建", "#/create", "create", active) +
          navLink("提示词", "#/prompts", "prompts", active) +
          navLink("开源", "#/opensource", "opensource", active) +
        '</nav>' +
        '<a class="repo-link" href="' + REPO_URL + '" target="_blank" rel="noopener">GITHUB ↗</a>' +
      '</header></div>' +
      '<main id="main-content">' + inner + '</main>' +
      '<footer class="site-foot"><div class="content foot-inner">' +
        '<div><div class="foot-brand">扉页 · Open Literary Lab</div><div class="foot-copy">每个人都是一本打开到一半的书。免费、开源、无登录、无追踪。</div></div>' +
        '<div class="foot-links"><a href="#/tests">测评库</a><a href="#/prompts">出题提示词</a><a href="#/opensource">建站方法</a><a href="' + REPO_URL + '" target="_blank" rel="noopener">MIT · GitHub</a></div>' +
      '</div></footer><div class="toast" id="toast" role="status" aria-live="polite"></div>' +
    '</div>';
  }

  function render(inner, title, active) {
    app.innerHTML = shell(inner, active);
    document.title = title ? title + " · 扉页" : "扉页 · 开源文学原型测评实验室";
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
    var resultTotal = PRESETS.reduce(function (sum, test) { return sum + Object.keys(test.results || {}).length; }, 0);
    render(
      '<section class="home-hero"><div class="content hero-copy">' +
        '<div class="eyebrow">FEIYE · OPEN LITERARY LAB</div>' +
        '<h1>扉页<span>每个人都是一本打开到一半的书。</span></h1>' +
        '<p>回答几个关于日常的瞬间，认领那个替你活过的文学人物。也可以让 AI 替你出题，把自己的测试装订成一条链接，寄给朋友。</p>' +
        '<div class="hero-actions"><a class="btn primary" href="' + firstHref + '">开始第一套测评 →</a><a class="btn" href="#/create">做一套自己的题</a></div>' +
        '<div class="manifesto"><span><b>ANSWER → REVEAL</b> · 回答，然后看见</span><span><b>PROMPT → QUIZ</b> · 一句话，装订成测试</span><span><b>FORK → YOURS</b> · 复制代码，拥有整座网站</span></div>' +
      '</div></section>' +
      '<section class="section-block"><div class="content">' +
        '<div class="section-head"><span class="section-kicker">THREE ROUTES · 三条入口</span><h2>你今天想翻开哪一页？</h2><p>来玩、来创作，或者把整套方法带走。三条路线都免费，也不需要注册。</p></div>' +
        '<div class="route-grid">' +
          '<a class="route-card" href="#/tests"><span class="file-label">tests.json</span><span class="route-no">01</span><h3>我想测一测</h3><p>从馆藏里挑一套，回答几个具体的生活瞬间，领取自己的文学原型藏书票。</p><span class="route-go">进入测评库 →</span></a>' +
          '<a class="route-card" href="#/prompts"><span class="file-label">prompt.md</span><span class="route-no">02</span><h3>我想出一套题</h3><p>复制公开提示词发给豆包或任何 AI，生成 JSON，再回到创建页得到分享链接。</p><span class="route-go">复制出题咒语 →</span></a>' +
          '<a class="route-card" href="#/opensource"><span class="file-label">build.md</span><span class="route-no">03</span><h3>我想复制网站</h3><p>查看数据结构、评分方法、文件目录和部署步骤，Fork 后换成自己的品牌与题库。</p><span class="route-go">查看开源方法 →</span></a>' +
        '</div>' +
      '</div></section>' +
      '<section class="section-block compact"><div class="content metrics" aria-label="扉页规模">' +
        '<div class="metric"><strong>' + PRESETS.length + '</strong><div class="metric-label">CURATED TESTS · 馆藏</div></div>' +
        '<div class="metric"><strong>' + resultTotal + '</strong><div class="metric-label">ARCHETYPES · 原型</div></div>' +
        '<div class="metric"><strong>0</strong><div class="metric-label">LOGIN · 登录</div></div>' +
        '<div class="metric"><strong>MIT</strong><div class="metric-label">LICENSE · 协议</div></div>' +
      '</div></section>' +
      '<section class="section-block"><div class="content">' +
        '<div class="section-head row"><div><span class="section-kicker">THE SHELF · 馆藏</span><h2>先从一套好题开始。</h2><p>首批三套题逐字打磨。题不求多，先让每个答案都值得被分享。</p></div><a class="text-link" href="#/tests">浏览全部测评 →</a></div>' +
        '<div class="test-grid">' + cards + '</div>' +
      '</div></section>' +
      '<section class="section-block"><div class="content glass-panel open-banner">' +
        '<div><span class="section-kicker">OPEN SOURCE · 免费带走</span><h2>开源的不只是代码，<br>还有做法。</h2><p>提示词、题目格式、评分逻辑、前端源码、部署方法和可安装 Skill 全部公开。你可以 Fork、二创、商用，只请保持它对普通用户免费。</p></div>' +
        '<div class="btn-row"><a class="btn wine" href="#/opensource">查看建站方法</a><a class="btn" href="' + REPO_URL + '" target="_blank" rel="noopener">查看源码 ↗</a></div>' +
      '</div></section>',
      "", "home"
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
      '<section class="page-hero"><div class="content"><span class="section-kicker">TEST LIBRARY · 测评库</span><h1>从一个瞬间，<br>认出另一个自己。</h1><p>每套测评都由具体场景组成，没有正确答案，也不把人塞进僵硬标签。选那个最像你的瞬间。</p>' +
      '<div class="metrics"><div class="metric"><strong>' + PRESETS.length + '</strong><div class="metric-label">TESTS</div></div><div class="metric"><strong>' + resultTotal + '</strong><div class="metric-label">ARCHETYPES</div></div><div class="metric"><strong>3</strong><div class="metric-label">MINUTES</div></div><div class="metric"><strong>∞</strong><div class="metric-label">SHARES</div></div></div></div></section>' +
      '<section class="section-block compact"><div class="content">' +
        '<div class="library-tools"><input class="searchbox" id="test-search" type="search" placeholder="搜索作品、人物或气质…" aria-label="搜索测评"><div class="filter-row" role="group" aria-label="测评分类">' +
          categories.map(function (category, index) { return '<button class="filter-chip' + (index === 0 ? ' active' : '') + '" data-category="' + esc(category) + '">' + esc(category) + '</button>'; }).join("") +
        '</div></div><div class="test-grid" id="test-grid">' + PRESETS.map(testCard).join("") + '</div><div class="empty-state" id="test-empty" hidden>书架上暂时没有符合条件的测评。</div>' +
      '</div></section>',
      "测评库", "tests"
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
      test.title, "tests"
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
      test.title, "tests"
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
      result.name + " · " + test.title, "tests"
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
      '<section class="doc-hero"><div class="content"><span class="section-kicker">QUIZ BUILDER · 创建工作台</span><h1>把一个念头，<br>装订成一套测试。</h1><p>让 AI 出题，或上传自己的 JSON。校验通过后，题目会被压缩进分享链接——不注册、不上传数据库。</p></div></section>' +
      '<section><div class="content doc-layout"><article class="doc-main glass-panel">' +
        '<h2>最快的做法</h2><div class="steps"><div class="step"><div><h3>告诉 AI 你的主题</h3><p>复制出题提示词发给豆包、DeepSeek、Kimi 或任何 AI。</p></div></div><div class="step"><div><h3>拿回标准 JSON</h3><p>把 AI 返回的完整内容复制下来，也可以保存成 .json 文件。</p></div></div><div class="step"><div><h3>校验、试玩、分享</h3><p>粘贴或上传后生成链接，先自己测一遍，再寄给朋友。</p></div></div></div>' +
        '<div class="field"><label for="quick-theme">先写主题，再复制定制提示词</label><input class="text-input" id="quick-theme" placeholder="例如：测测你是《红楼梦》里的谁"><button class="btn wine" id="copy-quick-prompt">复制带主题的提示词</button></div>' +
        '<h2>导入题目</h2><div class="upload-box"><input id="json-file" type="file" accept=".json,application/json"><strong id="upload-title">点击选择或拖入 .json 文件</strong><span>文件只在本机读取，不会上传</span></div>' +
        '<div class="field"><label for="json-paste">或者直接粘贴 JSON</label><textarea class="paste" id="json-paste" spellcheck="false" placeholder=\'{ "title": "…", "questions": [ … ], "results": { … } }\'></textarea></div>' +
        '<p class="field-note">解析器会自动去掉 ``` 围栏和尾逗号；题目最多 50 道、结果最多 24 个、原始 JSON 不超过 40KB。</p>' +
        '<div class="btn-row"><button class="btn primary" id="build-link">校验并生成分享链接</button><button class="btn" id="fill-sample">填入最小示例</button></div><div id="create-feedback" aria-live="polite"></div>' +
      '</article><aside class="doc-aside glass-panel"><h3>链接即数据库</h3><p>扉页不会保存你的题目和答案。整套题经压缩后编码在 URL 的 <code>#</code> 后面，服务器看不到这部分内容。</p><ul><li>不需要账号</li><li>没有审核与广告</li><li>链接在，题目就在</li><li>内容可随仓库一起开源</li></ul><a class="btn block" href="#/prompts">查看完整提示词</a><a class="btn block" href="#/opensource" style="margin-top:10px">查看题目格式</a></aside></div></section>',
      "创建测试", "create"
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
        '<div class="generated glass-panel"><h3>《' + esc(normalized.test.title) + '》装订完成</h3><div class="generated-meta">' + normalized.test.questions.length + ' 道题 · ' + Object.keys(normalized.test.results).length + ' 种结果 · 链接约 ' + (url.length > 1024 ? (url.length / 1024).toFixed(1) + ' KB' : url.length + ' 字符') + '</div>' +
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
      '<section class="doc-hero"><div class="content"><span class="section-kicker">PROMPT LIBRARY · 提示词库</span><h1>一句主题，<br>长成一套好题。</h1><p>这不是藏起来卖的咒语。完整提示词、变量、JSON 结构和可安装 Skill 全部公开。</p><div class="metrics"><div class="metric"><strong>1</strong><div class="metric-label">PROMPT</div></div><div class="metric"><strong>1</strong><div class="metric-label">SCHEMA</div></div><div class="metric"><strong>1</strong><div class="metric-label">SKILL</div></div><div class="metric"><strong>0</strong><div class="metric-label">PAYWALL</div></div></div></div></section>' +
      '<section><div class="content doc-layout"><article class="doc-main glass-panel"><h2>文学原型测评出题器</h2><p>输入一个具体主题，提示词会自动把它放到最后。复制整段发给豆包、DeepSeek、Kimi、ChatGPT 或任何支持长文本的 AI。</p>' +
        '<div class="field"><label for="prompt-theme">你的测试主题</label><input class="text-input" id="prompt-theme" placeholder="例如：你是哪种宋朝文人"></div>' +
        '<div class="code-wrap"><pre class="codeblock" id="prompt-block">' + esc(initialPrompt) + '</pre><button class="btn small wine copy-float" id="copy-prompt">复制提示词</button></div>' +
        '<div class="btn-row" style="margin-top:12px"><button class="btn" id="download-prompt">下载 Prompt.md</button><a class="btn" href="#/create">拿到 JSON 后去创建 →</a></div>' +
        '<h2>它解决了什么</h2><div class="steps"><div class="step"><div><h3>先定结果，再写问题</h3><p>避免题目写完才硬凑人格，保证每个结果都有清晰边界。</p></div></div><div class="step"><div><h3>用场景代替性格审问</h3><p>不问“你是否敏感”，而问雨停以后你会不会回头。</p></div></div><div class="step"><div><h3>做评分覆盖检查</h3><p>每个结果获得足够的主要得分机会，避免存在永远测不出的摆设结果。</p></div></div><div class="step"><div><h3>拒绝伪造文学引文</h3><p>不能确认出处时留空，不让“文学感”建立在假名言上。</p></div></div></div>' +
        '<h2>输出字段</h2><table class="schema-table"><thead><tr><th>字段</th><th>作用</th></tr></thead><tbody><tr><td><code>title / subtitle</code></td><td>封面标题与副标题</td></tr><tr><td><code>questions[].options[].scores</code></td><td>选项对应的原型权重</td></tr><tr><td><code>results</code></td><td>原型名、出处、引文、解读、特质和色相</td></tr><tr><td><code>hue</code></td><td>控制结果卡强调色，范围 0—360</td></tr></tbody></table>' +
      '</article><aside class="doc-aside glass-panel"><h3>三种带走方式</h3><div class="asset-list"><a class="asset-row" href="skill/doubao-skill.md" download><span class="asset-ext">MD</span><span><strong>豆包使用说明</strong><span>给普通创作者</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="skill/create-feiye-quiz/SKILL.md" download><span class="asset-ext">SKILL</span><span><strong>Codex / Agent Skill</strong><span>给 AI 工作台</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="skill/create-feiye-quiz/references/schema.md" download><span class="asset-ext">JSON</span><span><strong>字段与评分规范</strong><span>给开发者</span></span><span class="asset-arrow">↓</span></a></div><p style="margin-top:24px">拿到 AI 返回的 JSON 后，不要手改格式。先去创建工作台校验，它会用中文指出问题。</p><a class="btn block primary" href="#/create">打开创建工作台</a></aside></div></section>',
      "出题提示词", "prompts"
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
      '<section class="doc-hero"><div class="content"><span class="section-kicker">BUILD IN PUBLIC · 建站方法</span><h1>复制的不是页面，<br>是完整闭环。</h1><p>从题目 JSON、评分，到结果卡与部署，这里把扉页如何工作全部摊开。你可以照着做，也可以直接 Fork。</p></div></section>' +
      '<section><div class="content doc-layout"><article class="doc-main glass-panel">' +
        '<h2>这座网站只有四层</h2><div class="architecture"><div class="tree-row"><code>index.html</code><span>入口、搜索分享描述与社交预览</span></div><div class="tree-row"><code>assets/presets.js</code><span>内置测评数据，增加一套题只需增加一个对象</span></div><div class="tree-row"><code>assets/app.js</code><span>路由、答题、评分、压缩、校验、分享与结果卡生成</span></div><div class="tree-row"><code>assets/style.css</code><span>Stardime 式黑色系统外壳与扉页藏书票视觉</span></div><div class="tree-row"><code>skill/create-feiye-quiz/</code><span>可安装的出题 Skill、字段规范和验证脚本</span></div></div>' +
        '<div class="notice">没有框架、数据库、统计脚本或外部字体。浏览器就是运行环境；分享链接就是自建测试的数据库。</div>' +
        '<h2>从零部署</h2><div class="steps"><div class="step"><div><h3>Fork 仓库</h3><p>在 GitHub 右上角 Fork，或者 Use this template 创建自己的副本。</p></div></div><div class="step"><div><h3>修改品牌与题库</h3><p>改 index.html 的站点信息、app.js 的仓库地址，在 presets.js 增删题目。</p></div></div><div class="step"><div><h3>打开 GitHub Pages</h3><p>Settings → Pages → Deploy from a branch → main / root。</p></div></div><div class="step"><div><h3>拿到公开网址</h3><p>几分钟后访问 https://你的用户名.github.io/仓库名/。</p></div></div></div>' +
        '<h3>本地预览</h3><pre class="codeblock">git clone ' + REPO_URL + '.git\ncd feiye\npython3 -m http.server 8000\n# 打开 http://localhost:8000</pre>' +
        '<h2>评分是怎么工作的</h2><p>每个选项把 2 分给主要倾向、1 分给次要倾向。答完后累加所有结果的分数，最高分成为主原型，第二名作为“次要底色”。同分时按 results 中的顺序稳定决胜。</p><p>创建工作台还会检查：scores 是否引用了不存在的 key、每个结果是否被命中、主要得分机会是否过少、题目与文件是否超限。</p>' +
        '<h2>为什么不存服务器</h2><p>自建题目经 <code>JSON → UTF-8 → deflate → base64url</code> 压缩后放进 URL hash。浏览器不会把 hash 发送给服务器，因此题目和答案都留在用户设备上。</p><p>代价是链接较长、无法统一删除或编辑，也没有动态社交预览。等真实需求证明短链接值得维护，再接一个可选的 Worker 存储层。</p>' +
        '<h2>安全与边界</h2><ul><li>所有用户文本在渲染前转义，不能注入 HTML 或脚本。</li><li>JSON 限制为 40KB、50 道题、24 个结果，避免分享链接失控。</li><li>网站不记录答案、不写 Cookie、不加载统计脚本。</li><li>AI 生成的文学引文仍需人工核实；提示词明确要求“不确定就留空”。</li></ul>' +
      '</article><aside class="doc-aside glass-panel"><h3>开源交付包</h3><div class="asset-list"><a class="asset-row" href="' + REPO_URL + '" target="_blank" rel="noopener"><span class="asset-ext">GIT</span><span><strong>完整源码</strong><span>MIT License</span></span><span class="asset-arrow">↗</span></a><a class="asset-row" href="README.md" download><span class="asset-ext">MD</span><span><strong>README</strong><span>安装与二创说明</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="skill/create-feiye-quiz/SKILL.md" download><span class="asset-ext">SKILL</span><span><strong>出题 Skill</strong><span>Agent 可直接使用</span></span><span class="asset-arrow">↓</span></a><a class="asset-row" href="assets/presets.js" download><span class="asset-ext">JS</span><span><strong>三套示例题</strong><span>可直接替换</span></span><span class="asset-arrow">↓</span></a></div><p style="margin-top:24px">MIT 协议允许 Fork、修改与商用。扉页额外提出一个非强制请求：不要把普通用户完成测评的基本链路改成按次付费。</p><a class="btn block primary" href="' + REPO_URL + '" target="_blank" rel="noopener">在 GitHub 查看源码 ↗</a></aside></div></section>',
      "开源建站方法", "opensource"
    );
  }

  /* ---------- loading, errors and routes ---------- */

  function viewLoading() {
    render('<section class="cover-page"><div class="content"><div class="cover-card glass-panel"><span class="section-kicker">BINDING · 装订中</span><h1>…</h1><p class="cover-sub">正在从链接里翻出这套题。</p></div></div></section>', "装订中", "tests");
  }

  function viewError(message) {
    render('<section class="cover-page"><div class="content"><div class="cover-card glass-panel"><span class="section-kicker">DAMAGED PAGE · 页面破损</span><h1>打不开这套题</h1><p class="cover-desc">' + esc(message) + '</p><div class="btn-row" style="justify-content:center"><a class="btn primary" href="#/tests">回到测评库</a><a class="btn" href="#/create">创建一套新的</a></div></div></div></section>', "链接无效", "tests");
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
