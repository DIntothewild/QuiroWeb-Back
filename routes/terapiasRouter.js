const express = require("express");
const {
  createTerapia,
  getAllTerapias,
  getTerapiaById,
  getTerapiaByType,   // ← nueva
  updateTerapia,
  deleteTerapia,
} = require("../controllers/terapiasController");

const terapiasRouter = express.Router();

terapiasRouter.post("/", createTerapia); // POST para crear un nuevo terapia
terapiasRouter.get("/", getAllTerapias); // GET para obtener todos los terapias
terapiasRouter.get("/:id", getTerapiaById); // GET para obtener un terapia por ID
terapiasRouter.get("/type/:type", getTerapiaByType); // GET para obtener terapias por tipo
terapiasRouter.put("/:id", updateTerapia); // PUT para actualizar un terapia por ID
terapiasRouter.delete("/:id", deleteTerapia); // DELETE para eliminar un terapia por ID

module.exports = terapiasRouter;
