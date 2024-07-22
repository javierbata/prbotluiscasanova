import qrcode from 'qrcode';
import Whatsapp from 'whatsapp-web.js';
import { Client } from 'whatsapp-web.js';
import logger from '../logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import exchangeRateController from '../controllers/exchangeratecontroller.js';
import currencyController from '../controllers/currencycontroller.js';
import { response } from 'express';
import currencycontroller from '../controllers/currencycontroller.js';
import exchangeRateJson from '../public/exchangeRate.json' assert { type: "json" };


const { LocalAuth } = Whatsapp;

let client;

class WhatsAppWebController {
  constructor() {
    this.isAuthenticated = false;
    this.qrCodeDataUrl = null; // Variable para almacenar el QR actual
    this.isInitialize = false; // Variable para almacenar el QR actual
    this.initialize();
  }

  initialize() {
    client = new Client({
      authStrategy: new LocalAuth({ dataPath: "sessions" }),
      puppeteer: {
        headless: true, // Puedes cambiar esto a false para depuración
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2322.15.html',
      },
    });

    client.on('qr', async (qr) => {
      console.log("aqui 2")
      try {
        if (!this.isAuthenticated) {
          console.log("aqui 3")
          this.qrCodeDataUrl = await qrcode.toDataURL(qr); // Almacena el QR actual
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
        logger.error('Error generating QR code:', error);
      }
    });

    client.on('ready', () => {
      console.log('Client is ready!');
      logger.info('WhatsApp client is ready!');
    });

    client.on('authenticated', () => {
      console.log('Client is authenticated!');
      logger.info('WhatsApp client is authenticated!');
      this.isAuthenticated = true;
      this.qrCodeDataUrl = null; // Borra el QR una vez autenticado
    });

    client.on('auth_failure', (msg) => {
      console.error('Authentication failure:', msg);
      logger.error('WhatsApp authentication failure:', msg);
      this.isAuthenticated = false;
    });

    client.on('disconnected', (reason) => {
      try{console.log('Client was logged out', reason);
      logger.info('WhatsApp client was logged out:', reason);
      this.isAuthenticated = false;
      this.qrCodeDataUrl = null; // Borra el QR al desconectarse
      // Wait a bit before reinitializing to avoid rapid loops

      console.log("por aqui discont")
      setTimeout(() => {
        this.reinitializeClient();
      }, 5000);

    } catch (error) {
      console.error('Error during client was logged out:', error);
      logger.error('Error during client was logged out:', error);
      // Retry initialization after a delay
      setTimeout(() => {
        this.reinitializeClient();
      }, 5000);
      throw new Error('QR code not available');
    }
    });

    client.on('change_state', state => {
      console.log('CHANGE STATE', state);
      logger.info('WhatsApp client state changed:', state);
    });

    client.on('message', message => {

      console.log(message.body)

      let messageArray = message.body.split(' ');
      
      if(message.body[0]=="/"){
  
        if(["/tasa", "/tasas" ].some(element =>message.body.toLowerCase().includes(element))){
      
          console.log(this.getMesaggeCurrencyAll(message));
        
        }

        const codesKeys = Object.keys(exchangeRateJson.codes);


        let foundKey = codesKeys.find(element => message.body[1].toLowerCase().includes(element.toLowerCase()));


        console.log(foundKey)
        
        if (foundKey && messageArray[0].length <= 2) {
          // Obtener el objeto correspondiente a la clave encontrada
          let selectedObject = exchangeRateJson.codes[foundKey];
          
          this.postMessageExchangeRate(message,selectedObject)

     
        }
      
        if(["/dolar","/ves","/pesos","/soles"].some(element =>messageArray[0].toLowerCase().includes(element))){
     
          this.getCalculatedRate(message)

        }
        if(["/help"].some(element =>message.body.toLowerCase().includes(element))){
        
        }
  
      }

  
    })


    client.on('error', (err) => {
      console.error('WhatsApp client error:', err);
      logger.error('WhatsApp client error:', err);
      this.isAuthenticated = false;
      // Handle the error or reinitialize if necessary
      setTimeout(() => {
        this.reinitializeClient();
      }, 5000);
    });

    this.reinitializeClient();
  }

  async reinitializeClient() {
    try {
      console.log("aqui 1")
      // Reinitialize client without attempting to logout
      if(!this.isInitialize){
        console.log("entro en  reinitializeClient")
      await client.initialize();
      this.isInitialize= true;
      }
    } catch (error) {
      console.error('Error during client initialization:', error);
      logger.error('Error during client initialization:', error);
      // Retry initialization after a delay
      setTimeout(() => {
        this.reinitializeClient();
      }, 5000);
    }
  }

  async disconnect() {
    try {
      if (client.pupPage) {
        await client.destroy(); // Destroy the client to close the session
        this.isAuthenticated = false;
        this.isInitialize= false;
      }
    } catch (error) {
      console.error('Error during client disconnection:', error);
      logger.error('Error during client disconnection:', error);
      throw error;
    }
  }

  getStatus() {
    return this.isAuthenticated ? 'authenticated' : 'disconnected';
  }

  async getQRCode() {
    if (this.isAuthenticated) {
      throw new Error('Client is already authenticated');
    }else{
      if(this.getStatus() === 'disconnected' ) {
        await this.reinitializeClient();
        return this.qrCodeDataUrl
      }
    }
      
    if (!this.qrCodeDataUrl) {
      throw new Error('QR code not available');
    }
   
    return this.qrCodeDataUrl;
  }

  
  
 getExchangeRateAll = async (message) => {
    try {


      let exchangeRateAll
      // Simula los objetos req y res
      const req = {}; // Simula el objeto req si es necesario
      const res = {
        status: (statusCode) => ({
          json: (response) => {
          //  console.log('Response:', response); // Maneja la respuesta aquí

          exchangeRateAll = response;

          }
        })
      };

      await exchangeRateController.getAllExchangeRates(req, res);
  

      return exchangeRateAll;

    } catch (error) {
      console.error('Error during getExchangeRateAll:', error);
      logger.error('Error during getExchangeRateAll :', error);
      // Retry initialization after a delay si es necesario
    }
  };

  getCurrencyAll = async () => {
    try {
      // Simula los objetos req y res
      let currencyAll;
      const req = {}; // Simula el objeto req si es necesario
      const res = {
        status: (statusCode) => ({
          json: (response) => {
          //  console.log('Response:', response); // Maneja la respuesta aquí
          currencyAll = response.result;
          }
        })
      };
      await currencycontroller.getAllCurrencies(req, res);

      return currencyAll;
    } catch (error) {
      console.error('Error during getCurrencyAll:', error);
      logger.error('Error during getCurrencyAll :', error);
      // Retry initialization after a delay si es necesario
    }
  };

  getExchangeRateById = async (sourceCurrencyID,targetCurrencyID) => {
    try {
      console.log(" EN" + sourceCurrencyID + " Va " + targetCurrencyID)

      let exchangeRateById
      // Simula los objetos req y res
      const req = {
        query:{
        sourceCurrencyID : sourceCurrencyID, targetCurrencyID: targetCurrencyID
      }
  
    
    }; // Simula el objeto req si es necesario
      const res = {
        status: (statusCode) => ({
          json: (response) => {
          //  console.log('Response:', response); // Maneja la respuesta aquí

          exchangeRateById = response;

          }
        })
      };

      await exchangeRateController.getExchangeRateById(req, res);
  

      return exchangeRateById;

    } catch (error) {
      console.error('Error during getExchangeRateById:', error);
      logger.error('Error during getExchangeRateById :', error);
      // Retry initialization after a delay si es necesario
    }
  };


  getMesaggeCurrencyAll = async (message) => {
  try {
    const response = await this.getCurrencyAll();

    let text = "📊 *Tasas Actuales* 📊  \n\n";
    text += " *Tasas para Bss (VES)🇻🇪* 📊  \n\n";

    // Crear un array de promesas
    const promises = [
      this.pares('SOL','VES', 'A) 🌞 Sol', response),         // 1
      this.pares('USD_PE','VES', 'B) 💲Peru', response),       // 2
      this.pares('USD_PAR','VES' ,'C) 💲Paralelo', response),  // 3
      this.pares('USD_ZEL','VES' ,'D) 💲Zelle', response),     // 4
      this.pares('COL','VES' ,'E) 💰Pesos', response),        // 5
      this.pares('USD_ZEL','COL' ,'F) 💲Zelle', response),        // 6
      this.pares('SOL','COL','G) 🌞 Sol', response),         //7
      this.pares('USD_ZEL','SOL','H) 💲Zelle', response),       // 8
      this.pares('USD_PE','SOL','I) 💲Peru', response),         // 9
      this.pares('USD_ZEL','USD_PE','J) 🇵🇪🇨🇴', response),        // 10
    ];

    // Ejecutar todas las promesas en paralelo y esperar a que todas se resuelvan
    const results = await Promise.all(promises);

    // Concatenar los resultados en el texto final
    text += results[0];
    text += results[1];
    text += results[2];
    text += results[3];
    text += results[4];
    text += "\n\ *Tasas para Pesos (COL)🇨🇴* 📊  \n\n";
    text += results[5];
    text += results[6];
    
    text += "\n\ *Tasas para Soles (SOL7)🇵🇪* 📊  \n\n";
    text += results[7];
    text += results[8];
    text += results[9];
    //text += results[10];


    console.log(text);

    message.reply(text);

  } catch (error) {
    console.error('Error during getMesaggeCurrencyAll:', error);
    logger.error('Error during getMesaggeCurrencyAll :', error);
    // Retry initialization after a delay si es necesario
  }
}

  getCalculatedRate  = async (message) => {

    let messageArray = message.body.split(' ');

    let optionsArray = ['/dolar','/sol','/ves','/pesos'];

    const response = await this.getCurrencyAll();

    let text = "";
    let promises= []
    let results= []
 
                for(let i = 0; i < optionsArray.length; i++){
                 
                if( messageArray[0].toLowerCase().includes(optionsArray[i])){

                  let arr;
                    switch (optionsArray[i]) {
                     
                      case '/dolar':
                      
                  
                       break;
   
                       case '/pesos':
                        text += " *Tasas para Pesos (COP)🇨🇴*   \n\n";

                         promises = [
                          this.pares('USD_ZEL','COL', '🔷 💲Peru', response,true),         // 1
                          this.pares('SOL','COL', '🔶 🌞 Sol', response,true),       // 2


                        ];


                         results = await Promise.all(promises);

                        text += results[0].text;
                        text += results[1].text;


                        console.log(text)

                        text += "\n💱 Moneda - > VES \n\n";

                      //  text += "Enviar " +results[0].text;
                        
                        text +=transformTextMultiply(messageArray[1],"$ (Zelle) ",results[0].rate," Pesos")
                        text +=transformTextMultiply(messageArray[1],"S/ ",results[1].rate," Pesos")
    

                        text += "\n💱 VES - > Moneda \n\n";

                      //  text += "Enviar " +results[0].text;
                        
                        text +=transformTextDivide(messageArray[1], " Pesos",results[0].rate," $ (Zelle)")
                        text +=transformTextDivide(messageArray[1]," Pesos",results[1].rate," S/")
                
                        message.reply(text)
                      break;
               
                     
                      break;
                      
                      case '/ves':
                        text += " *Tasas para Bss (VES)🇻🇪*   \n\n";

                         promises = [
                          this.pares('SOL','VES', '🔷 🌞 Sol', response,true),         // 1
                          this.pares('USD_PE','VES', '🔶 💲Peru', response,true),       // 2
                          this.pares('USD_PAR','VES' ,'🔷 💲Paralelo', response,true),  // 3
                          this.pares('USD_ZEL','VES' ,'🔶 💲Zelle', response,true),     // 4
                          this.pares('COL','VES' ,'🔷 💰Pesos', response,true)      // 5

                        ];


                         results = await Promise.all(promises);

                        text += results[0].text;
                        text += results[1].text;
                        text += results[2].text;
                        text += results[3].text;
                        text += results[4].text;

                        console.log(text)

                        text += "\n💱 Moneda - > VES \n\n";

                      //  text += "Enviar " +results[0].text;
                        
                        text +=transformTextMultiply(messageArray[1],"S/ ",results[0].rate," VES")
                        text +=transformTextMultiply(messageArray[1],"$ (Peru) ",results[1].rate," VES")
                        text +=transformTextMultiply(messageArray[1],"$ (Paralelo) ",results[2].rate," VES")
                        text +=transformTextMultiply(messageArray[1],"$ (Zelle) ",results[3].rate," VES")
                        text +=transformTextMultiply(messageArray[1]," (Pesos)",results[4].rate," VES")


                        text += "\n💱 VES - > Moneda \n\n";

                      //  text += "Enviar " +results[0].text;
                        
                        text +=transformTextDivide(messageArray[1], " VES",results[0].rate," S/")
                        text +=transformTextDivide(messageArray[1]," VES",results[1].rate," $ (Peru)")
                        text +=transformTextDivide(messageArray[1]," VES",results[2].rate," $ (Paralelo) ")
                        text +=transformTextDivide(messageArray[1]," VES",results[3].rate," $ (Zelle) ")
                        text +=transformTextDivide(messageArray[1]," VES",results[4].rate," (Pesos)")

                        message.reply(text)
                      break;
                }
              }
            }


            function transformTextMultiply(amount,textOne,rate,textTwo){

              const resultPrice = (parseFloat(amount) * parseFloat(rate)).toFixed(2)

              return "Enviar "+amount+textOne +"Serian: *" + resultPrice+ "* "+textTwo+"\n"

            }
            function transformTextDivide(amount,textOne,rate,textTwo){

              const resultPrice = (parseFloat(amount) / parseFloat(rate)).toFixed(2)

              return "Para recibir "+amount+textOne +" Debes enviar: *" + resultPrice+ "* "+textTwo+"\n"

            }
  }

  postExchangeRate = async (sourceCurrencyID,targetCurrencyID,rate,comment) => {
    try {
  
      let exchangeRate
      // Simula los objetos req y res
      const req = {
        body:{
        sourceCurrencyID : sourceCurrencyID,
        targetCurrencyID: targetCurrencyID,
        rate:rate,
        comment:comment,
        createdBy:1
      }

    
    }; // Simula el objeto req si es necesario
      const res = {
        status: (statusCode) => ({


          json: (response) => {
          //  console.log('Response:', response); // Maneja la respuesta aquí
          console.log(statusCode)
          exchangeRate = response;

          }
        })
      };

      await exchangeRateController.postExchangeRate(req, res);


      return exchangeRate;

    } catch (error) {
      console.error('Error during postExchangeRate:', error);
      logger.error('Error during postExchangeRate :', error);
      // Retry initialization after a delay si es necesario
    }
  };



  async pares(codeOne, codeTwo, emoji, response,validator) {
    let nameOne, nameTwo, sourceCurrencyID, targetCurrencyID;
  
    response.forEach(itemCurrency => {
      if (itemCurrency.Code === codeOne) {
        sourceCurrencyID = itemCurrency.CurrencyID;
        nameOne = itemCurrency.Name;
      }
      if (itemCurrency.Code === codeTwo) {
        targetCurrencyID = itemCurrency.CurrencyID;
        nameTwo = itemCurrency.Name;
      }
    });
  
    if (!sourceCurrencyID || !targetCurrencyID) {
      return ""
     // throw new Error('No se encontraron las monedas con los códigos proporcionados.');
    }
  
    try {
      const responseExchangeRateById = await this.getExchangeRateById(sourceCurrencyID, targetCurrencyID);
      console.log(responseExchangeRateById);

      const rate = responseExchangeRateById.result.Rate
      const comment = responseExchangeRateById.result.Comment

      if(validator && validator === true){
        return {rate:rate,comment:comment,text: emoji + " *"+parseFloat(rate).toFixed(2)+"* : *"+comment+"*"+ "\n"}
      }

      return emoji + " *"+parseFloat(rate).toFixed(2)+"* : *"+comment+"*"+ "\n";
    } catch (error) {
      console.error('Error al obtener la tasa de cambio:', error);
      return ""
   //   throw error;  // Re-lanzar el error para que pueda ser manejado por el llamador
    }
  }

  async postMessageExchangeRate(message,selectedObject){


    const response = await this.getCurrencyAll();

    const messageChat = message.body
    let rate=0,comment="" ,sourceCurrencyID,targetCurrencyID;


    let messageArray = messageChat.split(' ');
    console.log (messageArray)

    if(messageArray[1]){
      rate = messageArray[1].replace(/[^0-9.,]/g, '')
    }

    if(messageArray.length >=3 ){
      let arr =  messageArray
    arr.shift();
    arr.shift();

    comment =arr.join(" ");
    }

    response.forEach(itemCurrency => {
      if (itemCurrency.Code === selectedObject.sourceCurrencyCode) {
        sourceCurrencyID = itemCurrency.CurrencyID;
        
      }
      if (itemCurrency.Code === selectedObject.targetCurrencyCode) {
        targetCurrencyID = itemCurrency.CurrencyID;
   
      }
    });
    
    console.log(selectedObject)
    console.log(sourceCurrencyID + " : " + targetCurrencyID + " : " + rate + " :  " + comment)
  

    const result =await this.postExchangeRate(sourceCurrencyID,targetCurrencyID,rate,comment)
  
    console.log(result)

    if(result.result){
      message.reply("✅ Tasa registrada existosamente *" + rate+"*")
    }else{
      message.reply("❌ Ocurrio un error al registrar la tasa ")
    }
    



   
    
  }



  async deleteSession() {
    try {
      const sessionPath = path.join(__dirname, '../../sessions');
      await fs.rm(sessionPath, { recursive: true, force: true });
      this.isInitialize= false;
      
      console.log(`Deleted session files: ${sessionPath}`);
      logger.info(`Deleted session files: ${sessionPath}`);
    } catch (error) {
      console.error('Error deleting session files:', error);
      logger.error('Error deleting session files:', error);
      throw error;
    }
  }
  






}
const whatsappWebController = new WhatsAppWebController();
export default whatsappWebController;
