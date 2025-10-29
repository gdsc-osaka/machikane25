FROM node:22-alpine

WORKDIR /usr/src/app

RUN npm install -g pnpm

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN pnpm install
# May not work these commands?
#RUN pnpm install --prod --frozen-lockfile
#RUN pnpm install -D typescript

COPY tsconfig.* ./
COPY src ./src

RUN npm run build

EXPOSE $PORT

CMD [ "npm", "start" ]
