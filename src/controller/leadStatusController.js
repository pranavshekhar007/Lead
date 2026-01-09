const express = require("express");
const LeadStatus = require("../model/leadStatus.schema");
const { sendResponse } = require("../utils/common");
require("dotenv").config();

const leadStatusController = express.Router();

leadStatusController.post("/create", async (req, res) => {
  try {
    const status = await LeadStatus.create({
      name: req.body.name,
      description: req.body.description,
      status: req.body.status,
      color: req.body.color,
    });

    sendResponse(res, 200, "Success", {
      message: "Lead status created",
      data: status,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

leadStatusController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      pageNo = 1,
      sortByField,
      sortByOrder,
      pageCount = 10,
    } = req.body;

    const query = {};

    if (searchKey) {
      query.$or = [
        { name: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "desc" ? -1 : 1;

    const list = await LeadStatus.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount));

    const total = await LeadStatus.countDocuments(query);

    sendResponse(res, 200, "Success", {
      data: list,
      total,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

leadStatusController.put("/update/:id", async (req, res) => {
  try {
    const updated = await LeadStatus.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
        color: req.body.color,
      },
      { new: true }
    );

    sendResponse(res, 200, "Success", {
      message: "Lead status updated",
      data: updated,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* ENABLE / DISABLE STATUS */
leadStatusController.patch("/toggle/:id", async (req, res) => {
  try {
    const status = await LeadStatus.findById(req.params.id);

    if (!status) {
      return sendResponse(res, 404, "Failed", { message: "Status not found" });
    }

    status.status = !status.status;
    await status.save();

    sendResponse(res, 200, "Success", {
      message: "Status updated",
      data: status,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

leadStatusController.delete("/delete/:id", async (req, res) => {
  try {
    const deletedStatus = await LeadStatus.findByIdAndDelete(req.params.id);

    if (!deletedStatus) {
      return sendResponse(res, 404, "Failed", {
        message: "Lead status not found",
      });
    }

    sendResponse(res, 200, "Success", {
      message: "Lead status deleted permanently",
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = leadStatusController;
