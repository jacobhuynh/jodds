import express from "express";
import {
  refreshH2H,
  resetDatabase,
  refreshSpreads,
  refreshTotals,
  getActiveSports,
} from "./databaseMethods.js";

const minutes = 5;
const PORT = 3000;
const app = express();

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

const listOfSports = [
  "basketball_nba",
  "americanfootball_nfl",
  "baseball_mlb",
  "basketball_ncaab",
];

// List of methods to run
async function databaseMethods() {
  const activeSports = await getActiveSports();
  for (var i = 0; i < listOfSports.length; i++) {
    if (activeSports.includes(listOfSports[i])) {
      await resetDatabase(listOfSports[i]);
      await refreshH2H(listOfSports[i]);
      //   await refreshSpreads(listOfSports[i]);
      //   await refreshTotals(listOfSports[i]);
    }
  }
}

// Initial run
(async () => {
  try {
    console.log("Initial database refresh...");

    // Run database methods
    await databaseMethods();

    console.log("Initial refresh complete");
  } catch (error) {
    console.error("Error during initial database refresh:", error);
  }
})();

// Refresh every X amount of minutes (minutes * seconds * milliseconds)
setInterval(async () => {
  try {
    console.log("Starting database refresh...");

    // Run database methods
    await databaseMethods();

    console.log("Database successfully refreshed");
  } catch (error) {
    console.error("Error during database refresh:", error);
  }
}, minutes * 60 * 1000);
