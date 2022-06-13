FROM node:16-alpine3.15

WORKDIR /app

COPY . .

RUN npm i

EXPOSE 8545

ENTRYPOINT ["./entrypoint.sh"]
