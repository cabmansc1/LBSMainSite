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
        curl \
        ca-certificates \
    && docker-php-ext-configure gd --with-jpeg --with-webp --with-freetype \
    && docker-php-ext-install -j"$(nproc)" gd pdo_mysql mysqli opcache \
    && rm -rf /var/lib/apt/lists/*

# OPcache: without it every request re-parses every PHP file. Code only
# changes on image rebuild, so a 60s revalidation window is safe.
RUN { \
      echo 'opcache.enable=1'; \
      echo 'opcache.memory_consumption=128'; \
      echo 'opcache.interned_strings_buffer=16'; \
      echo 'opcache.max_accelerated_files=10000'; \
      echo 'opcache.validate_timestamps=1'; \
      echo 'opcache.revalidate_freq=60'; \
    } > /usr/local/etc/php/conf.d/zz-opcache.ini

# --- Composer (for stripe/stripe-php) ---
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# --- Apache: keep only mpm_prefork (mod_php needs it; the base image enables an
#     extra MPM which triggers "More than one MPM loaded"), enable mod_rewrite,
#     and allow the site's .htaccess to take effect ---
RUN a2dismod mpm_event mpm_worker 2>/dev/null || true; \
    a2enmod mpm_prefork rewrite headers expires \
    && sed -ri 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

WORKDIR /var/www/html
COPY . /var/www/html

# Install PHP deps (vendor/ is gitignored, so it is built here). Don't fail the
# image build if composer has a transient hiccup; the app degrades gracefully.
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress || true \
    && chown -R www-data:www-data /var/www/html

# Startup script forces mpm_prefork and binds Apache to $PORT (default 8080).
COPY docker-start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 8080

CMD ["/usr/local/bin/start.sh"]
