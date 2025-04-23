const nodemailer = require("nodemailer");
const fs = require("fs");

// Transporter básico usando una cuenta de Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Función para enviar el correo
async function sendCalendarLinkEmail(toEmail, calendarLink) {
  const mailOptions = {
    from: '"Wellness Flow" <wellssflow@gmail.com>',
    to: toEmail,
    subject: "Tu cita ha sido reservada - Añádela a tu calendario",
    html: `
      <h2>Gracias por tu reserva</h2>
      <p>Puedes añadirla a tu Google Calendar con este enlace:</p>
      <a href="${calendarLink}" target="_blank">${calendarLink}</a>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✉️ Correo enviado:", info.response);
  } catch (error) {
    console.error("❌ Error al enviar el correo:", error);
  }
}

// ✅ NUEVA función para enviar archivo ICS adjunto
async function sendICSCalendarEmail(toEmail, filePath, fileName) {
  const mailOptions = {
    from: '"Wellness Flow" <wellssflow@gmail.com>',
    to: toEmail,
    subject: "Tu reserva en Wellness Flow - Añádela a tu calendario",
    html: `
      <h2>Gracias por tu reserva</h2>
      <p>Adjunto encontrarás el archivo para añadir tu cita a tu calendario.</p>
    `,
    attachments: [
      {
        filename: fileName,
        path: filePath,
        contentType: "text/calendar",
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📩 Correo con .ics enviado:", info.response);
  } catch (error) {
    console.error("❌ Error al enviar correo con .ics:", error);
  } finally {
    // 🧹 Limpieza del archivo temporal
    try {
      fs.unlinkSync(filePath);
      console.log("🧹 Archivo .ics eliminado:", filePath);
    } catch (deleteError) {
      console.error("❌ Error al borrar archivo .ics:", deleteError);
    }
  }
}
module.exports = { sendCalendarLinkEmail, sendICSCalendarEmail };
