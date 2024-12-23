import express from "express";
import { refreshNBAh2h, resetDatabase } from "./databaseMethods.js";

const minutes = 5;
const PORT = 3000;
const app = express();

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

// Refresh every X amount of minutes (minutes * seconds * milliseconds)
setInterval(() => {
  resetDatabase();
  refreshNBAh2h();
}, minutes * 60 * 1000);
