#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { deflateRawSync } from "node:zlib";

function usage() {
  console.error("Usage: node validate_quiz.mjs <quiz.json|-> [--share-url https://example.com/]");
  process.exit(2);
}

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (!args.length) usage();
  const input = args[0];
  let shareBase = "";
  for (let i = 1; i < args.length; i += 1) {
    if (args[i] === "--share-url" && args[i + 1]) {
      shareBase = args[i + 1];
      i += 1;
    } else {
      usage();
    }
  }
  return { input, shareBase };
}

function validate(test) {
  const errors = [];
  const warnings = [];
  if (!test || typeof test !== "object" || Array.isArray(test)) {
    return { errors: ["Top level must be a JSON object."], warnings };
  }

  if (typeof test.title !== "string" || !test.title.trim()) errors.push("title is required.");
  else if (test.title.trim().length > 30) errors.push("title must be 30 characters or fewer.");

  if (!Array.isArray(test.questions) || test.questions.length === 0) errors.push("questions must be a non-empty array.");
  else if (test.questions.length > 50) errors.push("questions cannot exceed 50 items.");

  const results = test.results;
  if (!results || typeof results !== "object" || Array.isArray(results)) errors.push("results must be an object.");
  const resultKeys = results && typeof results === "object" && !Array.isArray(results) ? Object.keys(results) : [];
  if (resultKeys.length < 2) errors.push("results must contain at least 2 archetypes.");
  if (resultKeys.length > 24) errors.push("results cannot exceed 24 archetypes.");

  const hits = Object.fromEntries(resultKeys.map((key) => [key, 0]));
  const primaryHits = Object.fromEntries(resultKeys.map((key) => [key, 0]));

  resultKeys.forEach((key) => {
    const result = results[key];
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      errors.push(`results.${key} must be an object.`);
      return;
    }
    if (typeof result.name !== "string" || !result.name.trim()) errors.push(`results.${key}.name is required.`);
    if (result.hue != null && (!Number.isFinite(Number(result.hue)) || Number(result.hue) < 0 || Number(result.hue) > 360)) {
      errors.push(`results.${key}.hue must be between 0 and 360.`);
    }
    if (result.traits != null && !Array.isArray(result.traits)) errors.push(`results.${key}.traits must be an array.`);
  });

  if (Array.isArray(test.questions)) {
    test.questions.forEach((question, questionIndex) => {
      const qPath = `questions[${questionIndex}]`;
      if (!question || typeof question !== "object" || Array.isArray(question)) {
        errors.push(`${qPath} must be an object.`);
        return;
      }
      if (typeof question.q !== "string" || !question.q.trim()) errors.push(`${qPath}.q is required.`);
      if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 8) {
        errors.push(`${qPath}.options must contain 2 to 8 options.`);
        return;
      }
      question.options.forEach((option, optionIndex) => {
        const oPath = `${qPath}.options[${optionIndex}]`;
        if (!option || typeof option !== "object" || Array.isArray(option)) {
          errors.push(`${oPath} must be an object.`);
          return;
        }
        if (typeof option.text !== "string" || !option.text.trim()) errors.push(`${oPath}.text is required.`);
        if (!option.scores || typeof option.scores !== "object" || Array.isArray(option.scores)) {
          errors.push(`${oPath}.scores must be an object.`);
          return;
        }
        const scoreKeys = Object.keys(option.scores);
        if (scoreKeys.length === 0) errors.push(`${oPath}.scores cannot be empty.`);
        if (scoreKeys.length > 2) warnings.push(`${oPath} points to more than 2 results.`);
        let max = 0;
        scoreKeys.forEach((key) => {
          const weight = Number(option.scores[key]);
          if (!resultKeys.includes(key)) errors.push(`${oPath}.scores references missing result key "${key}".`);
          if (!Number.isFinite(weight) || weight <= 0) errors.push(`${oPath}.scores.${key} must be a positive number.`);
          max = Math.max(max, weight);
        });
        scoreKeys.forEach((key) => {
          if (!resultKeys.includes(key)) return;
          hits[key] += 1;
          if (Number(option.scores[key]) === max) primaryHits[key] += 1;
        });
      });
    });
  }

  resultKeys.forEach((key) => {
    if (hits[key] === 0) warnings.push(`Result "${key}" is never referenced and cannot win.`);
    else if (primaryHits[key] < 2) warnings.push(`Result "${key}" has fewer than 2 primary scoring opportunities.`);
    else if (primaryHits[key] < 4) warnings.push(`Result "${key}" has ${primaryHits[key]} primary opportunities; 4 or more is recommended.`);
  });

  const bytes = Buffer.byteLength(JSON.stringify(test), "utf8");
  if (bytes > 40000) errors.push(`JSON is ${bytes} bytes; maximum is 40000 bytes.`);
  return { errors, warnings, bytes, primaryHits };
}

function shareUrl(test, base) {
  const payload = deflateRawSync(Buffer.from(JSON.stringify(test), "utf8")).toString("base64url");
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}#/x/1.${payload}`;
}

const { input, shareBase } = parseArgs(process.argv);
let source;
try {
  source = input === "-" ? readStdin() : fs.readFileSync(path.resolve(input), "utf8");
} catch (error) {
  console.error(JSON.stringify({ ok: false, errors: [`Cannot read input: ${error.message}`] }, null, 2));
  process.exit(1);
}

let quiz;
try {
  quiz = JSON.parse(source);
} catch (error) {
  console.error(JSON.stringify({ ok: false, errors: [`Invalid JSON: ${error.message}`] }, null, 2));
  process.exit(1);
}

const report = validate(quiz);
const output = {
  ok: report.errors.length === 0,
  title: typeof quiz.title === "string" ? quiz.title : "",
  questions: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
  results: quiz.results && typeof quiz.results === "object" ? Object.keys(quiz.results).length : 0,
  bytes: report.bytes,
  primary_hits: report.primaryHits,
  warnings: report.warnings,
  errors: report.errors
};

if (output.ok && shareBase) {
  output.share_url = shareUrl(quiz, shareBase);
  if (output.share_url.length > 8000) output.warnings.push(`Share URL is ${output.share_url.length} characters; some apps may truncate it.`);
}

console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 1);
