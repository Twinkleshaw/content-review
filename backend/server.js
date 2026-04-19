require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const contentRoutes = require("./routes/content.routes");
const workflowRoutes = require("./routes/workflow.routes");
const subContentRoutes = require("./routes/subcontent.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/contents", contentRoutes);
app.use("/api/contents/:contentId/subcontent", subContentRoutes);
app.use("/api/workflow", workflowRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/content-review";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
