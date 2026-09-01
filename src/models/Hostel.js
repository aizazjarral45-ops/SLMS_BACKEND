const mongoose = require("mongoose");

const hostelSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roomId: { type: String, default: "" },
    block: { type: String, default: "" },
    capacity: { type: Number, default: 0 },
    occupied: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Available", "Full", "Assigned", "Pending", "Rejected"],
      default: "Pending",
    },
    feesPerSemester: { type: Number, default: 0 },
    feesPaidThisMonth: { type: Number, default: 0 },
    paymentDueDate: { type: String, default: "" },
    feesStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending",
    },
    roomType: { type: String, default: "Standard" },
    checkInDate: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Hostel", hostelSchema);
