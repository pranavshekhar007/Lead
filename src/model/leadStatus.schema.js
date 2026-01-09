// model/leadStatus.schema.js
const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const leadStatusSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    trim: true,
    default: "",
  },

  status: {
    type: Boolean,
    default: true,
  },
  
  color: {
    type: String,
    default: "#3B82F6",
  },

  order: {
    type: Number,
    default: 0,
  },
});

leadStatusSchema.plugin(timestamps);

module.exports = mongoose.model("LeadStatus", leadStatusSchema);
