import express from "express";
import path from "path";
import morgan from "morgan";
import routes from "./routes/index.js";
import bodyParser from 'body-parser';
import multer from 'multer';
import azureStrogare from 'azure-storage';
import getStream from 'into-stream';
import expressWs from 'express-ws';

import config from "./config.js";
import configENV from "./configENV.js";
import {fileURLToPath} from "url";

const app = express();

expressWs(app); // Configura express-ws con la aplicación Express
const __dirname = path.dirname(fileURLToPath(import.meta.url));



// Settings
app.set("port", config.PORT);
app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs");

app.use(bodyParser.json({ limit: '50mb' }));
// Middlewares
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));



const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({storage: inMemoryStorage}).single('image')


//const blobService = azureStrogare.createBlobService("DefaultEndpointsProtocol=https;AccountName=jaenvioswebstorageimagen;AccountKey=hEO06KvLdbQGX5USMRL1/wbW/hVBzw4uT1VkLAZ16+fl19pU+nWIOBWLBAuRZ82m2lBLg3sjl4QO+AStFpX+Jg==;EndpointSuffix=core.windows.net"); //jala del .ENV
const containerName= 'Imagenes';

const getBlobName = originalName => {

  const identifier = Math.random().toString().replace(/0\./, '');
  return '${identifier}-${originalName}';

};



// global variables
app.use((req, res, next) => {
  console.log(config.APPID)
  app.locals.APPID = config.APPID;
  next();
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});


app.use(routes);

app.use(express.static(path.join(__dirname, "public")));

// 404 handler
app.use((req, res, next) => {
  res.status(404).render("404");
});

export default app;
