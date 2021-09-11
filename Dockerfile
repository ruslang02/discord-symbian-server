FROM node:alpine
WORKDIR /app
COPY . .
RUN npm ci
EXPOSE 8080
VOLUME /app/ssl
CMD ["node", "."]
