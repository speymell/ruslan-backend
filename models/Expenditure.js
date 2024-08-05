import mongoose from "mongoose";

const ExpenditureSchema = new mongoose.Schema({
  date: { type: String, required: true },
  type: { type: String, required: true },
  comment: { type: String },
  price: { type: Number },
});

export default mongoose.model("Expenditure", ExpenditureSchema);
