import sql from 'mssql';
import config from "../config.js";
import logger from '../logger.js';

const configBD = config.BD;

class exchangeratecontroller {

 // Método para crear una nueva tasa de cambio
 postExchangeRate = async (req, res) => {
    const { sourceCurrencyID, targetCurrencyID, rate,comment, commission, createdBy } = req.body;
    let pool;
    try {
      logger.info('Connecting to the database to register a new exchange rate.');
      pool = await sql.connect(configBD);

      // Iniciar una transacción
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        logger.info('Starting transaction to register the exchange rate.');
        const exchangeRateID = await this.registerExchangeRateBD(transaction, sourceCurrencyID, targetCurrencyID, rate,comment, commission, createdBy);


        logger.info(`Successfully registered exchange rate with ID: ${exchangeRateID}`);
        res.status(200).json({ message: 'Successful registration', result: { exchangeRateID } });
      } catch (innerError) {
        // Rollback en caso de error
        await transaction.rollback();
        logger.error('Error executing the transaction:', innerError);
        res.status(500).json({ message: 'Unexpected error processing the request', error: innerError.message });
      }
    } catch (error) {
      logger.error('Error connecting to the database:', error);
      res.status(500).json({ message: 'Unexpected error connecting to the database', error: error.message });
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }

  async registerExchangeRateBD(transaction, sourceCurrencyID, targetCurrencyID, rate, comment, commission, createdBy) {
    try{
    
    const request = new sql.Request(transaction);


    request.input('sourceCurrencyID', sql.Int, sourceCurrencyID);
    request.input('targetCurrencyID', sql.Int, targetCurrencyID);
    request.input('rate', sql.Decimal(18, 6), rate);
    request.input('createdBy', sql.Int, createdBy);

    if (commission !== undefined) {
        request.input('commission', sql.Decimal(5, 2), commission);
    }
    if (comment !== undefined) {
        request.input('comment', sql.VarChar, comment);
    }

    const query = validatorSQL(sourceCurrencyID, targetCurrencyID, rate, comment, commission);
    logger.info(`Successfully validatorSQL`);
    try {
        const result = await request.query(query);
        await transaction.commit();
        console.log("result")
        console.log(result)
        return result.recordset[0].ExchangeRateID;
    } catch (error) {
        await transaction.rollback();
        logger.error('Error registerExchangeRateBD:', error);
        throw error; // O maneja el error de acuerdo a tus necesidades
    }

  } catch (error) {
 
    logger.error('Error general registerExchangeRateBD:', error);
    throw error; // O maneja el error de acuerdo a tus necesidades
}

    function validatorSQL(sourceCurrencyID, targetCurrencyID, rate, comment, commission) {
        if (commission !== undefined && comment !== undefined) {
            return `INSERT INTO ExchangeRate (SourceCurrencyID, TargetCurrencyID, Rate, Commission, Comment, CreatedBy) OUTPUT INSERTED.ExchangeRateID VALUES (@sourceCurrencyID, @targetCurrencyID, @rate, @commission, @comment, @createdBy)`;
        } else if (commission !== undefined && comment === undefined) {
            return `INSERT INTO ExchangeRate (SourceCurrencyID, TargetCurrencyID, Rate, Commission, CreatedBy) OUTPUT INSERTED.ExchangeRateID VALUES (@sourceCurrencyID, @targetCurrencyID, @rate, @commission, @createdBy)`;
        } else if (commission === undefined && comment !== undefined) {
            return `INSERT INTO ExchangeRate (SourceCurrencyID, TargetCurrencyID, Rate, Comment, CreatedBy) OUTPUT INSERTED.ExchangeRateID VALUES (@sourceCurrencyID, @targetCurrencyID, @rate, @comment, @createdBy)`;
        } else {
            return `INSERT INTO ExchangeRate (SourceCurrencyID, TargetCurrencyID, Rate, CreatedBy) OUTPUT INSERTED.ExchangeRateID VALUES (@sourceCurrencyID, @targetCurrencyID, @rate, @createdBy)`;
        }
    }
}
  // Método para obtener todas las tasas de cambio
  getAllExchangeRates = async (req, res) => {
    let pool;
    try {
      logger.info('Attempting to retrieve all exchange rates.');
      pool = await sql.connect(configBD);

      const request = pool.request();
      const query = `SELECT ExchangeRateID, SourceCurrencyID, TargetCurrencyID, Rate, Commission,Comment, Date, Created, CreatedBy, ModifiedBy, Modified, IsActive FROM ExchangeRate`;

      const result = await request.query(query);
      res.status(200).json({ rescode: 200, message: 'Exchange rate retrieval successful', result: result.recordset });
    } catch (err) {
      logger.error('Error executing exchange rate retrieval query:', err);
      res.status(500).json({ rescode: 500, message: 'Error executing exchange rate retrieval query', code: err.code });
      throw err;
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  };

  // Método para obtener una tasa de cambio por ID
  getExchangeRateById = async (req, res) => {
    const { sourceCurrencyID,targetCurrencyID } = req.query;
    

    if (!sourceCurrencyID) {
      logger.warn('Incorrect data sent. Exchange rate ID is missing.');
      res.status(400).send("Incorrect data sent");
      return;
    }
    if (!targetCurrencyID) {
      logger.warn('Incorrect data sent. Exchange rate ID is missing.');
      res.status(400).send("Incorrect data sent");
      return;
    }
    let pool;
    try {
      logger.info(`Attempting to retrieve exchange rate with ID: ${sourceCurrencyID} and with ID: ${targetCurrencyID}`);
      pool = await sql.connect(configBD);

      const request = pool.request();
      request.input('sourceCurrencyID', sql.Int, sourceCurrencyID);
      request.input('targetCurrencyID', sql.Int, targetCurrencyID);
      const query = `SELECT TOP 1 ExchangeRateID, SourceCurrencyID, TargetCurrencyID, Rate, Commission,Comment, Created
FROM ExchangeRate
WHERE SourceCurrencyID = @sourceCurrencyID AND TargetCurrencyID = @targetCurrencyID
ORDER BY Date DESC`;

      const result = await request.query(query);

      if (!result.recordset[0]) {
        logger.info('Exchange rate not found.');
        res.status(200).json({ rescode: 200, message: 'Query successful, but exchange rate not found.' });
      } else {
        res.status(200).json({ rescode: 200, message: 'Query successful', result: result.recordset[0] });
      }
    } catch (error) {
      logger.error('Error retrieving the exchange rate:', error);
      res.status(500).json({ message: 'Error querying exchange rate by ID', code: error.code });
      throw error;
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  };

  // Método para actualizar una tasa de cambio
  updateExchangeRate = async (req, res) => {
    const { exchangeRateID, rate, commission, modifiedBy } = req.body;
    let pool;
    try {
      logger.info(`Attempting to update exchange rate with ID: ${exchangeRateID}`);
      pool = await sql.connect(configBD);

      // Iniciar una transacción
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        logger.info('Starting transaction to update the exchange rate.');
        const request = new sql.Request(transaction);
        request.input('exchangeRateID', sql.Int, exchangeRateID);
        request.input('rate', sql.Decimal(18, 6), rate);
        request.input('commission', sql.Decimal(5, 2), commission);
        request.input('modifiedBy', sql.Int, modifiedBy);
        request.input('modified', sql.DateTime2, ((new Date()).toISOString().slice(0, 19).replace('T', ' '))); // Ajustar la fecha al formato adecuado

        const query = `UPDATE ExchangeRate SET Rate = @rate, Commission = @commission, ModifiedBy = @modifiedBy, Modified = @modified WHERE ExchangeRateID = @exchangeRateID`;

        await request.query(query);

        // Commit de la transacción
        await transaction.commit();
        logger.info(`Successful update of exchange rate with ID: ${exchangeRateID}`);
        res.status(200).json({ message: 'Successful update' });
      } catch (innerError) {
        // Rollback en caso de error
        await transaction.rollback();
        logger.error('Error executing the transaction:', innerError);
        res.status(500).json({ message: 'Unexpected error processing the request', error: innerError.message });
      }
    } catch (error) {
      logger.error('Error connecting to the database:', error);
      res.status(500).json({ message: 'Unexpected error connecting to the database', error: error.message });
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }

  
  
}
export default new exchangeratecontroller();