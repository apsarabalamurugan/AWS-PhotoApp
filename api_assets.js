//
// app.get('/assets', async (req, res) => {...});
//
// Return all the assets from the database:
//
const dbConnection = require('./database.js')

exports.get_assets = async (req, res) => {

  console.log("call to /assets...");

  try {
    dbConnection.query('SELECT * FROM assets', (err, rows, fields) => {
      if (err) {
        res.status(400).json({
          "message": err.message,
          "data": []
        });
      }//if
      else {
        res.status(200).json({
          "message": "success",
          "data": rows
        });
      }//else
    });//query
    

  }//try
  catch (err) {
    res.status(400).json({
      "message": err.message,
      "data": []
    });
  }//catch

}//get
