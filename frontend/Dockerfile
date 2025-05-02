# frontend/Dockerfile
FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy frontend files into nginx html directory
COPY . /usr/share/nginx/html
