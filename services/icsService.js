const { writeFileSync } = require("fs");
const { createEvent } = require("ics");
const path = require("path");

// ✅ Función para generar el archivo .ics
function generateICSFile(booking) {
  const [startHour, startMinute] = booking.time?.split(":").map(Number) || [
    0, 0,
  ];

  const dateParts =
    typeof booking.date === "string"
      ? booking.date.split("-").map(Number)
      : [2025, 1, 1]; // valor por defecto si no hay fecha válida

  const [year, month, day] = dateParts;

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

module.exports = { generateICSFile };
