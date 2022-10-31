FROM node:lts-slim
ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY output/. ./

CMD [ "node", "render.js" ]