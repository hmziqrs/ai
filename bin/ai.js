#!/usr/bin/env node
/**
 * ai — install the agents & skills from this repo (ZCode kit by default).
 *
 * Run via npx straight from GitHub (no npm publish needed):
 *   npx github:hmziqrs/ai            symlink install (default)
 *   npx github:hmziqrs/ai uninstall  remove what was installed
 *
 * Or locally:  ./bin/ai.js [--copy] [--zcode-skills] [uninstall]
 *
 * Agents -> ~/.zcode/agents/   Skills -> ~/.agents/skills/
 * Symlinks by default (a git pull / re-run of npx updates in place);
 * falls back to copying on platforms where symlinks need privileges.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HARNESS = 'zcode';
const MODES = { link: true, copy: false };

const args = process.argv.slice(2);
let mode = 'link';
let skillDir = path.join(os.homedir(), '.agents', 'skills');
const agentDir = path.join(os.homedir(), '.zcode', 'agents');

for (const arg of args) {
  switch (arg) {
    case 'install': break; // default action, allows `npx github:hmziqrs/ai install`
    case 'uninstall': case '--uninstall': mode = 'uninstall'; break;
    case '--copy': mode = 'copy'; break;
    case '--zcode-skills': skillDir = path.join(os.homedir(), '.zcode', 'skills'); break;
    case '--help': case '-h':
      console.log('usage: npx github:hmziqrs/ai [install] [--copy] [--zcode-skills] | uninstall');
      process.exit(0);
    default:
      console.error(`unknown argument: ${arg} (supported: install, --copy, --zcode-skills, uninstall)`);
      process.exit(1);
  }
}

function installDir(srcDir, destDir, kind) {
  let installed = 0;
  if (!fs.existsSync(srcDir)) {
    console.error(`error: ${kind} source not found: ${srcDir}`);
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir)) {
    const src = path.join(srcDir, entry);
    const dest = path.join(destDir, entry);
    if (mode === 'uninstall') {
      try {
        fs.lstatSync(dest); // throws if not installed here
        fs.rmSync(dest, { recursive: true, force: true });
        console.log(`removed   ${kind}  ${dest}`);
      } catch { /* not installed here; leave it alone */ }
      continue;
    }
    fs.rmSync(dest, { recursive: true, force: true });
    if (mode === 'copy') {
      fs.cpSync(src, dest, { recursive: true });
      console.log(`installed ${kind}  ${dest} (copy)`);
    } else {
      try {
        fs.symlinkSync(src, dest, 'file');
        console.log(`installed ${kind}  ${dest} -> ${src}`);
      } catch (e) {
        if (e.code === 'EPERM' || e.code === 'EACCES') {
          fs.cpSync(src, dest, { recursive: true });
          console.log(`installed ${kind}  ${dest} (copy — symlink not permitted)`);
        } else throw e;
      }
    }
    installed++;
  }
  if (mode !== 'uninstall' && installed === 0) {
    console.error(`warning: no ${kind} found in ${srcDir}`);
  }
}

installDir(path.join(REPO_ROOT, HARNESS, 'agents'), agentDir, 'agent');
installDir(path.join(REPO_ROOT, HARNESS, 'skills'), skillDir, 'skill');

if (mode === 'uninstall') {
  console.log('Done. Restart ZCode (or open a new session) for removals to take effect.');
} else {
  console.log(`
Done. Restart ZCode (or open a new session) to load the new agents.
Verify: Settings -> Subagents should list general-flash, explore-flash,
general-pro. Dispatch a skill by mentioning z-workflow / z-liteflow.`);
}
