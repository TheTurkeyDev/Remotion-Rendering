FROM node:lts-slim
ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN apt update -y
RUN apt install git -y
RUN npm install --production

COPY output/. ./

CMD [ "node", "rest.js" ]