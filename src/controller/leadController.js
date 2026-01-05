const express = require("express");
const Lead = require("../model/lead.schema");
const LeadStatus = require("../model/leadStatus.schema");
const { sendResponse } = require("../utils/common");
require("dotenv").config(); 

const leadController = express.Router();

/* CREATE LEAD */
leadController.post("/create", async (req, res) => {
  try {
    const defaultStatus = await LeadStatus.findOne({ code: "NEW" });
    if (!defaultStatus) {
      return sendResponse(res, 400, "Failed", {
        message: "Default status NEW not found",
      });
    }

    const lead = await Lead.create({
      ...req.body,
      status: defaultStatus._id,
    });

    sendResponse(res, 200, "Success", {
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* LIST LEADS */
leadController.post("/list", async (req, res) => {
  try {
    const {
      status,
      searchKey = "",
      pageNo = 1,
      pageCount = 10,
    } = req.body;

    const query = {};

    if (status) query.status = status;
    if (searchKey) {
      query.$or = [
        { name: { $regex: searchKey, $options: "i" } },
        { phoneNumber: { $regex: searchKey, $options: "i" } },
      ];
    }

    const leads = await Lead.find(query)
      .populate("status", "name code")
      .sort({ createdAt: -1 })
      .limit(pageCount)
      .skip((pageNo - 1) * pageCount);

    const total = await Lead.countDocuments(query);

    sendResponse(res, 200, "Success", {
      data: leads,
      total,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* UPDATE LEAD DETAILS */
leadController.put("/update/:id", async (req, res) => {
    try {
      const leadId = req.params.id;
  
      const lead = await Lead.findById(leadId);
      if (!lead) {
        return sendResponse(res, 404, "Failed", {
          message: "Lead not found",
        });
      }
  
      const updatedLead = await Lead.findByIdAndUpdate(
        leadId,
        {
          name: req.body.name,
          phoneNumber: req.body.phoneNumber,
          email: req.body.email,
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          country: req.body.country,
          notes: req.body.notes,
        },
        { new: true }
      ).populate("status", "name code");
  
      sendResponse(res, 200, "Success", {
        message: "Lead updated successfully",
        data: updatedLead,
      });
    } catch (error) {
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
      });
    }
  });
  

/* UPDATE LEAD STATUS */
leadController.put("/update-status/:id", async (req, res) => {
  try {
    const { statusId, nextFollowUpAt, notes } = req.body;

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return sendResponse(res, 404, "Failed", { message: "Lead not found" });
    }

    lead.status = statusId;
    if (nextFollowUpAt) lead.nextFollowUpAt = nextFollowUpAt;
    if (notes) lead.notes = notes;

    await lead.save();

    sendResponse(res, 200, "Success", {
      message: "Lead status updated successfully",
      data: lead,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* DELETE LEAD */
leadController.delete("/delete/:id", async (req, res) => {
    try {
      const leadId = req.params.id;
  
      const lead = await Lead.findById(leadId);
      if (!lead) {
        return sendResponse(res, 404, "Failed", {
          message: "Lead not found",
        });
      }
  
      await Lead.findByIdAndDelete(leadId);
  
      sendResponse(res, 200, "Success", {
        message: "Lead deleted successfully",
      });
    } catch (error) {
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
      });
    }
  });

  /* GET LEAD DETAILS */
leadController.get("/details/:id", async (req, res) => {
  try {
    const leadId = req.params.id;

    const lead = await Lead.findById(leadId)
      .populate("status", "name code isFinal")
      .lean();

    if (!lead) {
      return sendResponse(res, 404, "Failed", {
        message: "Lead not found",
      });
    }

    sendResponse(res, 200, "Success", {
      message: "Lead details fetched successfully",
      data: lead,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

leadController.get("/dashboard-details", async (req, res) => {
  try {
    const [leads, statuses] = await Promise.all([
      Lead.find().populate("status", "name code").lean(),
      LeadStatus.find({ isActive: true }).lean(),
    ]);

    const totalLeads = leads.length;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    let todayLeads = 0;
    let thisWeekLeads = 0;

    const dailyLeadsMap = {};
    const statusCountMap = {};

    statuses.forEach((s) => {
      statusCountMap[s._id.toString()] = {
        name: s.name,
        code: s.code,
        count: 0,
      };
    });

    leads.forEach((lead) => {
      const createdDate = new Date(lead.createdAt);
      const dateKey = createdDate.toISOString().split("T")[0];

      if (!dailyLeadsMap[dateKey]) {
        dailyLeadsMap[dateKey] = { date: dateKey, count: 0 };
      }
      dailyLeadsMap[dateKey].count += 1;

      if (createdDate >= todayDate) todayLeads++;
      if (createdDate >= weekStart) thisWeekLeads++;

      if (lead.status && statusCountMap[lead.status._id.toString()]) {
        statusCountMap[lead.status._id.toString()].count += 1;
      }
    });

    const dailyLeads = Object.values(dailyLeadsMap).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const statusBreakdown = Object.values(statusCountMap);

    const dashboardData = {
      leads: {
        totalLeads,
        todayLeads,
        thisWeekLeads,
      },
      statusBreakdown,
      dailyLeads,
    };

    sendResponse(res, 200, "Success", {
      message: "Lead dashboard data fetched successfully",
      data: dashboardData,
    });
  } catch (error) {
    console.error("Lead dashboard error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});
  

module.exports = leadController;
