#!/usr/bin/env node

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const command = args[0] || 'all'

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
}

function log(type, message) {
  const prefix = {
    info: `${colors.cyan}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
  }
  console.log(`${prefix[type]} ${message}`)
}

function runCommand(cmd, args) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: true })
    proc.on('exit', (code) => {
      resolve(code)
    })
  })
}

async function runTests() {
  log('info', 'Starting test suite...\n')

  let exitCode = 0

  switch (command) {
    case 'unit':
      log('info', 'Running unit tests...')
      exitCode = await runCommand('npm', ['run', 'test'])
      break

    case 'e2e':
      log('info', 'Running E2E tests...')
      exitCode = await runCommand('npm', ['run', 'e2e'])
      break

    case 'e2e:ui':
      log('info', 'Running E2E tests with UI...')
      exitCode = await runCommand('npm', ['run', 'e2e:ui'])
      break

    case 'lint':
      log('info', 'Running linter...')
      exitCode = await runCommand('npm', ['run', 'lint'])
      break

    case 'coverage':
      log('info', 'Running tests with coverage...')
      exitCode = await runCommand('npm', ['run', 'test:coverage'])
      if (exitCode === 0) {
        log('success', 'Coverage report generated!')
        log('info', 'Open coverage/lcov-report/index.html to view')
      }
      break

    case 'all':
      log('info', 'Running complete test suite (lint + unit + E2E)...\n')
      
      log('info', 'Step 1/3: Running linter...')
      exitCode = await runCommand('npm', ['run', 'lint'])
      if (exitCode !== 0) {
        log('error', 'Linting failed! Fix errors and try again.')
        process.exit(1)
      }
      log('success', 'Linting passed!\n')

      log('info', 'Step 2/3: Running unit tests...')
      exitCode = await runCommand('npm', ['run', 'test'])
      if (exitCode !== 0) {
        log('error', 'Unit tests failed! Check output above.')
        process.exit(1)
      }
      log('success', 'Unit tests passed!\n')

      log('info', 'Step 3/3: Running E2E tests...')
      exitCode = await runCommand('npm', ['run', 'e2e'])
      if (exitCode !== 0) {
        log('warn', 'Some E2E tests failed. Check the output above.')
      } else {
        log('success', 'E2E tests passed!')
      }
      break

    default:
      log('error', `Unknown command: ${command}`)
      console.log(`
Available commands:
  unit       - Run unit tests only
  e2e        - Run E2E tests only
  e2e:ui     - Run E2E tests with visual UI
  lint       - Run linter only
  coverage   - Run tests with coverage report
  all        - Run everything (default)
      `)
      process.exit(1)
  }

  console.log('\n')
  if (exitCode === 0) {
    log('success', 'All tests passed!')
  } else {
    log('error', 'Some tests failed. See output above for details.')
  }

  process.exit(exitCode)
}

runTests().catch((err) => {
  log('error', err.message)
  process.exit(1)
})
