// controllers/incomingController.js
const twilio = require("twilio");
const { logInfo } = require("../services/logger");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const twilioPhoneNumber = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

async function handleIncomingMessage(req, res) {
  const message = req.body.Body?.toLowerCase();
  const from = req.body.From;

  logInfo(`📥 Mensaje recibido: "${message}" de ${from}`);

  if (["hola", "buenas", "hi"].includes(message)) {
    await client.messages.create({
      from: twilioPhoneNumber,
      to: from,
      body: `¡Hola! 👋 Bienvenido a Wellness Flow 🌿\n\n¿Sobre qué te gustaría consultar?\n\n1️⃣ Masaje\n2️⃣ Entrenamiento Personal\n3️⃣ Nutrición\n\nResponde con el número de la opción.`,
    });
  }

  res.sendStatus(200);
}

module.exports = { handleIncomingMessage };