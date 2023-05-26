//
// app.get('/assets', async (req, res) => {...});
//
// Return all the assets from the database:
//
const dbConnection = require('./database.js')

exports.get_assets = async (req, res) => {

  console.log("call to /assets...");

  try {
    dbConnection.query('SELECT assets.*, metadata.id as metadata_id, metadata.date_taken, ST_AsText(metadata.location) as location, metadata.created_at as metadata_created_at, metadata.updated_at as metadata_updated_at FROM assets LEFT JOIN metadata ON assets.assetid = metadata.assetid', (err, results, fields) => {
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
                  created_at: result.metadata_created_at,
                  updated_at: result.metadata_updated_at
              };
              
              // Remove metadata properties from the asset object
              delete result.metadata_id;
              delete result.date_taken;
              delete result.location;
              delete result.metadata_created_at;
              delete result.metadata_updated_at;
              
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
