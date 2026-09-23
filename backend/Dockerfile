FROM node:20-alpine AS build

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY nest-cli.json tsconfig*.json ./
COPY src ./src

RUN npm run build


FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./

# Instalamos también las devDependencies porque el seed utiliza ts-node
RUN npm install

COPY prisma ./prisma

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["node", "dist/src/main.js"]