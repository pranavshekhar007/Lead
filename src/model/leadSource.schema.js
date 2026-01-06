const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const leadSourceSchema = mongoose.Schema({
  sourceName: {
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
});

leadSourceSchema.plugin(timestamps);

module.exports = mongoose.model("LeadSource", leadSourceSchema);
