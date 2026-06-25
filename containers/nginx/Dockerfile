FROM nginx:1.27-alpine

# Remove default config; /etc/nginx/templates/ files are processed by
# the official nginx entrypoint via envsubst before nginx starts.
RUN rm /etc/nginx/conf.d/default.conf

COPY templates/ /etc/nginx/templates/
