#!/usr/bin/env node

/**
 * Wedding Memories Uploader - Deployment CLI
 *
 * Automates:
 * 1. Safe variable injection (replaces TARGET_FOLDER_ID in staging without touching git-tracked files)
 * 2. Uploading code to Google Apps Script (clasp push)
 * 3. Deploying or updating the live Web App (clasp deploy)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync, execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const STAGING_DIR = path.join(PROJECT_ROOT, '.deploy_staging');

// ANSI Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg) { console.log(msg); }
function info(msg) { console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`); }
function success(msg) { console.log(`${colors.green}✔${colors.reset} ${msg}`); }
function warn(msg) { console.log(`${colors.yellow}⚠${colors.reset} ${msg}`); }
function error(msg) { console.error(`${colors.red}✖${colors.reset} ${msg}`); }

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    folderId: null,
    scriptId: null,
    deploymentId: null,
    description: null,
    pushOnly: false,
    dryRun: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--push-only') {
      options.pushOnly = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--folder-id' || arg === '-f') {
      options.folderId = args[++i];
    } else if (arg === '--script-id' || arg === '-s') {
      options.scriptId = args[++i];
    } else if (arg === '--deployment-id' || arg === '-d') {
      options.deploymentId = args[++i];
    } else if (arg === '--message' || arg === '-m' || arg === '--description') {
      options.description = args[++i];
    } else if (arg.startsWith('--folder-id=')) {
      options.folderId = arg.split('=')[1];
    } else if (arg.startsWith('--script-id=')) {
      options.scriptId = arg.split('=')[1];
    } else if (arg.startsWith('--deployment-id=')) {
      options.deploymentId = arg.split('=')[1];
    } else if (arg.startsWith('--message=')) {
      options.description = arg.split('=')[1];
    }
  }

  return options;
}

// Simple .env parser to avoid heavy dependencies
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

function showHelp() {
  log(`
${colors.bright}${colors.cyan}Wedding Memories Uploader - Deployment CLI${colors.reset}

${colors.bright}USAGE:${colors.reset}
  npm run deploy -- [OPTIONS]
  node scripts/deploy.js [OPTIONS]

${colors.bright}OPTIONS:${colors.reset}
  ${colors.green}-f, --folder-id <id>${colors.reset}       Target Google Drive Folder ID
  ${colors.green}-s, --script-id <id>${colors.reset}       Google Apps Script Project ID
  ${colors.green}-d, --deployment-id <id>${colors.reset}   Existing Web App Deployment ID (updates in-place)
  ${colors.green}-m, --message <text>${colors.reset}       Deployment version description
  ${colors.green}    --push-only${colors.reset}             Upload code files without creating/updating deployment
  ${colors.green}    --dry-run${colors.reset}               Simulate build and print commands without uploading
  ${colors.green}-h, --help${colors.reset}                  Display this help message

${colors.bright}CONFIGURATION:${colors.reset}
  You can also save options in a ${colors.yellow}.env${colors.reset} or ${colors.yellow}.env.local${colors.reset} file in the project root:
    SCRIPT_ID=...
    TARGET_FOLDER_ID=...
    DEPLOYMENT_ID=...

${colors.bright}EXAMPLES:${colors.reset}
  ${colors.dim}# Deploy using .env configuration:${colors.reset}
  npm run deploy

  ${colors.dim}# Deploy with custom message and folder ID:${colors.reset}
  npm run deploy -- -f "1a2B3c4D5e..." -m "Multi-language release"

  ${colors.dim}# Push code changes only (skip deployment):${colors.reset}
  npm run push
`);
}

// Find clasp executable (local node_modules or global)
function getClaspCommand() {
  try {
    const claspEntry = require.resolve('@google/clasp');
    return {
      exec: process.execPath,
      baseArgs: [claspEntry],
      display: 'clasp'
    };
  } catch (e) {
    return {
      exec: 'npx',
      baseArgs: ['clasp'],
      display: 'npx clasp'
    };
  }
}

function checkClaspLogin() {
  const userHome = os.homedir();
  const claspRc = path.join(userHome, '.clasprc.json');
  return fs.existsSync(claspRc);
}

function runCommand(claspInfo, args, cwd) {
  const fullArgs = [...claspInfo.baseArgs, ...args];
  return spawnSync(claspInfo.exec, fullArgs, {
    cwd,
    stdio: 'inherit',
    shell: false
  });
}

async function main() {
  const cliArgs = parseArgs();

  if (cliArgs.help) {
    showHelp();
    process.exit(0);
  }

  log(`\n${colors.bright}${colors.cyan}💍 Wedding Memories Uploader - Deployer${colors.reset}\n`);

  // Load .env and .env.local
  const envLocal = loadEnvFile(path.join(PROJECT_ROOT, '.env.local'));
  const envDefault = loadEnvFile(path.join(PROJECT_ROOT, '.env'));
  const config = { ...envDefault, ...envLocal, ...process.env };

  const scriptId = cliArgs.scriptId || config.SCRIPT_ID;
  const folderId = cliArgs.folderId || config.TARGET_FOLDER_ID;
  const deploymentId = cliArgs.deploymentId || config.DEPLOYMENT_ID;
  const description = cliArgs.description || `Deploy ${new Date().toISOString().replace('T', ' ').substring(0, 19)}`;

  // Validate inputs
  let hasErrors = false;

  if (!scriptId || scriptId === 'your_script_id_here') {
    error('Missing SCRIPT_ID.');
    log(`  ${colors.dim}Set it in .env or pass --script-id <id>.${colors.reset}`);
    log(`  ${colors.dim}Find it at: script.google.com -> Project Settings (gear icon) -> Script ID${colors.reset}`);
    hasErrors = true;
  }

  if (!folderId || folderId === 'YOUR-GOOGLE-DRIVE-FOLDER-ID' || folderId === 'your_google_drive_folder_id_here') {
    error('Missing TARGET_FOLDER_ID.');
    log(`  ${colors.dim}Set it in .env or pass --folder-id <id>.${colors.reset}`);
    log(`  ${colors.dim}Find it in your Google Drive folder URL (drive.google.com/drive/folders/<FOLDER_ID>)${colors.reset}`);
    hasErrors = true;
  }

  if (hasErrors) {
    log(`\n${colors.yellow}Tip: Copy .env.example to .env and fill in your values, or run with --help.${colors.reset}\n`);
    process.exit(1);
  }

  if (!cliArgs.dryRun && !checkClaspLogin()) {
    warn('No Google Apps Script login session detected (~/.clasprc.json).');
    log(`  Please run: ${colors.green}npx clasp login${colors.reset} to authenticate with Google before deploying.\n`);
    process.exit(1);
  }

  info(`Apps Script ID:     ${colors.yellow}${scriptId}${colors.reset}`);
  info(`Target Folder ID:   ${colors.yellow}${folderId}${colors.reset}`);
  if (deploymentId) {
    info(`Updating Deployment: ${colors.yellow}${deploymentId}${colors.reset} (in-place update)`);
  } else {
    info(`Deployment Mode:    ${colors.yellow}${cliArgs.pushOnly ? 'Push Code Only' : 'Create New Version / Deployment'}${colors.reset}`);
  }
  info(`Description:        ${colors.dim}${description}${colors.reset}`);

  // Create staging directory
  if (fs.existsSync(STAGING_DIR)) {
    fs.rmSync(STAGING_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(STAGING_DIR, { recursive: true });

  try {
    // 1. Copy appsscript.json and Index.html
    const filesToCopy = ['appsscript.json', 'Index.html'];
    for (const file of filesToCopy) {
      const src = path.join(PROJECT_ROOT, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(STAGING_DIR, file));
      }
    }

    // 2. Read Code.gs and inject TARGET_FOLDER_ID
    const codeGsPath = path.join(PROJECT_ROOT, 'Code.gs');
    let codeGsContent = fs.readFileSync(codeGsPath, 'utf8');

    // Replace the TARGET_FOLDER_ID constant
    const folderRegex = /(const\s+TARGET_FOLDER_ID\s*=\s*['"])([^'"]*)(['"])/;
    if (!folderRegex.test(codeGsContent)) {
      throw new Error("Could not find 'const TARGET_FOLDER_ID = ...' in Code.gs");
    }

    const injectedCodeGs = codeGsContent.replace(folderRegex, `$1${folderId}$3`);
    fs.writeFileSync(path.join(STAGING_DIR, 'Code.gs'), injectedCodeGs, 'utf8');
    success('Staging prepared with injected TARGET_FOLDER_ID.');

    // 3. Write .clasp.json in staging
    const claspJson = {
      scriptId: scriptId,
      rootDir: '.'
    };
    fs.writeFileSync(path.join(STAGING_DIR, '.clasp.json'), JSON.stringify(claspJson, null, 2), 'utf8');

    // 4. Write .claspignore in staging
    const claspIgnoreContent = '**/**\n!appsscript.json\n!Code.js\n!Code.gs\n!Index.html\n';
    fs.writeFileSync(path.join(STAGING_DIR, '.claspignore'), claspIgnoreContent, 'utf8');

    const claspCmd = getClaspCommand();

    if (cliArgs.dryRun) {
      log(`\n${colors.bright}${colors.yellow}[DRY-RUN MODE] Simulation only — no files pushed:${colors.reset}`);
      log(`  1. Injected Code.gs TARGET_FOLDER_ID: ${folderId}`);
      log(`  2. Would execute: ${claspCmd.display} push --force`);
      if (!cliArgs.pushOnly) {
        if (deploymentId) {
          log(`  3. Would execute: ${claspCmd.display} deploy --deploymentId ${deploymentId} --description "${description}"`);
        } else {
          log(`  3. Would execute: ${claspCmd.display} deploy --description "${description}"`);
        }
      }
      log(`\n${colors.green}✔ Dry run completed successfully.${colors.reset}\n`);
      return;
    }

    // Push files
    info('Uploading files to Google Apps Script...');
    const pushResult = runCommand(claspCmd, ['push', '--force'], STAGING_DIR);
    if (pushResult.status !== 0) {
      throw new Error(`clasp push failed with exit code ${pushResult.status}`);
    }
    success('Code uploaded successfully.');

    // Deploy
    if (!cliArgs.pushOnly) {
      info('Deploying web app...');
      const deployArgs = ['deploy', '--description', description];
      if (deploymentId) {
        deployArgs.push('--deploymentId', deploymentId);
      }

      const deployResult = runCommand(claspCmd, deployArgs, STAGING_DIR);
      if (deployResult.status !== 0) {
        throw new Error(`clasp deploy failed with exit code ${deployResult.status}`);
      }
      success('Deployment complete!');
      if (deploymentId) {
        log(`\n${colors.bright}${colors.green}✨ Existing deployment updated in-place. Your Web App URL and QR code remain unchanged!${colors.reset}\n`);
      } else {
        log(`\n${colors.bright}${colors.green}✨ New deployment created! Check terminal output above for your Web App URL.${colors.reset}\n`);
      }
    } else {
      log(`\n${colors.bright}${colors.green}✨ Code pushed (deploy skipped due to --push-only).${colors.reset}\n`);
    }

  } finally {
    // Clean up staging directory
    if (fs.existsSync(STAGING_DIR)) {
      try {
        fs.rmSync(STAGING_DIR, { recursive: true, force: true });
      } catch (e) {
        // Ignored on cleanup
      }
    }
  }
}

main().catch((err) => {
  error(err.message || err);
  process.exit(1);
});
