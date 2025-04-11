// controllers/bookingController.js
const { procesarReserva } = require("../services/bookingServices");

const createBooking = async (req, res) => {
  // Log para ver qué llega desde el frontend
  console.log("➡️  Recibido en createBooking:", req.body);

  const { customerName, terapiasType, dateTime, status } = req.body;

  // Validaciones mínimas (ahora incluye dateTime)
  if (!customerName || !terapiasType || !dateTime || !status) {
    console.warn("⚠️  Faltan campos obligatorios:", {
      customerName,
      terapiasType,
      dateTime,
      status,
    });
    return res
      .status(400)
      .send({ error: "Faltan campos obligatorios en la reserva." });
  }

  try {
    const resultado = await procesarReserva(req.body);
    res.status(201).send(resultado);
  } catch (error) {
    console.error("❌ Error en createBooking:", error.message);
    console.error("📌 STACK TRACE:", error.stack);
    res.status(400).send({ error: error.message });
  }
};

// --- EL RESTO DE FUNCIONES SIGUEN IGUAL ---
const Booking = require("../models/booking");

const getAllBookings = async (req, res) => {
  try {
    const { date, terapiasType } = req.query;
    let query = {};
    if (date) query.date = date;
    if (terapiasType) query.terapiasType = terapiasType;
    const bookings = await Booking.find(query);
    console.log(
      "getAllBookings ->",
      query,
      "->",
      bookings.length,
      "resultados"
    );
    res.status(200).send(bookings);
  } catch (error) {
    console.error("Error en getAllBookings:", error);
    res.status(400).send({ error });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).send();
    res.status(200).send(booking);
  } catch (error) {
    console.error(error);
    res.status(400).send({ error });
  }
};

const updateBooking = async (req, res) => {
  try {
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updatedBooking) return res.status(404).send();
    res.status(200).send(updatedBooking);
  } catch (error) {
    console.error(error);
    res.status(400).send({ error });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const deletedBooking = await Booking.findByIdAndDelete(req.params.id);
    if (!deletedBooking) return res.status(404).send();
    res.status(200).send(deletedBooking);
  } catch (error) {
    console.error(error);
    res.status(400).send({ error });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
};
