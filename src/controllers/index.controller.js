import config from "../config.js";
import fs from "fs";
import { v4 } from "uuid";
import sql  from 'mssql';

const json_books = fs.readFileSync("src/books.json", "utf-8");
let books = JSON.parse(json_books);

const config_bd = {
  user: 'javierbata',
  password: 'Aaron.30',
  server: 'jaenviossql.database.windows.net',
  database: 'jaenvios',
  options: {
    encrypt: true, // Si estás utilizando Azure, establece esto en true
  },
};

export const renderIndexPage = (req, res) => res.render("index", { books });

export const renderAboutPage = (req, res) => res.render("about", config);

export const renderNewEntryPage = (req, res) => res.render("new-entry");

export  const   bdconsulta =async (req, res) => {
  sql.connect(config_bd)
  .then(() => console.log('Conexión exitosa a la base de datos'))
  .catch(error => console.error('Error al conectar a la base de datos:', error));

  try {
    // Conectar a la base de datos
    await sql.connect(config_bd);
    // Consultar datos desde la base de datos
    const result = await sql.query('SELECT * FROM encuesta');
    // Enviar datos como respuesta
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  }

};

export const apiejemplo = (req, res) => {
  res.json({ mensaje: '¡Hola desde la API!' });
};

export const createNewEntry = (req, res) => {
  const { title, author, image, description } = req.body;

  if (!title || !author || !image || !description) {
    res.status(400).send("Entries must have a title and body");
    return;
  }

  var newBook = {
    id: v4(),
    title,
    author,
    image,
    description,
  };

  // add a new book to the array
  books.push(newBook);

  // saving the array in a file
  const json_books = JSON.stringify(books);
  fs.writeFileSync("src/books.json", json_books, "utf-8");

  res.redirect("/");
};

export const deleteBook = (req, res) => {
  console.log({ books });
  books = books.filter((book) => book.id != req.params.id);

  // saving data
  const json_books = JSON.stringify(books);
  fs.writeFileSync("src/books.json", json_books);
  res.redirect("/");
};
