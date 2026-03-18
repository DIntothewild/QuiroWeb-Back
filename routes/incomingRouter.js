// routes/incomingRouter.js
const express = require("express");
const { handleIncomingMessage } = require("../controllers/incomingController");

const router = express.Router();

router.post("/whatsapp", handleIncomingMessage);

module.exports = router;