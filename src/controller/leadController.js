const express = require("express");
const multer = require("multer");
const Lead = require("../model/lead.schema");
const LeadStatus = require("../model/leadStatus.schema");
const LeadSource = require("../model/leadSource.schema");
const { sendResponse } = require("../utils/common");
const ExcelService = require("../utils/ExcelService");
require("dotenv").config();

const upload = multer({ storage: multer.memoryStorage() });

const leadController = express.Router();

leadController.post("/create", async (req, res) => {
  try {
    let leadStatusId = req.body.leadStatus;

    if (!leadStatusId) {
      const defaultStatus = await LeadStatus.findOne({ status: true }).sort({ createdAt: 1 });

      if (!defaultStatus) {
        return sendResponse(res, 400, "Failed", {
          message: "No active lead status found",
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
    const {
      searchKey = "",
      status,
      leadStatus,
      leadSource,
      pageNo = 1,
      pageCount = 10,
    } = req.body;

    const query = {};

    if (status !== undefined) {
      query.status = status;
    }

    if (leadStatus) {
      query.leadStatus = leadStatus;
    }

    if (leadSource) {
      query.leadSource = leadSource;
    }
    if (searchKey) {
      query.$or = [
        { leadName: { $regex: searchKey, $options: "i" } },
        { phone: { $regex: searchKey, $options: "i" } },
        { email: { $regex: searchKey, $options: "i" } },
        { company: { $regex: searchKey, $options: "i" } },
      ];
    }

    const leads = await Lead.find(query)
      .populate("leadStatus", "name code")
      .populate("leadSource", "sourceName")
      .sort({ order: 1, createdAt: -1 })
      .limit(Number(pageCount))
      .skip((pageNo - 1) * Number(pageCount));

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
      Lead.find().populate("leadStatus", "name").lean(),
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
      if (isNaN(createdDate.getTime())) {
        console.warn(`Skipping lead with invalid date. ID: ${lead._id}`);
        return;
      }
      const dateKey = createdDate.toISOString().split("T")[0];

      if (!dailyLeadsMap[dateKey]) {
        dailyLeadsMap[dateKey] = { date: dateKey, count: 0 };
      }
      dailyLeadsMap[dateKey].count += 1;

      if (createdDate >= todayDate) todayLeads++;
      if (createdDate >= weekStart) thisWeekLeads++;

      if (lead.leadStatus && statusCountMap[lead.leadStatus._id.toString()]) {
        statusCountMap[lead.leadStatus._id.toString()].count += 1;
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

leadController.put("/reorder", async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return sendResponse(res, 400, "Failed", {
        message: "Invalid updates array",
      });
    }

    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id },
        update: { $set: { order: update.order } },
      },
    }));

    await Lead.bulkWrite(bulkOps);

    sendResponse(res, 200, "Success", {
      message: "Leads reordered successfully",
    });
  } catch (error) {
    console.error("Reorder error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

leadController.get("/export", async (req, res) => {
  try {
    const leads = await Lead.find()
      .populate("leadStatus", "name")
      .populate("leadSource", "sourceName")
      .lean();

    const leadColumnMapping = [
      { header: 'ID', key: '_id', width: 25 },
      { header: 'Lead Name', key: 'leadName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Company', key: 'company', width: 25 },
      { header: 'Account Name', key: 'accountName', width: 25 },
      { header: 'Account Industry', key: 'accountIndustry', width: 25 },
      { header: 'Website', key: 'website', width: 30 },
      { header: 'Position', key: 'position', width: 20 },
      { header: 'Lead Value', key: 'leadValue', width: 15 },
      {
        header: 'Lead Status',
        key: 'leadStatusName',
        width: 20,
        transform: (val, item) => item.leadStatus?.name || ''
      },
      {
        header: 'Lead Source',
        key: 'leadSourceName',
        width: 20,
        transform: (val, item) => item.leadSource?.sourceName || ''
      },
      { header: 'Address', key: 'address', width: 35 },
      { header: 'Notes', key: 'notes', width: 40 },
    ];

    const buffer = await ExcelService.exportToExcel(
      leads,
      leadColumnMapping,
      'Leads'
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=leads-${Date.now()}.xlsx`
    );
    res.send(buffer);
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

leadController.post("/import", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, "Failed", { message: "No file uploaded" });
    }

    const defaultStatus = await LeadStatus.findOne({ status: true }).sort({ createdAt: 1 });
    if (!defaultStatus) {
      return sendResponse(res, 400, "Failed", { message: "No active lead status found" });
    }

    const allStatuses = await LeadStatus.find({ status: true });
    const statusMap = {};
    allStatuses.forEach(s => {
      if (s.name) statusMap[s.name.trim().toLowerCase()] = s._id;
    });

    const allSources = await LeadSource.find({});
    const sourceMap = {};
    allSources.forEach(s => {
      if (s.sourceName) sourceMap[s.sourceName.trim().toLowerCase()] = s._id;
    });

    const leadColumnMapping = [
      { header: 'ID', key: '_id' },
      { header: 'Lead Name', key: 'leadName' },
      { header: 'Email', key: 'email' },
      { header: 'Phone', key: 'phone' },
      { header: 'Company', key: 'company' },
      { header: 'Account Name', key: 'accountName' },
      { header: 'Account Industry', key: 'accountIndustry' },
      { header: 'Website', key: 'website' },
      { header: 'Position', key: 'position' },
      { header: 'Lead Value', key: 'leadValue', parse: (val) => Number(val) || 0 },
      { header: 'Lead Status', key: 'excelStatusName' },
      { header: 'Lead Source', key: 'excelSourceName' },
      { header: 'Address', key: 'address' },
      { header: 'Notes', key: 'notes' },
    ];

    const data = await ExcelService.importFromExcel(req.file.buffer, leadColumnMapping);

    const bulkOps = data.map(item => {
      const updateData = { ...item };

      if (item.excelStatusName) {
        const normalizedKey = item.excelStatusName.toString().trim().toLowerCase();
        if (statusMap[normalizedKey]) {
          updateData.leadStatus = statusMap[normalizedKey];
        } else {
          updateData.leadStatus = defaultStatus._id;
        }
        delete updateData.excelStatusName;
      } else {
        if (!item._id) updateData.leadStatus = defaultStatus._id;
      }

      if (item.excelSourceName) {
        const normalizedSourceKey = item.excelSourceName.toString().trim().toLowerCase();
        if (sourceMap[normalizedSourceKey]) {
          updateData.leadSource = sourceMap[normalizedSourceKey];
        }
        delete updateData.excelSourceName;
      }

      let rawId = item._id;
      if (rawId && typeof rawId === 'string') {
        rawId = rawId.replace(/['"]+/g, '').trim();
      }

      if (rawId && rawId.length === 24) {
        delete updateData._id;

        return {
          updateOne: {
            filter: { _id: rawId },
            update: { $set: updateData }
          }
        };
      }
      else {
        delete updateData._id;

        return {
          insertOne: {
            document: {
              ...updateData,
              status: true,
              order: 0
            }
          }
        };
      }
    });

    if (bulkOps.length > 0) {
      const result = await Lead.bulkWrite(bulkOps);
      sendResponse(res, 200, "Success", {
        message: `Processed ${bulkOps.length} rows. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Inserted: ${result.insertedCount}`,
        result
      });
    } else {
      sendResponse(res, 200, "Success", { message: "No valid data found to import" });
    }

  } catch (error) {
    console.error("Import Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = leadController;
