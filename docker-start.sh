#!/bin/sh
set -e

# mod_php requires mpm_prefork. The base image can end up with a second MPM
# enabled, which makes Apache refuse to start ("More than one MPM loaded").
# Force only mpm_prefork at runtime so it's guaranteed regardless of build cache.
a2dismod mpm_event mpm_worker >/dev/null 2>&1 || true
a2enmod  mpm_prefork          >/dev/null 2>&1 || true

PORT="${PORT:-8080}"
echo "start.sh: active MPM -> $(ls /etc/apache2/mods-enabled/ 2>/dev/null | grep mpm_ | tr '\n' ' ')"
echo "start.sh: starting Apache on port ${PORT}"

# Railway routes to $PORT; point Apache's listener + vhost at it.
sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/:80>/:${PORT}>/"           /etc/apache2/sites-available/000-default.conf

exec apache2-foreground
