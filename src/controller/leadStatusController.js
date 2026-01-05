const express = require("express");
const LeadStatus = require("../model/leadStatus.schema");
const { sendResponse } = require("../utils/common");
require("dotenv").config();

const leadStatusController = express.Router();

/* CREATE STATUS */
leadStatusController.post("/create", async (req, res) => {
  try {
    const status = await LeadStatus.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Lead status created",
      data: status,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* LIST STATUS */
leadStatusController.post("/list", async (req, res) => {
    try {
      const {
        searchKey = "",
        pageNo = 1,
        pageCount = 10,
      } = req.body;
  
      const query = { isActive: true };
  
      if (searchKey) {
        query.$or = [
          { name: { $regex: searchKey, $options: "i" } },
          { code: { $regex: searchKey, $options: "i" } },
        ];
      }
  
      const list = await LeadStatus.find(query)
        .sort({ createdAt: 1 })
        .limit(parseInt(pageCount))
        .skip((pageNo - 1) * parseInt(pageCount));
  
      const total = await LeadStatus.countDocuments(query);
  
      sendResponse(res, 200, "Success", {
        data: list,
        total,
      });
    } catch (error) {
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });
  

/* UPDATE STATUS */
leadStatusController.put("/update/:id", async (req, res) => {
  try {
    const status = await LeadStatus.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    sendResponse(res, 200, "Success", {
      message: "Lead status updated",
      data: status,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* DELETE (SOFT) */
leadStatusController.delete("/delete/:id", async (req, res) => {
  try {
    await LeadStatus.findByIdAndUpdate(req.params.id, { isActive: false });
    sendResponse(res, 200, "Success", { message: "Lead status disabled" });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = leadStatusController;
