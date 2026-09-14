#!/usr/bin/env bash
#
# QuantPulse pre-deployment gate.
#
# Runs the same checks Vercel will run, in the same order, so a red build is
# caught here rather than in production. Only pushes if everything passes.
#
#   ./deploy.sh                 check, then commit and push
#   ./deploy.sh --check-only    run the checks and stop
#   ./deploy.sh --clean-install full npm ci (stop the dev server first on Windows)
#   ./deploy.sh -m "message"    use a specific commit message
#
# On Windows run this from Git Bash, or use:  npm run check
set -Eeuo pipefail

BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'
YELLOW=$'\033[33m'; DIM=$'\033[2m'; RESET=$'\033[0m'

step()  { printf '\n%s▸ %s%s\n' "$BOLD" "$1" "$RESET"; }
ok()    { printf '%s  ✓ %s%s\n' "$GREEN" "$1" "$RESET"; }
warn()  { printf '%s  ! %s%s\n' "$YELLOW" "$1" "$RESET"; }
die()   { printf '\n%s  ✗ %s%s\n\n' "$RED" "$1" "$RESET" >&2; exit 1; }

trap 'die "Failed at line $LINENO. Nothing was pushed."' ERR

CHECK_ONLY=false
CLEAN_INSTALL=false
COMMIT_MSG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --check-only) CHECK_ONLY=true; shift ;;
    --clean-install) CLEAN_INSTALL=true; shift ;;
    -m|--message) COMMIT_MSG="${2:-}"; shift 2 ;;
    -h|--help)    sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

cd "$(dirname "$0")"

# --- 1. Environment ----------------------------------------------------------
step "Environment"
command -v node >/dev/null 2>&1 || die "node not found on PATH."
command -v git  >/dev/null 2>&1 || die "git not found on PATH."
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 20 ] || die "Node 20+ required (found $(node -v)). Vercel builds on 20/22."
ok "node $(node -v), npm $(npm -v)"

# --- 2. Secret scan ----------------------------------------------------------
# Cheap guard against the classic mistake: a real .env committed by accident.
step "Secret scan"
if git ls-files --error-unmatch .env .env.local >/dev/null 2>&1; then
  die ".env or .env.local is tracked by git. Remove it: git rm --cached .env.local"
fi
if git grep -nIE '(sk_live_|pk_live_|-----BEGIN [A-Z ]*PRIVATE KEY)' -- \
     ':!*.example' ':!DEPLOYMENT.md' ':!deploy.sh' >/dev/null 2>&1; then
  warn "Possible live secret in tracked files — review before pushing:"
  git grep -nIE '(sk_live_|pk_live_|-----BEGIN [A-Z ]*PRIVATE KEY)' -- \
     ':!*.example' ':!DEPLOYMENT.md' ':!deploy.sh' || true
  die "Refusing to push."
fi
ok "no tracked secrets found"

# --- 3. Dependencies ---------------------------------------------------------
# Vercel installs with `npm ci`, so the lockfile must resolve cleanly. A real
# `npm ci` deletes node_modules first, which fails on Windows whenever the dev
# server holds a file lock — so validate with --dry-run by default and keep the
# destructive version behind a flag.
step "Dependencies"
if [ ! -f package-lock.json ]; then
  die "No package-lock.json. Vercel cannot run 'npm ci'. Run: npm install && git add package-lock.json"
fi

if $CLEAN_INSTALL; then
  if ! npm ci --no-audit --no-fund; then
    die "npm ci failed. If this is EPERM on Windows, stop the dev server first."
  fi
  ok "npm ci (full clean install)"
else
  npm ci --dry-run --no-audit --no-fund >/dev/null
  ok "lockfile resolves cleanly (same install Vercel will run)"
fi

# --- 4. Static analysis ------------------------------------------------------
step "Type check"
npm run typecheck
ok "no TypeScript errors"

step "Lint"
npm run lint
ok "no lint errors"

# --- 5. Production build -----------------------------------------------------
step "Production build"
NODE_ENV=production npm run build
ok "build succeeded"

if $CHECK_ONLY; then
  printf '\n%s✓ All checks passed. (--check-only, nothing pushed)%s\n\n' "$GREEN" "$RESET"
  exit 0
fi

# --- 6. Commit and push ------------------------------------------------------
step "Publish"
git remote get-url origin >/dev/null 2>&1 || die "No 'origin' remote configured."

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ -z "$(git status --porcelain)" ]; then
  ok "working tree clean, nothing new to commit"
else
  git add -A
  if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Deploy: $(date '+%Y-%m-%d %H:%M')"
  fi
  git commit -m "$COMMIT_MSG"
  ok "committed: $COMMIT_MSG"
fi

printf '%s  pushing %s -> origin/%s%s\n' "$DIM" "$BRANCH" "$BRANCH" "$RESET"
git push -u origin "$BRANCH"

printf '\n%s✓ Pushed. Vercel will build automatically.%s\n' "$GREEN" "$RESET"
printf '%s  Watch it: https://vercel.com/dashboard%s\n\n' "$DIM" "$RESET"
