import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import cors from "cors";

import { validationResult } from "express-validator";
import { registerValidation, loginValidation } from "./validations.js";
import UserModel from "./models/User.js";
import checkAuth from "./utils/checkAuth.js";
import TaskModel from "./models/Task.js";

import * as UserController from "./controllers/UserController.js";
import WorkedDay from "./models/WorkedDay.js";
import Expenditure from "./models/Expenditure.js";

mongoose
  .connect("mongodb+srv://admin:123123Z@cluster0.avot3f7.mongodb.net/blog") // process.env.MONGODB_URI
  .then(() => console.log("ok"))
  .catch(() => {
    console.log("error");
  });

// User

const app = express();
app.use(express.json());
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.status(200).send();
});
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.post("/auth/login", loginValidation, UserController.login);

app.post("/auth/register", registerValidation, UserController.register);

app.get("/auth/me", checkAuth, UserController.getMe);

app.post("/auth/checkadmin", checkAuth, async (req, res) => {
  const { login } = req.body;

  try {
    const user = await UserModel.findOne({ login });
    if (!user) {
      return res.status(404).json({ error: "Отказ" });
    }

    if (user.admin) {
      res.json({ isAdmin: true });
    } else {
      res.json({ isAdmin: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Task

app.get("/plan/latest", checkAuth, async (req, res) => {
  try {
    const latestRecords = await TaskModel.find().sort({ _id: -1 }).limit(14);

    res.status(200).json(latestRecords);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/plan/latest/selecteddate", checkAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    let query = {};

    if (startDate && endDate) {
      query = {
        date: { $gte: startDate, $lte: endDate },
      };
    }

    const latestRecords = await TaskModel.find(query)
      .sort({ _id: -1 })
      .limit(100);

    res.status(200).json(latestRecords);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/generate-plan", checkAuth, async (req, res) => {
  try {
    const { data } = req.body;

    // Проверяем, передана ли дата
    if (!data) {
      return res.status(400).json({ message: "Дата не передана" });
    }

    // Парсим дату
    const date = new Date(data.split(".").reverse().join("-"));

    // Проверяем, существует ли уже запись с этой датой
    const existingDate = await TaskModel.findOne({
      date: date.toLocaleDateString(),
    });
    if (existingDate) {
      return res.status(400).json({ message: "Эта неделя уже создана" });
    }

    // Генерируем 7 записей для типа "day" и 7 записей для типа "night"
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(date.getTime() + i * 24 * 60 * 60 * 1000);
      const formattedDate = `${currentDate
        .getDate()
        .toString()
        .padStart(2, "0")}.${(currentDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}.${currentDate.getFullYear()}`;

      await TaskModel.create({ date: formattedDate, logins: [], type: "day" });
      await TaskModel.create({
        date: formattedDate,
        logins: [],
        type: "night",
      });
    }

    res.status(200).json({ message: "Записи созданы" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/plan", checkAuth, async (req, res) => {
  try {
    const { date, logins } = req.body;

    // Проверяем, является ли logins массивом
    if (!Array.isArray(logins)) {
      return res
        .status(400)
        .json({ message: "Логины должны быть переданы в виде массива" });
    }

    // Проверяем, пуст ли массив логинов
    if (logins.length === 0) {
      return res
        .status(400)
        .json({ message: "Массив логинов не может быть пустым" });
    }

    // Проверяем, чтобы количество логинов не превышало 7
    if (logins.length > 7) {
      return res
        .status(400)
        .json({ message: "Превышено максимальное количество логинов" });
    }

    // Ищем документ по дате и обновляем его, если он существует
    const updatedDoc = await TaskModel.findOneAndUpdate(
      { date },
      { logins },
      { new: true, upsert: true }
    );

    try {
      res.status(200).json({ message: "Расписание обновлено" });
    } catch (error) {
      res.status(500).send(error.message);
    }
  } catch (err) {
    res.status(404).send(err.message);
  }
});

app.post("/plan/general", checkAuth, async (req, res) => {
  try {
    const { data } = req.body;

    // Проверяем, является ли data массивом
    if (!Array.isArray(data)) {
      return res
        .status(400)
        .json({ message: "Данные должны быть переданы в виде массива" });
    }

    // Проверяем, содержит ли массив 14 элементов
    if (data.length !== 14) {
      return res
        .status(400)
        .json({ message: "Массив должен содержать 14 элементов" });
    }

    // Обновляем документы в базе данных
    for (const item of data) {
      const { date, logins, type, version } = item;

      // Проверяем, является ли logins массивом
      if (!Array.isArray(logins)) {
        return res
          .status(400)
          .json({ message: "Логины должны быть переданы в виде массива" });
      }

      // Проверяем, чтобы количество логинов не превышало 7
      if (logins.length > 7) {
        return res
          .status(400)
          .json({ message: "Превышено максимальное количество логинов" });
      }

      const task = await TaskModel.findOne({ date, type });
      if (task.version !== version) {
        return res.status(409).json({ message: "Кто-то уже обновил данные" });
      }

      // Ищем документ по дате и типу, и обновляем его, если он существует
      await TaskModel.findOneAndUpdate(
        { date, type },
        { logins, version: version + 1 }, // Fix the typo here
        { new: true, upsert: true }
      );
    }

    res.status(200).json({ message: "Расписание обновлено" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Worked day

app.get("/workedday/:login", checkAuth, async (req, res) => {
  console.log("Получен GET запрос /workedday");
  try {
    const login = req.params.login;
    const lastSalaryDate = await WorkedDay.findOne({
      login,
      salaryReceived: true,
    }).sort({ createdAt: -1 });
    const filter = lastSalaryDate
      ? { login, createdAt: { $gt: lastSalaryDate.createdAt } }
      : { login };
    const tasks = await WorkedDay.find(filter);
    res.json(tasks);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/pay-salary/:login", checkAuth, async (req, res) => {
  console.log("Получен POST запрос /pay-salary");
  try {
    const login = req.params.login;
    const lastWorkedDay = await WorkedDay.findOne({ login }).sort({
      createdAt: -1,
    });
    if (!lastWorkedDay) {
      res
        .status(404)
        .send("Не найден последний рабочий день для данного пользователя");
      return;
    }
    lastWorkedDay.salaryReceived = true;
    await lastWorkedDay.save();
    res.json({ message: "Зарплата выплачена" });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/workedday", checkAuth, async (req, res) => {
  try {
    const { date, login, type, earn } = req.body;

    // проверяет - сущесвтвует ли уже такой день у этого работника
    const existingWorkedDay = await WorkedDay.findOne({ date, login });

    const user = await UserModel.findOne({ login });
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const newEarn = user.salary + earn;

    if (existingWorkedDay) {
      return res
        .status(400)
        .json({ message: "Этот день уже внесён в базу для этого работника" });
    }

    const doc = new WorkedDay({
      date,
      login,
      type,
      earn: newEarn,
    });

    const workedday = await doc.save();
    res.json({ workedday });
  } catch (err) {
    res.status(404).send(err.message);
  }
});

// Expenditure (расход)

app.get("/expenditure", checkAuth, async (req, res) => {
  console.log("Получен GET запрос /expenditure");
  try {
    const expenditures = await Expenditure.find().exec();
    res.json(expenditures);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/expenditure", checkAuth, async (req, res) => {
  console.log("Получен POST запрос /expenditure");
  try {
    const { date, type, comment, price } = req.body;
    if (!date || !type) {
      res.status(400).send("Поля date и type обязательны");
      return;
    }
    const expenditure = new Expenditure({ date, type, comment, price });
    await expenditure.save();
    res.json(expenditure);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/expenditure/bydate", checkAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const start = startDate.split(".").reverse().join("");
    const end = endDate.split(".").reverse().join("");

    const latestRecords = await Expenditure.aggregate([
      {
        $addFields: {
          dateFormatted: {
            $concat: [
              { $substr: ["$date", 6, 4] },
              { $substr: ["$date", 3, 2] },
              { $substr: ["$date", 0, 2] },
            ],
          },
        },
      },
      {
        $match: {
          dateFormatted: { $gte: start, $lte: end },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 100,
      },
      {
        $project: {
          _id: 1,
          date: 1,
          type: 1,
          comment: 1,
          price: 1,
        },
      },
    ]);

    res.status(200).json(latestRecords);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

//process.env.PORT ||

app.listen(process.env.PORT || 4444, (err) => {
  if (err) {
    return console.log(err);
  }
  console.log("Ok");
});
