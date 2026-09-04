const mongoose = require("mongoose");

const hostelApplicationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    applicantDetails: { type: mongoose.Schema.Types.Mixed, required: true },
    studentInformation: { type: mongoose.Schema.Types.Mixed, default: {} },
    guardianInformation: { type: mongoose.Schema.Types.Mixed, default: {} },
    fees: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    roomAllocation: {
      roomNumber: { type: String, default: "" },
      block: { type: String, default: "" },
      floor: { type: String, default: "" },
      allocatedAt: { type: Date, default: null },
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

module.exports = mongoose.model("HostelApplication", hostelApplicationSchema);
