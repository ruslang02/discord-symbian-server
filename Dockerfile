FROM node:alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
EXPOSE 8080
VOLUME /app/ssl
CMD ["node", "."]
