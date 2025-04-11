const mongoose = require("mongoose");

const terapiaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true, // Elimina espacios en blanco innecesarios
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true, // Tipo de terapia (ej. relajante, osteopatía, nutrición)
    enum: [
      "relaxing",
      "therapeutic",
      "fitness",
      "deepMind",
      "holistic",
      "events",
    ], // Evita errores con valores inesperados
  },
  price: {
    type: Number,
    required: true,
    min: 0, // Evita precios negativos
  },
  duration: {
    type: Number,
    required: true,
    min: 15, // Mínimo 15 minutos
    max: 180, // Máximo 3 horas
  },
  backgroundImage: {
    type: String,
    default: "", // Ruta de la imagen (puede estar en frontend)
  },
  createdAt: {
    type: Date,
    default: Date.now, // Fecha de creación automática
  },
  comentarios: [
    {
      type: String,
      trim: true, // Se almacenan los comentarios de los usuarios
    },
  ],
  tipoDeMasaje: {
    type: String,
    trim: true,
    default: null, // Solo aplicable si la terapia es "quiromasaje"
  },
  zonaDelCuerpo: {
    type: String,
    trim: true,
    default: null, // Solo aplicable si la terapia es "osteopatia"
  },
});

module.exports = mongoose.model("Terapia", terapiaSchema);
