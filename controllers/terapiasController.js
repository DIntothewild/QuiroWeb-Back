const Terapia = require("../models/terapia");

// Crear una nueva terapia
const createTerapia = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      duration,
      comentarios,
      tipoDeMasaje,
      zonaDelCuerpo,
      type,
    } = req.body;

    // Verificar que todos los campos requeridos están presentes
    if (
      !name ||
      !description ||
      price === undefined ||
      duration === undefined
    ) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios." });
    }

    const newTerapia = new Terapia({
      name,
      description,
      price,
      duration,
      comentarios: comentarios || [],
      tipoDeMasaje: type === "quiromasaje" ? tipoDeMasaje : null,
      zonaDelCuerpo: type === "osteopatia" ? zonaDelCuerpo : null,
    });

    await newTerapia.save();
    res.status(201).json(newTerapia);
  } catch (error) {
    console.error("Error al crear la terapia:", error);
    res.status(500).json({ message: "Error interno del servidor.", error });
  }
};

// Obtener todas las terapias
const getAllTerapias = async (req, res) => {
  try {
    const terapias = await Terapia.find();
    res.status(200).json(terapias);
  } catch (error) {
    console.error("Error al obtener terapias:", error);
    res.status(500).json({ message: "Error interno del servidor.", error });
  }
};

// Obtener una terapia por ID
const getTerapiaById = async (req, res) => {
  try {
    const terapia = await Terapia.findById(req.params.id);
    if (!terapia) {
      return res.status(404).json({ message: "Terapia no encontrada." });
    }
    res.status(200).json(terapia);
  } catch (error) {
    console.error("Error al obtener la terapia:", error);
    res.status(500).json({ message: "Error interno del servidor.", error });
  }
};

// Actualizar una terapia
const updateTerapia = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      duration,
      comentarios,
      tipoDeMasaje,
      zonaDelCuerpo,
      type,
    } = req.body;

    if (
      !name &&
      !description &&
      price === undefined &&
      duration === undefined &&
      !comentarios &&
      !tipoDeMasaje &&
      !zonaDelCuerpo
    ) {
      return res
        .status(400)
        .json({
          message: "Debes proporcionar al menos un campo para actualizar.",
        });
    }

    const updatedTerapia = await Terapia.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price,
        duration,
        comentarios,
        tipoDeMasaje: type === "quiromasaje" ? tipoDeMasaje : null,
        zonaDelCuerpo: type === "osteopatia" ? zonaDelCuerpo : null,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedTerapia) {
      return res.status(404).json({ message: "Terapia no encontrada." });
    }

    res.status(200).json(updatedTerapia);
  } catch (error) {
    console.error("Error al actualizar la terapia:", error);
    res.status(500).json({ message: "Error interno del servidor.", error });
  }
};

// Eliminar una terapia
const deleteTerapia = async (req, res) => {
  try {
    const deletedTerapia = await Terapia.findByIdAndDelete(req.params.id);
    if (!deletedTerapia) {
      return res.status(404).json({ message: "Terapia no encontrada." });
    }
    res.status(200).json({ message: "Terapia eliminada correctamente." });
  } catch (error) {
    console.error("Error al eliminar la terapia:", error);
    res.status(500).json({ message: "Error interno del servidor.", error });
  }
};

// Exportar las funciones del controlador
module.exports = {
  createTerapia,
  getAllTerapias,
  getTerapiaById,
  updateTerapia,
  deleteTerapia,
};
