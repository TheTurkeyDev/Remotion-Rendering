FROM node:lts-slim
ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN apt install git ffmpeg chromium-swiftshader -y
RUN npm install --omit=dev

COPY output/. ./

CMD [ "node", "rest.js" ]