FROM php:8.3-apache

# mod_rewrite for the extensionless URL routing in .htaccess, matching the
# real IONOS Apache host; AllowOverride All so .htaccess is actually read
# (the base image ships with AllowOverride None).
RUN a2enmod rewrite \
    && sed -ri -e 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf \
    && docker-php-ext-install pdo pdo_mysql

# DocumentRoot is the parent of api/ so requests keep their real /api/...
# path, matching how the same files are served from the IONOS webspace root.
COPY . /var/www/html/api/
