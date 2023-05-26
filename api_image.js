//
// app.post('/image/:userid', async (req, res) => {...});
//
// Uploads an image to the bucket and updates the database,
// returning the asset id assigned to this image.
//
const dbConnection = require('./database.js')
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3, s3_bucket_name, s3_region_name } = require('./aws.js');

const uuid = require('uuid');

exports.post_image = async (req, res) => {

  console.log("call to /image...");

  try {

    var data = req.body;  // data => JS object

    var S = req.body.data;
    var bytes = Buffer.from(S, 'base64');

    const name = uuid.v4() + ".jpg";

    // console.log(req.params.userid);
    // Find the user's bucket folder.
    dbConnection.query('SELECT * FROM users WHERE userid = ?', [req.params.userid], async (err, rows, fields) => {
      if (err) {
        res.status(400).json({
          "message": err.message,
          "assetid": -1
        });
        return
      }//if
      if (rows.length === 0) {
        res.status(200).json({
          "message": "no such user...",
          "assetid": -1
        });
        return
      }//if
      else {
        const user = rows[0];
        const folder = user.bucketfolder;

        const putObjectParams = {
          Bucket: s3_bucket_name,
          Key: folder + "/" + name,
          Body: bytes
        };

        try {
          const data = await s3.send(new PutObjectCommand(putObjectParams));

          // Update the database
          dbConnection.query('INSERT INTO assets (userid, assetname, bucketkey) VALUES (?, ?, ?)', [req.params.userid, req.body.assetname, folder + "/" + name], (err, rows, fields) => {
            if (err) {
              res.status(400).json({
                "message": err.message,
                "assetid": -1
              });
              return
            }//if
            else {
              res.status(200).json({
                "message": "success",
                "assetid": rows.insertId 
              });
              return
            }//else
          });//query
        }
        catch (err) {
          res.status(400).json({
            "message": err.message,
            "assetid": -1
          });
        }//catch
      }//else
    });//query
  }//try
  catch (err) {
    res.status(400).json({
      "message": err.message,
      "assetid": -1
    });
  }//catch

}//post
