const mongoose = require("mongoose");

const hostelSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicationNo: { type: String, default: "" },
    fullName: { type: String, default: "" },
    studentId: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    gender: { type: String, default: "" },
    program: { type: String, default: "" },
    semester: { type: String, default: "" },
    guardianName: { type: String, default: "" },
    guardianPhone: { type: String, default: "" },
    emergencyName: { type: String, default: "" },
    emergencyPhone: { type: String, default: "" },
    preference: { type: String, default: "" },
    facility: { type: String, default: "" },
    remarks: { type: String, default: "" },
    roomId: { type: String, default: "" },
    block: { type: String, default: "" },
    capacity: { type: Number, default: 0 },
    occupied: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Available", "Full", "Assigned", "Pending", "Submitted", "Approved", "Rejected"],
      default: "Pending",
    },
    feesPerSemester: { type: Number, default: 0 },
    feesPaidThisMonth: { type: Number, default: 0 },
    paymentDueDate: { type: String, default: "" },
    feesStatus: {
      type: String,
      enum: ["Pending", "Partial", "Partially Paid", "Paid", "Overdue"],
      default: "Pending",
    },
    roomType: { type: String, default: "Standard" },
    checkInDate: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Hostel", hostelSchema);
