FROM node:20-alpine
ENV NODE_ENV=production TZ=Asia/Jerusalem
RUN apk add --no-cache tzdata
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY index.js logic.js recurring.js prices.js receipt.js ./
CMD ["node", "index.js"]
