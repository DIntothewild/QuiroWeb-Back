const { writeFileSync } = require("fs");
const { createEvent } = require("ics");
const path = require("path");

// Función para generar el archivo .ics
function generateICSFile(booking) {
  const [startHour, startMinute] = booking.time.split(":").map(Number);
  const [year, month, day] = booking.date.split("-").map(Number);

  const event = {
    title: `Reserva: ${booking.terapiasType}`,
    description: `Cliente: ${booking.customerName}\nComentario: ${
      booking.comentario || "Sin comentarios"
    }`,
    start: [year, month, day, startHour, startMinute],
    duration: { hours: 1 },
    status: "CONFIRMED",
    busyStatus: "BUSY",
    organizer: { name: "Wellness Flow", email: "wellssflow@gmail.com" },
  };

  return new Promise((resolve, reject) => {
    createEvent(event, (error, value) => {
      if (error) return reject(error);

      const fileName = `reserva-${booking._id}.ics`;
      const filePath = path.join(__dirname, "../temp", fileName);

      writeFileSync(filePath, value);
      resolve({ fileName, filePath });
    });
  });
}

module.exports = { generateICSFile, generateICSFile };
