# Development stage
FROM node:22-alpine AS development
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3020
CMD ["npm", "run", "start:dev"]


# Production build stage
FROM node:22-alpine AS build
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS production
WORKDIR /usr/src/app

RUN npm install -g pm2

COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

COPY --from=build /usr/src/app/dist ./dist

COPY ecosystem.config.js .

EXPOSE 3020

CMD ["pm2-runtime", "ecosystem.config.js"]