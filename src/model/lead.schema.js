// model/lead.schema.js
const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const leadSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },

  email: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },

  status: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeadStatus",
    required: true,
  },

  nextFollowUpAt: {
    type: Date,
  },

  notes: {
    type: String,
    trim: true,
  },


});

leadSchema.plugin(timestamps);

module.exports = mongoose.model("Lead", leadSchema);
