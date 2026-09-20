#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const KIT_ROOT = path.join(REPO_ROOT, 'codex');
const PLUGIN_ROOT = path.join(KIT_ROOT, 'plugins', 'zai-workflows');
const PROVIDER_START = '# BEGIN hmziqrs/ai Codex Z.ai provider';
const PROVIDER_END = '# END hmziqrs/ai Codex Z.ai provider';

function usage() {
  console.log(`usage: npx github:hmziqrs/ai codex [install|uninstall] [options]

Options:
  --force-provider          Replace an existing un-managed [model_providers.zai] table
  --codex-home PATH         Override ~/.codex (useful for testing)
  --skills-home PATH        Override ~/.agents/skills
  --no-config               Copy the kit without editing config.toml
  --dry-run                 Show intended changes without writing files
  -h, --help                Show this help

On first install, ZAI_API_KEY is stored in Codex's local secrets directory with
mode 0600. Later installs reuse that file without overwriting it. The API key is
never written into the repository, config.toml, or command output.`);
}

function parseArgs(argv) {
  const options = {
    mode: 'install',
    codexHome: path.join(os.homedir(), '.codex'),
    skillsHome: path.join(os.homedir(), '.agents', 'skills'),
    forceProvider: false,
    configure: true,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case 'install':
        options.mode = 'install';
        break;
      case 'uninstall':
      case '--uninstall':
        options.mode = 'uninstall';
        break;
      case '--force-provider':
        options.forceProvider = true;
        break;
      case '--no-config':
        options.configure = false;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--codex-home':
      case '--skills-home': {
        const value = argv[index + 1];
        if (!value) throw new Error(`${argument} requires a path`);
        index += 1;
        if (argument === '--codex-home') options.codexHome = path.resolve(value);
        if (argument === '--skills-home') options.skillsHome = path.resolve(value);
        break;
      }
      case '--help':
      case '-h':
        usage();
        return null;
      default:
        throw new Error(`unknown Codex installer argument: ${argument}`);
    }
  }

  return options;
}

function tomlString(value) {
  return JSON.stringify(value);
}

function copyFile(source, destination, options, transform = (contents) => contents) {
  console.log(`${options.dryRun ? 'would install' : 'installed'} ${destination}`);
  if (options.dryRun) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const contents = transform(fs.readFileSync(source, 'utf8'));
  fs.writeFileSync(destination, contents, 'utf8');
}

function copyDirectory(source, destination, options) {
  console.log(`${options.dryRun ? 'would install' : 'installed'} ${destination}`);
  if (options.dryRun) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true });
}

function removePath(target, options) {
  if (!fs.existsSync(target)) return;
  console.log(`${options.dryRun ? 'would remove' : 'removed'}   ${target}`);
  if (!options.dryRun) fs.rmSync(target, { recursive: true, force: true });
}

function listDirectories(source) {
  return fs.readdirSync(source, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function listFiles(source, suffix) {
  return fs.readdirSync(source, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => entry.name)
    .sort();
}

function renderModelConfig(contents, catalogPath) {
  const placeholder = '__ZAI_MODEL_CATALOG__';
  if (!contents.includes(placeholder)) {
    throw new Error(`missing ${placeholder} in a Codex agent/profile template`);
  }
  return contents.replaceAll(placeholder, catalogPath.replaceAll('\\', '\\\\').replaceAll('"', '\\"'));
}

function removeProviderTables(contents) {
  const output = [];
  let skipping = false;

  for (const line of contents.split(/\r?\n/)) {
    const header = line.trim().match(/^\[([^\]]+)\](?:\s*#.*)?$/);
    if (header) {
      const name = header[1];
      skipping = name === 'model_providers.zai' || name.startsWith('model_providers.zai.');
    }
    if (!skipping) output.push(line);
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

function removeManagedProvider(contents) {
  const start = contents.indexOf(PROVIDER_START);
  if (start === -1) return contents;
  const end = contents.indexOf(PROVIDER_END, start);
  if (end === -1) throw new Error(`found ${PROVIDER_START} without ${PROVIDER_END}`);
  const after = end + PROVIDER_END.length;
  return `${contents.slice(0, start)}${contents.slice(after)}`
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function renderProvider(secretPath) {
  const template = fs.readFileSync(path.join(KIT_ROOT, 'provider-config.toml'), 'utf8');
  if (!template.includes('__ZAI_API_KEY_FILE__')) {
    throw new Error('missing __ZAI_API_KEY_FILE__ in the Codex provider template');
  }
  return template.replace('"__ZAI_API_KEY_FILE__"', tomlString(secretPath));
}

function updateConfig(options, secretPath) {
  if (!options.configure) return;
  const configPath = path.join(options.codexHome, 'config.toml');
  const original = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  let base = original;

  if (base.includes(PROVIDER_START)) {
    base = removeManagedProvider(base);
  } else if (/^\[model_providers\.zai(?:\.[^\]]+)?\]\s*$/m.test(base)) {
    if (!options.forceProvider) {
      throw new Error(
        `${configPath} already defines model_providers.zai outside this installer's managed block; ` +
        're-run with --force-provider after reviewing that table',
      );
    }
    base = removeProviderTables(base);
  }

  const provider = renderProvider(secretPath).trim();
  const next = `${base.trimEnd()}${base.trim() ? '\n\n' : ''}${provider}\n`;
  if (next === original) return;

  console.log(`${options.dryRun ? 'would update' : 'updated'}   ${configPath}`);
  if (options.dryRun) return;
  fs.mkdirSync(options.codexHome, { recursive: true });
  if (original) {
    const backup = `${configPath}.before-zai-${new Date().toISOString().replaceAll(':', '-')}`;
    fs.copyFileSync(configPath, backup);
    console.log(`backed up ${backup}`);
  }
  fs.writeFileSync(configPath, next, 'utf8');
}

function uninstallConfig(options) {
  if (!options.configure) return;
  const configPath = path.join(options.codexHome, 'config.toml');
  if (!fs.existsSync(configPath)) return;
  const original = fs.readFileSync(configPath, 'utf8');
  const next = removeManagedProvider(original);
  if (next === original) return;
  console.log(`${options.dryRun ? 'would update' : 'updated'}   ${configPath}`);
  if (!options.dryRun) fs.writeFileSync(configPath, `${next}\n`, 'utf8');
}

function environmentSecret() {
  const value = process.env.ZAI_API_KEY;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function secureExistingSecret(secretPath, options) {
  const metadata = fs.lstatSync(secretPath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error('the existing Z.ai credential is not a regular file');
  }
  if (!fs.readFileSync(secretPath, 'utf8').trim()) {
    throw new Error('the existing Z.ai credential is empty');
  }
  if (!options.dryRun) fs.chmodSync(secretPath, 0o600);
  console.log(`${options.dryRun ? 'would reuse' : 'reused'} existing Z.ai credential`);
}

function installSecret(options) {
  const secretDirectory = path.join(options.codexHome, 'secrets');
  const secretPath = path.join(secretDirectory, 'zai-api-key');

  if (fs.existsSync(secretPath)) {
    secureExistingSecret(secretPath, options);
    return secretPath;
  }

  const secret = environmentSecret();
  if (!secret) {
    throw new Error(
      'ZAI_API_KEY is required for the first install; later installs reuse the stored credential',
    );
  }

  if (options.dryRun) {
    console.log('would store Z.ai credential securely');
    return secretPath;
  }

  fs.mkdirSync(secretDirectory, { recursive: true, mode: 0o700 });
  const directoryMetadata = fs.lstatSync(secretDirectory);
  if (!directoryMetadata.isDirectory() || directoryMetadata.isSymbolicLink()) {
    throw new Error("Codex's local secrets location is not a regular directory");
  }
  fs.chmodSync(secretDirectory, 0o700);
  fs.writeFileSync(secretPath, secret, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  fs.chmodSync(secretPath, 0o600);
  console.log('stored Z.ai credential securely');
  return secretPath;
}

function install(options) {
  const agentSource = path.join(KIT_ROOT, 'agents');
  const profileSource = path.join(KIT_ROOT, 'profiles');
  const skillSource = path.join(PLUGIN_ROOT, 'skills');
  const catalogSource = path.join(KIT_ROOT, 'model-catalogs', 'zai-models.json');
  const catalogDestination = path.join(options.codexHome, 'model-catalogs', 'zai-models.json');
  const secretPath = installSecret(options);

  copyFile(catalogSource, catalogDestination, options);
  removePath(path.join(options.codexHome, 'bin', 'zai-credential.js'), options);

  for (const filename of listFiles(agentSource, '.toml')) {
    copyFile(
      path.join(agentSource, filename),
      path.join(options.codexHome, 'agents', filename),
      options,
      (contents) => renderModelConfig(contents, catalogDestination),
    );
  }

  for (const filename of listFiles(profileSource, '.config.toml')) {
    copyFile(
      path.join(profileSource, filename),
      path.join(options.codexHome, filename),
      options,
      (contents) => renderModelConfig(contents, catalogDestination),
    );
  }

  for (const directory of listDirectories(skillSource)) {
    copyDirectory(path.join(skillSource, directory), path.join(options.skillsHome, directory), options);
  }

  updateConfig(options, secretPath);

  console.log('\nDone. Restart the Codex app or start a new Codex session.');
}

function uninstall(options) {
  const agentSource = path.join(KIT_ROOT, 'agents');
  const profileSource = path.join(KIT_ROOT, 'profiles');
  const skillSource = path.join(PLUGIN_ROOT, 'skills');

  for (const filename of listFiles(agentSource, '.toml')) {
    removePath(path.join(options.codexHome, 'agents', filename), options);
  }
  for (const filename of listFiles(profileSource, '.config.toml')) {
    removePath(path.join(options.codexHome, filename), options);
  }
  for (const directory of listDirectories(skillSource)) {
    removePath(path.join(options.skillsHome, directory), options);
  }
  removePath(path.join(options.codexHome, 'model-catalogs', 'zai-models.json'), options);
  // Clean up the helper installed by older versions. The secret is intentionally preserved.
  removePath(path.join(options.codexHome, 'bin', 'zai-credential.js'), options);
  uninstallConfig(options);
  if (fs.existsSync(path.join(options.codexHome, 'secrets', 'zai-api-key'))) {
    console.log('preserved existing Z.ai credential');
  }
  console.log('\nDone. Restart the Codex app or start a new Codex session.');
}

function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
    if (!options) return;
    if (options.mode === 'uninstall') uninstall(options);
    else install(options);
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { main };

if (require.main === module) main();
