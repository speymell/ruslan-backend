import mongoose from "mongoose";
const UserSchema = new mongoose.Schema(
  {
    login: {
      type: String,
      unique: true,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    salary: {
      type: Number,
    },
    admin: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
