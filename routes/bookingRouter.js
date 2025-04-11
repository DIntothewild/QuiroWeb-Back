// routes/bookingRouter.js
const express = require("express");
const {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
} = require("../controllers/bookingController");

const bookingRouter = express.Router();

bookingRouter.post("/", createBooking);
bookingRouter.get("/", getAllBookings);
bookingRouter.get("/:id", getBookingById);
bookingRouter.put("/:id", updateBooking);
bookingRouter.delete("/:id", deleteBooking);

module.exports = bookingRouter;
