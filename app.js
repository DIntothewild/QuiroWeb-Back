const express = require("express");
const dotenv = require("dotenv");
const logger = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const terapiasRouter = require("./routes/terapiasRouter");
const bookingRouter = require("./routes/bookingRouter");
const mongodbConnection = require("./services/db");

// Añadimos el método config de dotenv para utilizar las variables de entorno
dotenv.config();

// Definimos el puerto y utilizamos las variables de entorno
const PORT = process.env.PORT || 3000;
// instanciamos express
const app = express();

// --- middlewares de express ---
app.use(logger("dev"));
app.use(
  cors({
    origin: ["https://quiro-web-front.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')))

// --- api middlewares --- //endpoints
app.use("/terapias", terapiasRouter);
app.use("/bookings", bookingRouter);

// Levantamos el servidor en el puerto 3000
// Conectamos con la base de datos y el servidor
const main = async () => {
  try {
    await mongodbConnection();
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log(`Server levantado en el puerto ${PORT}`);
    });
  } catch (e) {
    console.log("Error in database connection:", e.message);
  }
};

// Lanzamos el servidor
main();
