import sql from 'mssql';
import config from "../config.js";
import logger from '../logger.js';

const configBD = config.BD;

class tagcontroller {

  // Método para crear una nueva etiqueta
  postTag = async (req, res) => {
    const { tagName, createdBy } = req.body;
    let pool;
    try {
      logger.info('Intentando conectar a la base de datos para registrar una etiqueta.');
      pool = await sql.connect(configBD);

      // Iniciar una transacción
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        logger.info('Iniciando transacción para registrar la etiqueta.');
        const tagID = await this.registerTagBD(transaction, tagName, createdBy);

        // Commit de la transacción
        await transaction.commit();
        logger.info(`Registro exitoso de la etiqueta con ID: ${tagID}`);
        res.status(200).json({ mensaje: 'Registro exitoso', result: { tagID } });
      } catch (innerError) {
        // Rollback en caso de error
        await transaction.rollback();
        logger.error('Error al ejecutar la transacción:', innerError);
        res.status(500).json({ mensaje: 'Error inesperado al procesar la solicitud', error: innerError.message });
      }
    } catch (error) {
      logger.error('Error al conectar con la base de datos:', error);
      res.status(500).json({ mensaje: 'Error inesperado al conectar con la base de datos', error: error.message });
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }

  async registerTagBD(transaction, tagName, createdBy) {
    const request = new sql.Request(transaction);
    request.input('tagName', sql.VarChar, tagName);
    request.input('createdBy', sql.Int, createdBy);

    const query = `INSERT INTO Tags (TagName, CreatedBy) OUTPUT INSERTED.TagID VALUES (@tagName, @createdBy)`;

    const result = await request.query(query);
    return result.recordset[0].TagID;
  }

  // Método para obtener todas las etiquetas
  getTagsAll = async (req, res) => {
    let pool;
    try {
      logger.info('Intentando obtener todas las etiquetas.');
      pool = await sql.connect(configBD);

      const request = pool.request();
      const query = `SELECT TagID, TagName, Created, CreatedBy, ModifiedBy, Modified, IsActive FROM Tags`;

      const result = await request.query(query);
      res.status(200).json({ rescode: 200, mensaje: 'Consulta de etiquetas realizada', result: result.recordset });
    } catch (err) {
      logger.error('Error al ejecutar consulta de etiquetas:', err);
      res.status(500).json({ rescode: 500, mensaje: 'Error al ejecutar consulta de etiquetas', code: err.code });
      throw err;
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  };

  // Método para obtener una etiqueta por ID
  getTagById = async (req, res) => {
    const { id } = req.query;

    if (!id) {
      logger.warn('Datos enviados incorrectamente. Falta el ID de la etiqueta.');
      res.status(400).send("Datos enviados incorrectamente");
      return;
    }
    let pool;
    try {
      logger.info(`Intentando obtener la etiqueta con ID: ${id}`);
      pool = await sql.connect(configBD);

      const request = pool.request();
      request.input('tagID', sql.Int, id);
      const query = `SELECT TagID, TagName, Created, CreatedBy, ModifiedBy, Modified, IsActive FROM Tags WHERE TagID = @tagID`;

      const result = await request.query(query);

      if (!result.recordset[0]) {
        logger.info('Etiqueta no encontrada.');
        res.status(200).json({ rescode: 200, mensaje: 'Consulta realizada, pero no se encontró la etiqueta.' });
      } else {
        res.status(200).json({ rescode: 200, mensaje: 'Consulta realizada', result: result.recordset[0] });
      }
    } catch (error) {
      logger.error('Error al obtener la etiqueta:', error);
      res.status(500).json({ mensaje: 'Error al consultar etiqueta por ID', code: error.code });
      throw error;
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  };

  // Método para actualizar una etiqueta
  updateTag = async (req, res) => {
    const { tagID, tagName, modifiedBy } = req.body;
    let pool;
    try {
      logger.info(`Intentando actualizar la etiqueta con ID: ${tagID}`);
      pool = await sql.connect(configBD);

      // Iniciar una transacción
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        logger.info('Iniciando transacción para actualizar la etiqueta.');
        const request = new sql.Request(transaction);
        request.input('tagID', sql.Int, tagID);
        request.input('tagName', sql.VarChar, tagName);
        request.input('modifiedBy', sql.Int, modifiedBy);
        request.input('modified', sql.DateTime2, ((new Date()).toISOString().slice(0, 19).replace('T', ' '))); // Ajustar la fecha al formato adecuado

        const query = `UPDATE Tags SET TagName = @tagName, ModifiedBy = @modifiedBy, Modified = @modified WHERE TagID = @tagID`;

        await request.query(query);

        // Commit de la transacción
        await transaction.commit();
        logger.info(`Actualización exitosa de la etiqueta con ID: ${tagID}`);
        res.status(200).json({ mensaje: 'Actualización exitosa' });
      } catch (innerError) {
        // Rollback en caso de error
        await transaction.rollback();
        logger.error('Error al ejecutar la transacción:', innerError);
        res.status(500).json({ mensaje: 'Error inesperado al procesar la solicitud', error: innerError.message });
      }
    } catch (error) {
      logger.error('Error al conectar con la base de datos:', error);
      res.status(500).json({ mensaje: 'Error inesperado al conectar con la base de datos', error: error.message });
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }
}

export default new tagcontroller();