import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  date: { type: String, required: true },
  logins: [{ type: String, maxlength: 7 }], // Добавляем ограничение на количество логинов
  type: { type: String, required: true },
  version: { type: Number, default: 1 },
});

export default mongoose.model("Task", TaskSchema);
