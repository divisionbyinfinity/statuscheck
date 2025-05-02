# Dockerfile
FROM node:18

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y iputils-ping && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

# Ensure the config directory exists before mounting
RUN mkdir -p /usr/src/app/config

# Copy the rest of the application code (except config and node_modules)
# Remove the following line: COPY . .
COPY src ./src
COPY .env .
COPY app.js .
EXPOSE 3000

CMD ["npm", "start"]