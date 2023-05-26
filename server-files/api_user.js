//
// app.put('/user', async (req, res) => {...});
//
// Inserts a new user into the database, or if the
// user already exists (based on email) then the
// user's data is updated (name and bucket folder).
// Returns the user's userid in the database.
//
const dbConnection = require('./database.js')

exports.put_user = async (req, res) => {

  console.log("call to /user...");

  try {

    var data = req.body;  // data => JS object

    dbConnection.query('SELECT * FROM users WHERE email = ?', [data.email], (err, rows, fields) => {
      if (err) {
        res.status(400).json({
          "message": err.message,
          "userid": -1
        });
        return
      }//if
      if (rows.length === 0) {
        dbConnection.query('INSERT INTO users (firstname, lastname, email, bucketfolder) VALUES (?, ?, ?, ?)',
          [data.firstname, data.lastname, data.email, data.bucketfolder], (err, newRows, fields) => {
            if (err) {
              res.status(400).json({
                "message": err.message,
                "userid": -1
              });
              return
            }//if
            res.status(200).json({
              "message": "inserted",
              "userid": newRows.insertId
            });
          });//query
      }//if
      else {
      dbConnection.query('UPDATE users SET firstname = ?, lastname = ?, bucketfolder = ? WHERE email = ?',
        [data.firstname, data.lastname, data.bucketfolder, data.email], (err, newRows, fields) => {
          if (err) {
            res.status(400).json({
              "message": err.message,
              "userid": -1
            });
            return
          }//if
          res.status(200).json({
            "message": "updated",
            "userid": rows[0]["userid"]
          });
        });//query
      }
    });//query	
	
	
  }//try
  catch (err) {
    res.status(400).json({
      "message": err.message,
      "userid": -1
    });
  }//catch

}//put
