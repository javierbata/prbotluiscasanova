import { Router } from "express";
import expressWs from 'express-ws';
import config from "../config.js";
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger.js'; // Importa el logger
import {
  renderAboutPage,
  renderIndexPage,
  renderNewEntryPage,
  createNewEntry,
  apiejemplo,
  bdconsulta,
  deleteBook,
} from "../controllers/index.controller.js";
import whatsappWebController from '../controllers/whatsappwebcontroller.js';
import exchangeRateController from '../controllers/exchangeratecontroller.js';
import currencyController from '../controllers/currencycontroller.js';

const router = Router();
expressWs(router); // Configura express-ws en el router
router.get("/", (req, res) => {
  logger.info("Accessed / route");
  renderIndexPage(req, res);
});

router.get("/about", (req, res) => {
  logger.info("Accessed /about route");
  renderAboutPage(req, res);
});

router.get("/new-entry", (req, res) => {
  logger.info("Accessed /new-entry route");
  renderNewEntryPage(req, res);
});
router.get('/api/ejemplo', (req, res) => {
  logger.info("Accessed /api/ejemplo route");
  apiejemplo(req, res);
});
router.post("/new-entry", (req, res) => {
  logger.info("Accessed POST /new-entry route");
  createNewEntry(req, res);
});



router.get('/exchangerate/all', (req, res) => {
   exchangeRateController.getAllExchangeRates(req, res);
 
});

router.get('/exchangerate/id', (req, res) => {
  exchangeRateController.getExchangeRateById(req, res);

});

// Ruta para desconectar el cliente de WhatsApp Web
router.post('/disconnect', async (req, res) => {
  try {
    await whatsappWebController.disconnect();
    await whatsappWebController.deleteSession(); // Eliminar archivos de sesión
    res.status(200).json({ message: 'Client disconnected and session deleted successfully' });
  } catch (error) {
    logger.error('Error disconnecting client:', error);
    res.status(500).json({ message: 'Error disconnecting client and deleting session', error: error.message });
  }
});

// Ruta para reinicializar el cliente de WhatsApp Web y generar un nuevo QR
router.post('/reinitialize', async (req, res) => {
  try {
    await whatsappWebController.reinitializeClient();
    res.status(200).json({ message: 'Client reinitialized successfully' });
  } catch (error) {
    logger.error('Error reinitializing client:', error);
    res.status(500).json({ message: 'Error reinitializing client', error: error.message });
  }
});




// Ruta para obtener el estado del cliente
router.get('/status', (req, res) => {
  const status = whatsappWebController.getStatus();
  res.status(200).json({ status });
});

// Ruta para obtener el QR del cliente
router.get('/qr', async (req, res) => {
  console.log("adasds")
  try {
    const qrCodeDataUrl = await whatsappWebController.getQRCode();
    res.status(200).json({ qrCode: qrCodeDataUrl });
  } catch (error) {
    logger.error('Error getting QR code:', error);
    res.status(500).json({ message: 'Error getting QR code', error: error.message });
  }
});


router.get('/download-log', (req, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const logFilePath = path.join(__dirname, '../../logs', 'combined.log'); // Ruta al archivo de log
  res.download(logFilePath, 'combined.log', (err) => {
    if (err) {
      logger.error('Error al descargar el archivo de log:', err);
      res.status(500).send('Error al descargar el archivo de log');
    } else {
      logger.info("Log file downloaded successfully");
    }
  });
});

const url = config.BACKENDNUBE;  // URL del endpoint de tu aplicación
const interval = 300000;  // Intervalo de tiempo en milisegundos (5 minutos)

const keepAlive = async () => {
  try {
    const response = await fetch(url);
    logger.info(`Keep-alive ping status: ${response.status}`);
  } catch (error) {
    logger.error(`Keep-alive ping error: ${error.message}`);
  }
};

// Ejecuta el keepAlive cada 5 minutos
setInterval(keepAlive, interval);

// Llama al keepAlive inmediatamente al iniciar la aplicación
keepAlive();

export default router;
