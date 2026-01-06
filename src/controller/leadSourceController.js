const express = require("express");
const LeadSource = require("../model/leadSource.schema");
const { sendResponse } = require("../utils/common");

const leadSourceController = express.Router();

/* CREATE SOURCE */
leadSourceController.post("/create", async (req, res) => {
  try {
    const source = await LeadSource.create({
      sourceName: req.body.sourceName,
      description: req.body.description,
      status: req.body.status ?? true,
    });

    sendResponse(res, 200, "Success", {
      message: "Lead source created",
      data: source,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* LIST SOURCE (SEARCH + PAGINATION) */
leadSourceController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      pageNo = 1,
      pageCount = 10,
    } = req.body;

    const query = {};

    if (searchKey) {
      query.$or = [
        { sourceName: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const list = await LeadSource.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(pageCount))
      .skip((pageNo - 1) * pageCount);

    const total = await LeadSource.countDocuments(query);

    sendResponse(res, 200, "Success", {
      data: list,
      total,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* UPDATE SOURCE */
leadSourceController.put("/update/:id", async (req, res) => {
  try {
    const updated = await LeadSource.findByIdAndUpdate(
      req.params.id,
      {
        sourceName: req.body.sourceName,
        description: req.body.description,
        status: req.body.status,
      },
      { new: true }
    );

    sendResponse(res, 200, "Success", {
      message: "Lead source updated",
      data: updated,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* ENABLE / DISABLE SOURCE */
leadSourceController.patch("/toggle/:id", async (req, res) => {
  try {
    const source = await LeadSource.findById(req.params.id);

    if (!source) {
      return sendResponse(res, 404, "Failed", {
        message: "Lead source not found",
      });
    }

    source.status = !source.status;
    await source.save();

    sendResponse(res, 200, "Success", {
      message: "Lead source status updated",
      data: source,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

leadSourceController.delete("/delete/:id", async (req, res) => {
    try {
      const source = await LeadSource.findById(req.params.id);
  
      if (!source) {
        return sendResponse(res, 404, "Failed", {
          message: "Lead source not found",
        });
      }
  
      await LeadSource.findByIdAndDelete(req.params.id);
  
      sendResponse(res, 200, "Success", {
        message: "Lead source deleted successfully",
      });
    } catch (error) {
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });
  

module.exports = leadSourceController;
