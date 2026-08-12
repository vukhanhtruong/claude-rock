#!/bin/sh
# new-lead-dashboard v2
cd "$(dirname "$0")" && exec node scripts/serve.mjs "$@"
