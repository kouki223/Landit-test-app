FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci

# Build the NestJS app
COPY . .
RUN npm run build

EXPOSE 4000
CMD ["node", "dist/main.js"]
