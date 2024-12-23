import express from "express";
import { refreshNBAh2h, resetDatabase } from "./databaseMethods.js";

const minutes = 5;
const PORT = 3000;
const app = express();

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

// Initial run
(async () => {
  try {
    console.log("Initial database refresh...");
    await resetDatabase();
    await refreshNBAh2h();
    console.log("Initial refresh complete");
  } catch (error) {
    console.error("Error during initial database refresh:", error);
  }
})();

// Refresh every X amount of minutes (minutes * seconds * milliseconds)
setInterval(async () => {
  try {
    console.log("Starting database refresh...");
    await resetDatabase();
    await refreshNBAh2h();
    console.log("Database successfully refreshed");
  } catch (error) {
    console.error("Error during database refresh:", error);
  }
}, minutes * 60 * 1000);
