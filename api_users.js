//
// app.get('/users', async (req, res) => {...});
//
// Return all the users from the database:
//
const dbConnection = require('./database.js')

exports.get_users = async (req, res) => {

  console.log("call to /users...");

  try {
    dbConnection.query('SELECT * FROM users', (err, rows, fields) => {
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
