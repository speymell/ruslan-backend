import mongoose from "mongoose";
const WorkedDaySchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    login: { type: String, required: true },
    earn: { type: Number },
    type: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("WorkedDay", WorkedDaySchema);
