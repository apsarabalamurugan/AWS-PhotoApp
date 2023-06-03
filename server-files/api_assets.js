//
// app.get('/assets', async (req, res) => {...});
//
// Return all the assets from the database:
//
const dbConnection = require('./database.js')

exports.get_assets = async (req, res) => {

  console.log("call to /assets...");

  try {
    let query = `SELECT assets.*, metadata.id as metadata_id, metadata.date_taken, ST_AsText(metadata.location) as location, metadata.created_at as metadata_created_at, metadata.updated_at as metadata_updated_at FROM assets LEFT JOIN metadata ON assets.assetid = metadata.assetid`;

    // Check if location parameter is provided
    if (req.query.location || req.query.start_date || req.query.end_date) {
      query += ` WHERE `
    }
    if (req.query.location) {
      // Assuming req.query.location is a string representation of the location
      const location = req.query.location;
      console.log(location);
      query += `ST_Distance(metadata.location, ST_GeomFromText('${location}')) <= 1000000`;
      if (req.query.start_date || req.query.end_date) {
        query += ` AND `
      }
    }
  
    // Check if start_date parameter is provided
    if (req.query.start_date) {
      // Assuming req.query.start_date is a string representation of the start date
      const startDate = new Date(req.query.start_date);
      const formattedStartDate = startDate.toISOString().split('T')[0];
      query += `metadata.date_taken >= '${formattedStartDate}'`;
      if (req.query.end_date) {
        query += ` AND `
      }
    }

    // Check if end_date parameter is provided
    if (req.query.end_date) {
      // Assuming req.query.end_date is a string representation of the end date
      const endDate = new Date(req.query.end_date);
      endDate.setDate(endDate.getDate() + 1); // Adjust the end date by adding 1 day to include the full end date
      const formattedEndDate = endDate.toISOString().split('T')[0];
      query += `metadata.date_taken < '${formattedEndDate}'`;
    }

    console.log(query)

    dbConnection.query(query, (err, results, fields) => {
      if (err) {
          res.status(400).json({
              "message": err.message,
              "data": []
          });
      } else {
          let data = results.map(result => {
              let metadata = {
                  id: result.metadata_id,
                  date_taken: result.date_taken,
                  location: result.location,
                  // created_at: result.metadata_created_at,
                  // updated_at: result.metadata_updated_at
              };
              
              // Remove metadata properties from the asset object
              delete result.metadata_id;
              delete result.date_taken;
              delete result.location;
              // delete result.metadata_created_at;
              // delete result.metadata_updated_at;
              
              return {
                  ...result,
                  metadata
              };
          });
          
          res.status(200).json({
              "message": "success",
              "data": data
          });
      }
  });
    

  }//try
  catch (err) {
    res.status(400).json({
      "message": err.message,
      "data": []
    });
  }//catch

}//get