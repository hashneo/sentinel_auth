FROM mhart/alpine-node:latest

#bash is used to run npm test inside the container
RUN apk update && apk upgrade && apk --update add bash && rm -rf /var/cache/apk/*
RUN apk add --update go git

WORKDIR /src
ADD . .

RUN npm install

EXPOSE 5000
CMD ["node", "app.js"]