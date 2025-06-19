# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY WebApps/Shopping.React/package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY WebApps/Shopping.React/ ./

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy build files to nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY WebApps/Shopping.React/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]