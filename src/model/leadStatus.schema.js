// model/leadStatus.schema.js
const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const leadStatusSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    unique: true,
  },
  isFinal: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

leadStatusSchema.plugin(timestamps);

module.exports = mongoose.model("LeadStatus", leadStatusSchema);
