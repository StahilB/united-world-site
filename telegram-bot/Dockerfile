FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY index.js parser.js strapi-client.js utils.js docx-parser.js ./
COPY Шаблон_статьи_АНО_Единый_Мир.docx ./
CMD ["node", "index.js"]
