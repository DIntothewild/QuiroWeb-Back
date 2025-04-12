const mongoose = require("mongoose");

const mongodbConnection = async () => {
  mongoose.set("strictQuery", false);
  const uri = process.env.MONGODB_URI;
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

module.exports = mongodbConnection;
