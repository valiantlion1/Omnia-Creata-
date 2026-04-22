import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
}

const BUNDLES = {
  'guest-core': ['/landing', '/subscription', '/login', '/signup', '/help'],
  'auth-core': ['/explore', '/create', '/chat', '/subscription', '/account', '/settings'],
  'auth-library': ['/library/images', '/library/projects', '/library/likes', '/library/trash'],
  'auth-full': [
    '/explore',
    '/create',
    '/chat',
    '/subscription',
    '/account',
    '/settings',
    '/library/images',
    '/library/projects',
    '/library/likes',
    '/library/trash',
    '__PROJECT_DETAIL__',
  ],
}

const PROTECTED_ROUTE_PREFIXES = [
  '/create',
  '/chat',
  '/account',
  '/settings',
  '/library/images',
  '/library/projects',
  '/library/likes',
  '/library/trash',
  '/projects/',
]

const PROOF_BRIDGE_NAME = '__OMNIA_STUDIO_PROOF__'

function parseArgs(argv) {
  const options = {
    baseUrl: 'http://127.0.0.1:5173',
    route: null,
    viewport: 'desktop',
    session: null,
    outputDir: path.join('output', 'playwright', 'studio-proof'),
    label: null,
    auth: null,
    plan: 'free',
    bundle: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    const next = argv[index + 1]

    if (token === '--route' && next) {
      options.route = next
      index += 1
      continue
    }
    if (token === '--base-url' && next) {
      options.baseUrl = next
      index += 1
      continue
    }
    if (token === '--viewport' && next) {
      options.viewport = next
      index += 1
      continue
    }
    if (token === '--session' && next) {
      options.session = next
      index += 1
      continue
    }
    if (token === '--output-dir' && next) {
      options.outputDir = next
      index += 1
      continue
    }
    if (token === '--label' && next) {
      options.label = next
      index += 1
      continue
    }
    if (token === '--auth' && next) {
      options.auth = next
      index += 1
      continue
    }
    if (token === '--plan' && next) {
      options.plan = next
      index += 1
      continue
    }
    if (token === '--bundle' && next) {
      options.bundle = next
      index += 1
      continue
    }
    if (token === '--help' || token === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  if (!VIEWPORTS[options.viewport]) {
    throw new Error(`Unknown viewport "${options.viewport}". Use desktop or mobile.`)
  }

  if (!['free', 'creator', 'pro'].includes(options.plan)) {
    throw new Error(`Unknown plan "${options.plan}". Use free, creator, or pro.`)
  }

  if (options.bundle && !BUNDLES[options.bundle]) {
    throw new Error(`Unknown bundle "${options.bundle}".`)
  }

  if (options.auth && !['guest', 'demo'].includes(options.auth)) {
    throw new Error(`Unknown auth mode "${options.auth}". Use guest or demo.`)
  }

  if (!options.bundle && !options.route) {
    options.route = '/subscription'
  }

  options.auth = resolveAuthMode(options)
  return options
}

function printHelp() {
  console.log(`Usage: node ./tools/browserProof.mjs [options]

Options:
  --route /subscription               Verify a single route
  --bundle guest-core|auth-core|auth-library|auth-full
  --auth guest|demo                  Defaults to guest for public routes, demo for protected bundles
  --plan free|creator|pro            Defaults to free when auth=demo
  --base-url http://127.0.0.1:5173
  --viewport desktop|mobile          Defaults to desktop
  --session studio-proof             Optional explicit session name
  --output-dir output/playwright/studio-proof
  --label subscription-check         Optional artifact label
`)
}

function normalizeRoute(route) {
  if (/^https?:\/\//i.test(route)) return route
  return route.startsWith('/') ? route : `/${route}`
}

function resolveAuthMode(options) {
  if (options.auth) return options.auth
  if (options.bundle && options.bundle.startsWith('auth-')) return 'demo'
  if (options.route && requiresAuth(options.route)) return 'demo'
  return 'guest'
}

function buildUrl(baseUrl, route) {
  if (/^https?:\/\//i.test(route)) return route
  return new URL(normalizeRoute(route), baseUrl).toString()
}

function buildSlug(value) {
  return (value || 'proof')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function runPw(args, { allowFailure = false, raw = false } = {}) {
  const fullArgs = ['--yes', '--package', '@playwright/cli', 'playwright-cli', ...args]
  if (raw) fullArgs.push('--raw')
  const result = spawnSync('npx', fullArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })

  if (result.status !== 0 && !allowFailure) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    throw new Error(details || `playwright-cli ${args.join(' ')} failed`)
  }

  return {
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
    status: result.status ?? 0,
  }
}

function sleep(delayMs) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs)
}

function parseRawScalar(value) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return ''
  try {
    return JSON.parse(normalized)
  } catch {
    return normalized
  }
}

function pageEval(session, functionSource) {
  return parseRawScalar(
    runPw(['-s', session, 'eval', JSON.stringify(functionSource)], { raw: true }).stdout,
  )
}

function parseConsoleCount(output) {
  const match = String(output ?? '').match(/Returning\s+(\d+)\s+messages/i)
  if (match) return Number(match[1])
  return 0
}

function requiresAuth(route) {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => normalizeRoute(route).startsWith(prefix))
}

function waitForPageCondition(session, functionSource, predicate, label, timeoutMs = 8_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const value = pageEval(session, functionSource)
    if (predicate(value)) return value
    sleep(100)
  }
  throw new Error(`Timed out while waiting for ${label}.`)
}

function waitForProofBridge(session) {
  return waitForPageCondition(
    session,
    `() => Boolean(window.${PROOF_BRIDGE_NAME}) && window.${PROOF_BRIDGE_NAME}.isReady()`,
    Boolean,
    'the Studio proof bridge',
    12_000,
  )
}

function callProofBridge(session, expression, label) {
  return waitForPageCondition(
    session,
    expression,
    (value) => value !== null && value !== undefined && value !== '',
    label,
  )
}

function buildRoutePlan(options) {
  const baseRoutes = options.bundle ? [...BUNDLES[options.bundle]] : [normalizeRoute(options.route)]
  return baseRoutes.map((route) => {
    if (route === '__PROJECT_DETAIL__') {
      return {
        route,
        kind: 'project-detail',
        expected: 'project-route',
        requiresAuth: true,
      }
    }
    return {
      route: normalizeRoute(route),
      kind: 'route',
      expected: options.auth === 'guest' && requiresAuth(route) ? 'login-redirect' : 'exact-route',
      requiresAuth: requiresAuth(route),
    }
  })
}

function resolveRouteViaBridge(session, routePlan, options) {
  if (routePlan.kind === 'project-detail') {
    const project = callProofBridge(
      session,
      `async () => window.${PROOF_BRIDGE_NAME}.ensureProjectRoute("Browser proof project")`,
      'a seeded project route',
    )
    return { route: project.route, metadata: project }
  }

  if (options.auth === 'demo') {
    callProofBridge(
      session,
      `async () => window.${PROOF_BRIDGE_NAME}.navigate(${JSON.stringify(routePlan.route)})`,
      `SPA navigation to ${routePlan.route}`,
    )
    return { route: routePlan.route, metadata: null }
  }

  runPw(['-s', session, 'goto', buildUrl(options.baseUrl, routePlan.route)])
  return { route: routePlan.route, metadata: null }
}

function readCurrentState(session) {
  const resolvedUrl = pageEval(session, '() => window.location.href')
  const title = pageEval(session, '() => document.title')
  const pathname = pageEval(
    session,
    '() => ({ pathname: window.location.pathname, search: window.location.search })',
  )
  return {
    resolvedUrl: String(resolvedUrl || ''),
    title: String(title || ''),
    pathname: pathname?.pathname ?? '',
    search: pathname?.search ?? '',
  }
}

function captureConsole(session) {
  const consoleErrors = runPw(['-s', session, 'console', 'error'], { raw: true }).stdout
  const consoleWarnings = runPw(['-s', session, 'console', 'warning'], { raw: true }).stdout
  return {
    consoleErrors,
    consoleWarnings,
    consoleErrorCount: parseConsoleCount(consoleErrors),
    consoleWarningCount: parseConsoleCount(consoleWarnings),
  }
}

function screenshotPathFor(outputDirAbs, runSlug, routeSlug, viewport) {
  return path.join(outputDirAbs, `${runSlug}-${routeSlug}-${viewport}.png`)
}

function summaryPathFor(outputDirAbs, runSlug, routeSlug, viewport) {
  return path.join(outputDirAbs, `${runSlug}-${routeSlug}-${viewport}.json`)
}

function routeSlug(route) {
  const normalized = normalizeRoute(route)
    .replace(/^\//, '')
    .replace(/[/?&#=]+/g, '-')
  return buildSlug(normalized || 'root')
}

function determinePass(routePlan, resolvedPathname, consoleErrorCount) {
  if (consoleErrorCount > 0) return false
  if (routePlan.expected === 'project-route') return resolvedPathname.startsWith('/projects/')
  if (routePlan.expected === 'login-redirect') return resolvedPathname === '/login'
  return resolvedPathname === routePlan.route
}

function ensureFreshSession(session) {
  runPw(['-s', session, 'close'], { allowFailure: true })
}

function collectSnapshot(session) {
  return runPw(['-s', session, 'snapshot'], { raw: true }).stdout
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const viewport = VIEWPORTS[options.viewport]
  const routePlan = buildRoutePlan(options)
  const runSlug = buildSlug(
    options.label ||
      `${options.bundle || routeSlug(options.route)}-${options.auth}${options.auth === 'demo' ? `-${options.plan}` : ''}`,
  )
  const session = options.session || `studio-proof-${runSlug}-${options.viewport}`
  const outputDirAbs = path.resolve(process.cwd(), options.outputDir)
  const manifestPath = path.join(outputDirAbs, `${runSlug}-${options.viewport}-manifest.json`)

  mkdirSync(outputDirAbs, { recursive: true })
  ensureFreshSession(session)

  const initialRoute = options.auth === 'demo' ? '/subscription' : routePlan[0].route
  const initialUrl = buildUrl(options.baseUrl, initialRoute)
  const results = []

  try {
    runPw(['-s', session, 'open', initialUrl])
    runPw(['-s', session, 'resize', String(viewport.width), String(viewport.height)])

    if (options.auth === 'demo') {
      waitForProofBridge(session)
      callProofBridge(
        session,
        `async () => window.${PROOF_BRIDGE_NAME}.demoLogin(${JSON.stringify(options.plan)}, "Proof ${options.plan}")`,
        'a demo Studio login',
      )
    }

    for (const entry of routePlan) {
      const resolvedTarget = resolveRouteViaBridge(session, entry, options)
      const currentState = readCurrentState(session)
      const routeKey = entry.kind === 'project-detail' ? routeSlug(resolvedTarget.route) : routeSlug(entry.route)
      const screenshotAbs = screenshotPathFor(outputDirAbs, runSlug, routeKey, options.viewport)
      const summaryAbs = summaryPathFor(outputDirAbs, runSlug, routeKey, options.viewport)
      const screenshotRelative = path.relative(process.cwd(), screenshotAbs)
      const snapshot = collectSnapshot(session)
      runPw(['-s', session, 'screenshot', '--filename', screenshotRelative])
      const consoleState = captureConsole(session)
      const pass = determinePass(entry, currentState.pathname, consoleState.consoleErrorCount)

      const summary = {
        route: entry.route,
        route_kind: entry.kind,
        target_route: resolvedTarget.route,
        resolved_url: currentState.resolvedUrl,
        resolved_pathname: currentState.pathname,
        resolved_search: currentState.search,
        title: currentState.title,
        auth: options.auth,
        plan: options.auth === 'demo' ? options.plan : null,
        viewport: options.viewport,
        width: viewport.width,
        height: viewport.height,
        expected: entry.expected,
        pass,
        console_error_count: consoleState.consoleErrorCount,
        console_warning_count: consoleState.consoleWarningCount,
        console_errors: consoleState.consoleErrors,
        console_warnings: consoleState.consoleWarnings,
        screenshot: screenshotAbs,
        snapshot,
        metadata: resolvedTarget.metadata,
      }

      writeFileSync(summaryAbs, JSON.stringify(summary, null, 2))
      results.push({
        route: entry.route,
        targetRoute: resolvedTarget.route,
        resolvedUrl: currentState.resolvedUrl,
        auth: options.auth,
        plan: options.auth === 'demo' ? options.plan : null,
        viewport: options.viewport,
        pass,
        consoleErrorCount: consoleState.consoleErrorCount,
        consoleWarningCount: consoleState.consoleWarningCount,
        screenshot: screenshotAbs,
        summary: summaryAbs,
      })
    }
  } finally {
    runPw(['-s', session, 'close'], { allowFailure: true })
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    bundle: options.bundle,
    auth: options.auth,
    plan: options.auth === 'demo' ? options.plan : null,
    viewport: options.viewport,
    baseUrl: options.baseUrl,
    routes: results,
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`Saved browser proof manifest: ${path.relative(process.cwd(), manifestPath)}`)
  console.log(`Routes checked: ${results.length}`)
  console.log(`Failed routes: ${results.filter((entry) => !entry.pass).length}`)
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}

