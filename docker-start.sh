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

# One-time seed of the uploads volume from the live site (only when empty).
# Once the volume holds the photos, this is skipped on every future boot.
UPLOADS=/var/www/html/uploads
SEED_URL="https://www.lowcountrybusinessspotlight.com/_seed_uploads_9f3c1a7b42.tgz"
set +e
if [ ! -d "$UPLOADS/business_photos" ]; then
    echo "start.sh: uploads empty -> seeding from live site"
    if curl -fsSL --max-time 300 "$SEED_URL" -o /tmp/seed.tgz; then
        tar xzf /tmp/seed.tgz -C /var/www/html && chown -R www-data:www-data "$UPLOADS"
        rm -f /tmp/seed.tgz
        echo "start.sh: uploads seeded ($(find "$UPLOADS" -type f 2>/dev/null | wc -l) files)"
    else
        echo "start.sh: WARN seed download failed; continuing without photos"
    fi
else
    echo "start.sh: uploads already seeded ($(find "$UPLOADS" -type f 2>/dev/null | wc -l) files) -> skip"
fi
set -e

exec apache2-foreground
