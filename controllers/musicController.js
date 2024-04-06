import asyncHandler from "express-async-handler";
import { Music } from "../models/musicModel.js";
import multer from "multer";
import sharp from "sharp";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename);
export const getMusics = asyncHandler(async (req, res) => {
  const data = await Music.find();
  res.status(200).send(data);
});
export const createMusic = asyncHandler(async (req, res) => {
  let required_fields = ["title", "artistName", "duration"];
  let errors = [];
  required_fields.forEach((field) => {
    if (!req.body[field]) errors.push(field + " is required!");
  });

  if (errors.length !== 0) {
    res.status(400).json({ message: errors });
  } else {
    const data = await Music.create({
      title: req.body.title,
      artistName: req.body.artistName,
      duration: req.body.duration,
      coverImage: req.files["coverImage"].originalname,
      audioFile: req.files["audioFile"].originalname,
    });
    res.status(200).json(data);
  }
});

export const processFiles = asyncHandler(async (req, res, next) => {
  req.files["coverImage"].originalname = `${Date.now()}-music`;
  req.files["audioFile"].originalname = `${Date.now()}-audio.mp3`;
  await sharp(req.files["coverImage"][0].buffer)
    .resize(3024, 4032)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(
      `${path.dirname(__dirname)}/public/img/music/${
        req.files["coverImage"].originalname
      }.jpeg`
    );
  // Convert audio buffer to file and store it
  const audioFilePath = `${path.dirname(__dirname)}/../public/audio/music/${
    req.files["audioFile"].originalname
  }`;
  fs.writeFile(
    audioFilePath,
    req.files["audioFile"][0].buffer,
    "binary",
    (err) => {
      if (err) {
        console.error("Error writing audio file:", err);
        return next(err);
      }
      next();
    }
  );
  next();
});
export const uploadFiles = asyncHandler(async (req, res, next) => {
  const multerStorage = multer.memoryStorage();
  const multerFilter = (req, file, cb) => {
    if (
      file.mimetype.startsWith("image") ||
      file.mimetype.startsWith("audio")
    ) {
      cb(null, true);
    } else {
      cb(new AppError("Please upload only image or audio files.", 400), false);
    }
  };

  const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
  }).fields([
    { name: "coverImage", maxCount: 1 },
    { name: "audioFile", maxCount: 1 },
  ]);

  upload(req, res, function (err) {
    console.log(req.files["coverImage"]);
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err);
    } else if (err) {
      return res.status(500).json(err);
    }
    next();
  });
});

export const updateMusic = asyncHandler(async (req, res) => {
  const data = await Music.findById(req.params.id);

  if (!data) {
    res.status(404).json({ message: "Music not found!" });
  } else {
    const updatedMusic = await Music.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    res.status(200).json(updatedMusic);
  }
});

export const deleteMusic = asyncHandler(async (req, res) => {
  const data = await Music.findById(req.params.id);
  const audioFilePath = `${path.dirname(__dirname)}/public/audio/music/${
    data.audioFile
  }`;
  const imageFilePath = `${path.dirname(__dirname)}/public/img/music/${
    data.coverImage
  }.jpeg`;
  console.log(audioFilePath, imageFilePath);

  fs.unlink(audioFilePath, (err) => {
    if (err) {
      console.error("Error deleting the file", err);
      return;
    }
  });
  fs.unlink(imageFilePath, (err) => {
    if (err) {
      console.error("Error deleting the file", err);
      return;
    }
  });
  if (!data) {
    res.status(404).json({ message: "Music not found!" });
  } else {
    await Music.deleteOne({ _id: req.params.id });
    res.status(200).json({ id: req.params._id, message: "Music deleted!" });
  }
});
