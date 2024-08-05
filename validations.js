import { body } from "express-validator";

export const loginValidation = [
  body("login", "Неверный формат логина").isLength({ min: 4 }),
  body("password", "Длинна пароля должна быть не менее 5 символов").isLength({
    min: 4,
  }),
];

export const registerValidation = [
  body("login", "Неверный формат логина").isLength({ min: 4 }),
  body("password", "Длинна пароля должна быть не менее 4 символов").isLength({
    min: 4,
  }),
];

export const postCreateValidation = [
  body("login", "Неверный формат логина").isLength({ min: 4 }),
  body("password", "Длинна пароля должна быть не менее 5 символов").isLength({
    min: 4,
  }),
];
