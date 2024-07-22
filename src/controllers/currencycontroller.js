import sql from 'mssql';
import config from "../config.js";
import logger from '../logger.js';

const configBD = config.BD;

class currencycontroller {


        // Método para crear una nueva moneda
        postCurrency = async (req, res) => {
          const { code, name, createdBy } = req.body;
          let pool;
          try {
            logger.info('Connecting to the database to register a new currency.');
            pool = await sql.connect(configBD);
      
            // Iniciar una transacción
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
      
            try {
              logger.info('Starting transaction to register the currency.');
              const currencyID = await this.registerCurrencyBD(transaction, code, name, createdBy);
      
              // Commit de la transacción
              await transaction.commit();
              logger.info(`Successfully registered currency with ID: ${currencyID}`);
              res.status(200).json({ message: 'Successful registration', result: { currencyID } });
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
      
        async registerCurrencyBD(transaction, code, name, createdBy) {
          const request = new sql.Request(transaction);
          request.input('code', sql.VarChar, code);
          request.input('name', sql.VarChar, name);
          request.input('createdBy', sql.Int, createdBy);
      
          const query = `INSERT INTO Currency (Code, Name, CreatedBy) OUTPUT INSERTED.CurrencyID VALUES (@code, @name, @createdBy)`;
      
          const result = await request.query(query);
          return result.recordset[0].CurrencyID;
        }
      
        // Método para obtener todas las monedas
        getAllCurrencies = async (req, res) => {
          let pool;
          try {
            logger.info('Attempting to retrieve all currencies.');
            pool = await sql.connect(configBD);
      
            const request = pool.request();
            const query = `SELECT CurrencyID, Code, Name, Created, CreatedBy, ModifiedBy, Modified, IsActive FROM Currency`;
      
            const result = await request.query(query);
            res.status(200).json({ rescode: 200, message: 'Currency retrieval successful', result: result.recordset });
          } catch (err) {
            logger.error('Error executing currency retrieval query:', err);
            res.status(500).json({ rescode: 500, message: 'Error executing currency retrieval query', code: err.code });
            throw err;
          } finally {
            if (pool) {
              await pool.close();
            }
          }
        };
      
        // Método para obtener una moneda por ID
        getCurrencyById = async (req, res) => {
          const { id } = req.query;
      
          if (!id) {
            logger.warn('Incorrect data sent. Currency ID is missing.');
            res.status(400).send("Incorrect data sent");
            return;
          }
          let pool;
          try {
            logger.info(`Attempting to retrieve currency with ID: ${id}`);
            pool = await sql.connect(configBD);
      
            const request = pool.request();
            request.input('currencyID', sql.Int, id);
            const query = `SELECT CurrencyID, Code, Name, Created, CreatedBy, ModifiedBy, Modified, IsActive FROM Currency WHERE CurrencyID = @currencyID`;
      
            const result = await request.query(query);
      
            if (!result.recordset[0]) {
              logger.info('Currency not found.');
              res.status(200).json({ rescode: 200, message: 'Query successful, but currency not found.' });
            } else {
              res.status(200).json({ rescode: 200, message: 'Query successful', result: result.recordset[0] });
            }
          } catch (error) {
            logger.error('Error retrieving the currency:', error);
            res.status(500).json({ message: 'Error querying currency by ID', code: error.code });
            throw error;
          } finally {
            if (pool) {
              await pool.close();
            }
          }
        };
      
        // Método para actualizar una moneda
        updateCurrency = async (req, res) => {
          const { currencyID, code, name, modifiedBy } = req.body;
          let pool;
          try {
            logger.info(`Attempting to update currency with ID: ${currencyID}`);
            pool = await sql.connect(configBD);
      
            // Iniciar una transacción
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
      
            try {
              logger.info('Starting transaction to update the currency.');
              const request = new sql.Request(transaction);
              request.input('currencyID', sql.Int, currencyID);
              request.input('code', sql.VarChar, code);
              request.input('name', sql.VarChar, name);
              request.input('modifiedBy', sql.Int, modifiedBy);
              request.input('modified', sql.DateTime2, ((new Date()).toISOString().slice(0, 19).replace('T', ' '))); // Ajustar la fecha al formato adecuado
      
              const query = `UPDATE Currency SET Code = @code, Name = @name, ModifiedBy = @modifiedBy, Modified = @modified WHERE CurrencyID = @currencyID`;
      
              await request.query(query);
      
              // Commit de la transacción
              await transaction.commit();
              logger.info(`Successful update of currency with ID: ${currencyID}`);
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
export default new currencycontroller();