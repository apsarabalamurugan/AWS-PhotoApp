//
// app.post('/image/:userid', async (req, res) => {...});
//
// Uploads an image to the bucket and updates the database,
// returning the asset id assigned to this image.
//
const dbConnection = require("./database.js");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3, s3_bucket_name, s3_region_name } = require("./aws.js");

const uuid = require("uuid");
const sharp = require("sharp");

exports.post_image = async (req, res) => {
  console.log("call to /image...");

  try {
    var data = req.body; // data => JS object

    var S = req.body.data;
    // ! ISAAC AND SPENCER  HERE IS YOUR METADATA :) :) :) :)
    /*
    {GPSInfo: {1: 'N', 2: ['41.0', '52.0', '50.45'], 3: 'W', 4: ['87.0', '40.0', '26.63']},
    DateTime: '2021:05:26 16:00:00'}
    */
    var metadata = req.body.metadata;
    var bytes = Buffer.from(S, "base64");
    const name = uuid.v4() + ".jpg";

    // console.log(req.params.userid);
    // Find the user's bucket folder.
    dbConnection.query(
      "SELECT * FROM users WHERE userid = ?",
      [req.params.userid],
      async (err, rows, fields) => {
        if (err) {
          res.status(400).json({
            message: err.message,
            assetid: -1,
          });
          return;
        } //if
        if (rows.length === 0) {
          res.status(200).json({
            message: "no such user...",
            assetid: -1,
          });
          return;
        } //if
        else {
          const user = rows[0];
          const folder = user.bucketfolder;

          const quality = 80;
          const resizedImage = await sharp(bytes)
            .resize(800)
            .jpeg({ quality: quality })
            .toBuffer();

          const newMetadata = { ...metadata, CompressionQuality: quality };
          // i care a lot about your mom :)

          const putObjectParams = {
            Bucket: s3_bucket_name,
            Key: folder + "/" + name,
            Body: resizedImage,
            Metadata: newMetadata,
          };

        try {
          // this is where its erroring !!!!!
          const data = await s3.send(new PutObjectCommand(putObjectParams));
          // update databases
          const location = req.body.metadata["GPSInfo"] || "No GPS Info";
          const dateTaken = req.body.metadata["DateTime"] || "No Date Taken";
    
          dbConnection.query(
            'INSERT INTO assets (userid, assetname, bucketkey) VALUES (?, ?, ?)',
            [req.params.userid, req.body.assetname, folder + "/" + name],
            (err, rows, fields) => {
              if (err) {
                res.status(400).json({
                  "message": err.message,
                  "assetid": -1
                });
                return
              } else {
                // If the insertion into assets is successful, insert into metadata
                const newlyGeneratedAssetId = rows.insertId;

                dbConnection.query(
                  'INSERT INTO metadata (assetid, date_taken, location, created_at, updated_at) VALUES (?, ?, ?)',
                  [newlyGeneratedAssetId, dateTaken, location],
                  (err, rows, fields) => {
                    if (err) {
                      res.status(400).json({
                        "message": err.message,
                        "assetid": -1
                      });
                      return
                    } else {
                      res.status(200).json({
                        "message": "success",
                        "assetid": rows.insertId 
                      });
                      return
                    }
                  }
                  );
                }
              }
            );
          } catch (err) {
            res.status(400).json({
              message: err.message,
              assetid: -1,
            });
          } //catch
        } //else
      }
    ); //query
  } catch (err) {
    //try
    res.status(400).json({
      message: err.message,
      assetid: -1,
    });
  } //catch
}; //post
