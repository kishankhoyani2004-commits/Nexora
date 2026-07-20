import mongoose from "mongoose";

const timeLogSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // duration in seconds
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["logged", "billed", "paid"],
      default: "logged",
    },
  },
  {
    timestamps: true,
  }
);

timeLogSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const TimeLog = mongoose.model("TimeLog", timeLogSchema);
export default TimeLog;
