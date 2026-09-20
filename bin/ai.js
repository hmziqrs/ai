#!/usr/bin/env node
/**
 * ai — install the harness-specific agents and skills from this repo.
 *
 *   npx github:hmziqrs/ai                  ZCode kit (default)
 *   npx github:hmziqrs/ai codex           Codex + Z.ai kit
 *   npx github:hmziqrs/ai codex uninstall remove the Codex kit
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

function zcodeMain(args) {
  const harness = 'zcode';
  let mode = 'install';
  let skillDir = path.join(os.homedir(), '.agents', 'skills');
  const agentDir = path.join(os.homedir(), '.zcode', 'agents');

  for (const arg of args) {
    switch (arg) {
      case 'install': break;
      case 'uninstall': case '--uninstall': mode = 'uninstall'; break;
      case '--zcode-skills': skillDir = path.join(os.homedir(), '.zcode', 'skills'); break;
      case '--help': case '-h':
        console.log(`usage:
  npx github:hmziqrs/ai [install] [--zcode-skills] | uninstall
  npx github:hmziqrs/ai codex [install|uninstall] [options]`);
        return;
      default:
        console.error(`unknown argument: ${arg} (supported: codex, install, --zcode-skills, uninstall)`);
        process.exitCode = 1;
        return;
    }
  }

  function installDir(srcDir, destDir, kind) {
    let installed = 0;
    if (!fs.existsSync(srcDir)) {
      console.error(`error: ${kind} source not found: ${srcDir}`);
      process.exitCode = 1;
      return;
    }
    if (mode !== 'uninstall') fs.mkdirSync(destDir, { recursive: true });
    for (const entry of fs.readdirSync(srcDir)) {
      const src = path.join(srcDir, entry);
      const dest = path.join(destDir, entry);
      if (mode === 'uninstall') {
        try {
          fs.lstatSync(dest);
          fs.rmSync(dest, { recursive: true, force: true });
          console.log(`removed   ${kind}  ${dest}`);
        } catch { /* not installed here; leave it alone */ }
        continue;
      }
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(src, dest, { recursive: true });
      console.log(`installed ${kind}  ${dest}`);
      installed += 1;
    }
    if (mode !== 'uninstall' && installed === 0) {
      console.error(`warning: no ${kind} found in ${srcDir}`);
    }
  }

  installDir(path.join(REPO_ROOT, harness, 'agents'), agentDir, 'agent');
  if (mode === 'uninstall') {
    installDir(path.join(REPO_ROOT, harness, 'skills'), path.join(os.homedir(), '.agents', 'skills'), 'skill');
    installDir(path.join(REPO_ROOT, harness, 'skills'), path.join(os.homedir(), '.zcode', 'skills'), 'skill');
  } else {
    installDir(path.join(REPO_ROOT, harness, 'skills'), skillDir, 'skill');
  }

  if (mode === 'uninstall') {
    console.log('Done. Restart ZCode (or open a new session) for removals to take effect.');
  } else {
    console.log(`
Done. Restart ZCode (or open a new session) to load the new agents.
Verify: Settings -> Subagents should list general-flash, explore-flash,
general-pro. Dispatch z-workflow / z-proflow / z-flashflow / z-liteflow / z-gpui-workflow.`);
  }
}

const args = process.argv.slice(2);
if (args[0] === 'codex' || args[0] === '--codex') {
  require('./codex-ai').main(args.slice(1));
} else {
  zcodeMain(args);
}
