const express = require("express");
const Lead = require("../model/lead.schema");
const LeadStatus = require("../model/leadStatus.schema");
const { sendResponse } = require("../utils/common");
require("dotenv").config(); 

const leadController = express.Router();

/* CREATE LEAD */
/* CREATE LEAD */
leadController.post("/create", async (req, res) => {
  try {
    let leadStatusId = req.body.leadStatus;

    // If frontend did NOT send leadStatus → fallback to default
    if (!leadStatusId) {
      const defaultStatus = await LeadStatus.findOne({ code: "NEW" });

      if (!defaultStatus) {
        return sendResponse(res, 400, "Failed", {
          message: "Default lead status not found",
        });
      }

      leadStatusId = defaultStatus._id;
    }

    const lead = await Lead.create({
      ...req.body,
      leadStatus: leadStatusId,
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
    const { searchKey = "", status, pageNo = 1, pageCount = 10 } = req.body;

    const query = {};

    if (status) query.status = status;
    if (searchKey) {
      query.$or = [
        { leadName: { $regex: searchKey, $options: "i" } },
        { phone: { $regex: searchKey, $options: "i" } },
        { email: { $regex: searchKey, $options: "i" } },
        { company: { $regex: searchKey, $options: "i" } },
      ];
    }

    const leads = await Lead.find(query)
      .populate("leadStatus", "name")
      .populate("leadSource", "sourceName")
      .sort({ createdAt: -1 })
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const total = await Lead.countDocuments(query);

    sendResponse(res, 200, "Success", {
      data: leads,
      total,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* UPDATE LEAD */
leadController.put("/update/:id", async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate("leadStatus", "name")
      .populate("leadSource", "sourceName");

    if (!lead) {
      return sendResponse(res, 404, "Failed", {
        message: "Lead not found",
      });
    }

    sendResponse(res, 200, "Success", {
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* UPDATE LEAD STATUS */
leadController.put("/update-status/:id", async (req, res) => {
  try {
    const { leadStatus } = req.body;

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return sendResponse(res, 404, "Failed", { message: "Lead not found" });
    }

    lead.leadStatus = leadStatus;
    await lead.save();

    sendResponse(res, 200, "Success", {
      message: "Lead status updated successfully",
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* TOGGLE LEAD STATUS (ACTIVE / INACTIVE) */
leadController.patch("/toggle/:id", async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return sendResponse(res, 404, "Failed", {
        message: "Lead not found",
      });
    }

    lead.status = !lead.status;
    await lead.save();

    sendResponse(res, 200, "Success", {
      message: "Lead status updated",
      status: lead.status,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* DELETE LEAD */
leadController.delete("/delete/:id", async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return sendResponse(res, 404, "Failed", {
        message: "Lead not found",
      });
    }

    await Lead.findByIdAndDelete(req.params.id);

    sendResponse(res, 200, "Success", {
      message: "Lead deleted successfully",
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

/* LEAD DETAILS */
leadController.get("/details/:id", async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("leadStatus", "name")
      .populate("leadSource", "sourceName")
      .lean();

    if (!lead) {
      return sendResponse(res, 404, "Failed", {
        message: "Lead not found",
      });
    }

    sendResponse(res, 200, "Success", {
      data: lead,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

leadController.get("/dashboard-details", async (req, res) => {
  try {
    const [leads, statuses] = await Promise.all([
      Lead.find().populate("status", "name").lean(),
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
