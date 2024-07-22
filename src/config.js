import { config } from "dotenv";
config();
const datebase = 'api-remesas-lc'
//const datebase = 'jaenvios'
export default {
  PORT: process.env.PORT || 5000,
  APPID: process.env.APPID || "",
  BD: {
    user: 'javierbata',
    password: 'Bata20103011',
    server: 'remesas-lc.database.windows.net',
    database: datebase,
    options: {
      encrypt: true, // Si estás utilizando Azure, establece esto en true
    },
  },

  
  BACKENDNUBE:  "https://api-remesas-lc.azurewebsites.net",
  BACKENDLOCAL: "http://localhost:5000"

};
