# Usa la imagen oficial de Node.js como imagen base
FROM node:20

# Crear y cambiar al directorio de la aplicación
WORKDIR /usr/src/app

# Instalar las dependencias de Puppeteer
RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libatspi2.0-0 \  # Añadido
  libcairo2 \  # Añadido
  libcups2 \
  libdbus-1-3 \
  libdrm2 \  # Añadido
  libexpat1 \
  libfontconfig1 \
  libglib2.0-0 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \  # Añadido
  libpangocairo-1.0-0 \  # Añadido
  libstdc++6 \  # Añadido
  libx11-6 \  # Añadido
  libx11-xcb1 \
  libxcb-dri3-0 \  # Añadido
  libxcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxshmfence1 \  # Añadido
  libxss1 \  # Añadido
  libxtst6 \  # Añadido
  xdg-utils \
  --no-install-recommends && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de la aplicación
COPY . .

# Exponer el puerto en el que la aplicación se ejecutará
EXPOSE 8080

# Comando para iniciar la aplicación
CMD [ "npm","run", "start" ]