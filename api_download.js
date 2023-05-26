//
// app.get('/download/:assetid', async (req, res) => {...});
//
// downloads an asset from S3 bucket and sends it back to the
// client as a base64-encoded string.
//
const dbConnection = require('./database.js')
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3, s3_bucket_name, s3_region_name } = require('./aws.js');

exports.get_download = async (req, res) => {

  console.log("call to /download...");

  const assetId = req.params.assetid;

  dbConnection.query('SELECT * FROM assets WHERE assetid = ?', [assetId], async (err, rows, fields) => {
    if (err) {
      return res.status(400).json({
        "message": err.message,
        "user_id": -1,
        "asset_name": "?",
        "bucket_key": "?",
        "data": []
      });
    }

    if (rows.length === 0) {
      return res.status(200).json({
        message: "no such asset...",
        user_id: -1,
        asset_name: "?",
        bucket_key: "?",
        data: []
      });
    }

    const asset = rows[0];
    const objectKey = asset.bucketkey;

    try {
      // Download the object from the S3 bucket
      const getObjectParams = {
        Bucket: s3_bucket_name,
        Key: objectKey
      };
      const s3Object = await s3.send(new GetObjectCommand(getObjectParams));

      // Convert the downloaded object to a base64-encoded string
      const data = await s3Object.Body.transformToString("base64");

      res.status(200).json({
        message: "Success",
        user_id: asset.userid,
        asset_name: asset.assetname,
        bucket_key: objectKey,
        data: data
      });

    } catch (err) {
      res.status(400).json({
        "message": err.message,
        "user_id": -1,
        "asset_name": "?",
        "bucket_key": "?",
        "data": []
      });
    }
  });

}//get