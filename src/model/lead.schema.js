const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const leadSchema = mongoose.Schema({
  leadName: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    trim: true,
  },

  phone: {
    type: String,
    required: true,
    trim: true,
  },

  company: {
    type: String,
    trim: true,
  },

  accountName: {
    type: String,
    trim: true,
  },

  accountIndustry: {
    type: String,
    trim: true,
  },

  website: {
    type: String,
    trim: true,
  },

  position: {
    type: String,
    trim: true,
  },

  leadValue: {
    type: Number,
    default: 0,
  },

  leadStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeadStatus",
    required: true,
  },

  leadSource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeadSource",
  },

  address: {
    type: String,
    trim: true,
  },

  notes: {
    type: String,
    trim: true,
  },

  status: {
    type: Boolean,
    default: true,
  },
});

leadSchema.plugin(timestamps);

module.exports = mongoose.model("Lead", leadSchema);
