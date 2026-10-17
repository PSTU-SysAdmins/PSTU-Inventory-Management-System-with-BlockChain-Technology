import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";

import { 
  departmentRoutes,
  officeRoutes,
  supplierRoutes,
  itemRoutes,
  stockInRoutes,
  CurrentStockInRoutes,
  stockOutRoutes,
  CurrentStockOutRoutes,
  deadStockRoutes,
  deadStockRequestRoutes,
  userRoutes,
  categoryRoutes,
  stockHistoryRoutes,
  reportRoutes,
  stockInRequestRoutes // Import matches index.js
} from "./routes/index.js";


import { blockchainRoutes, startBlockchainVerificationJob } from "./block_page.js";

const app = express();
const PORT = process.env.PORT || 5000;

try {
  await connectDB();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

app.get("/api/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "unavailable",
    db: connected ? "connected" : "disconnected",
  });
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(cors());
app.use(express.json());

app.use("/api/departments", departmentRoutes);
app.use("/api/offices", officeRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/stockins", stockInRoutes);
app.use("/api/currentstockins", CurrentStockInRoutes);
app.use("/api/stockouts", stockOutRoutes);
app.use("/api/currentstockouts", CurrentStockOutRoutes);
app.use("/api/deadstocks", deadStockRoutes);
app.use("/api/deadstockrequests", deadStockRequestRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/stockhistories", stockHistoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/stockInRequest", stockInRequestRoutes); 

app.use("/api/blockchain", blockchainRoutes)

startBlockchainVerificationJob()

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
