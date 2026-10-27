FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Expose HTTP API (4000) and GPS TCP Socket (5001)
EXPOSE 4000
EXPOSE 5001

CMD ["node", "dist/index.js"]
