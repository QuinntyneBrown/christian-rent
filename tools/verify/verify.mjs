#!/usr/bin/env node
// Runs every CI check and the unit tests locally, the frontend and the backend side by side.
// Run it from the repository root before you push: node tools/verify/verify.mjs
//
// Each lane runs its steps in order and stops at the first failure; the lanes run in parallel.
// The visual, responsive, accessibility and heap sweeps are not run here (AGENTS.md).
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const frontend = join(root, "frontend");
const backend = join(root, "backend");

const lanes = [
  {
    name: "frontend",
    cwd: frontend,
    steps: [
      ["format", "npm", ["run", "format:check"]],
      ["lint", "npm", ["run", "lint"]],
      ["unit tests", "npm", ["test"]],
      ["build", "npm", ["run", "build"]],
      ["behaviour specs", "npm", ["run", "e2e"]],
    ],
  },
  {
    name: "backend",
    cwd: backend,
    steps: [
      ["format", "dotnet", ["format", "--verify-no-changes"]],
      ["build and tests", "dotnet", ["test"]],
    ],
  },
];

// Keep memory bounded: no lingering MSBuild nodes, and Playwright in CI mode reuses no server.
const env = {
  ...process.env,
  MSBUILDDISABLENODEREUSE: "1",
  DOTNET_CLI_TELEMETRY_OPTOUT: "1",
};

function run(lane, [label, command, args]) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd: lane.cwd,
      env,
      shell: process.platform === "win32",
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", (error) => {
      output += String(error);
    });
    child.on("close", (code) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      const ok = code === 0;
      console.log(`${ok ? "✔" : "✘"} ${lane.name}: ${label} (${seconds} s)`);
      if (!ok) {
        console.log(output.trimEnd().split("\n").slice(-60).join("\n"));
      }
      resolve(ok);
    });
  });
}

async function runLane(lane) {
  for (const step of lane.steps) {
    if (!(await run(lane, step))) {
      return false;
    }
  }
  return true;
}

const started = Date.now();
const results = await Promise.all(lanes.map(runLane));
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (results.every(Boolean)) {
  console.log(`\nEverything passed in ${seconds} s.`);
} else {
  console.log(`\nSomething failed (${seconds} s); see above.`);
  process.exitCode = 1;
}
