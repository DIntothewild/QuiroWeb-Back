// models/booking.js
// models/booking.js
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  terapiasType: { type: String, required: true }, // "Quiromasaje", "Osteopatía", etc.
  tipoMasaje: { type: String, required: false }, // Puede guardar un string u objeto en JSON
  date: { type: String, required: true }, // "YYYY-MM-DD"
  time: { type: String, required: true }, // "HH:MM"
  status: {
    type: String,
    enum: ["booked", "completed", "cancelled"],
    default: "booked",
  },
  comentario: { type: String, required: false }, // Texto adicional
});

module.exports = mongoose.model("Booking", bookingSchema);
