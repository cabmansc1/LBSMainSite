# Railway deployment image for Lowcountry Business Spotlight
# Matches the cPanel runtime: PHP 8.1 + Apache, with gd (jpeg/png/webp) and MySQL.
FROM php:8.1-apache

# --- PHP extensions ---
# gd (with jpeg/webp/freetype) for image resizing; pdo_mysql + mysqli for the DB.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libjpeg62-turbo-dev \
        libpng-dev \
        libwebp-dev \
        libfreetype6-dev \
        unzip \
    && docker-php-ext-configure gd --with-jpeg --with-webp --with-freetype \
    && docker-php-ext-install -j"$(nproc)" gd pdo_mysql mysqli \
    && rm -rf /var/lib/apt/lists/*

# --- Composer (for stripe/stripe-php) ---
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# --- Apache: keep only mpm_prefork (mod_php needs it; the base image enables an
#     extra MPM which triggers "More than one MPM loaded"), enable mod_rewrite,
#     and allow the site's .htaccess to take effect ---
RUN a2dismod mpm_event mpm_worker 2>/dev/null || true; \
    a2enmod mpm_prefork rewrite \
    && sed -ri 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

WORKDIR /var/www/html
COPY . /var/www/html

# Install PHP deps (vendor/ is gitignored, so it is built here). Don't fail the
# image build if composer has a transient hiccup; the app degrades gracefully.
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress || true \
    && chown -R www-data:www-data /var/www/html

# Railway routes to $PORT if set, otherwise to the EXPOSEd port (8080).
# Apache honors $PORT, defaulting to 8080 so both paths line up.
RUN printf '#!/bin/sh\nset -e\nPORT="${PORT:-8080}"\necho "Starting Apache on port ${PORT}"\nsed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf\nsed -ri "s/:80>/:${PORT}>/" /etc/apache2/sites-available/000-default.conf\nexec apache2-foreground\n' > /usr/local/bin/start.sh \
    && chmod +x /usr/local/bin/start.sh

EXPOSE 8080

CMD ["/usr/local/bin/start.sh"]
