const dbConnection = require("./database.js");

// Execute ALTER TABLE statement to add columns
dbConnection.query(
  `ALTER TABLE metadata ADD COLUMN compression_quality INT, ADD COLUMN original_width INT, ADD COLUMN original_height INT`,
  (err, result) => {
    if (err) {
      console.error("Error adding columns:", err);
    } else {
      console.log("Columns added successfully!");
    }
  }
);
