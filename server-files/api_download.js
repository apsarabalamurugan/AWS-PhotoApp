//
// app.get('/download/:assetid', async (req, res) => {...});
//
// downloads an asset from S3 bucket and sends it back to the
// client as a base64-encoded string.
//
const dbConnection = require("./database.js");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { s3, s3_bucket_name, s3_region_name } = require("./aws.js");

const uuid = require("uuid");
const sharp = require("sharp");

exports.get_download = async (req, res) => {
  console.log("call to /download...");

  const assetId = req.params.assetid;
  const startDate = req.query.start_date;
  const endDate = req.query.end_date;
  const location = req.query.location;
  const locationRange = req.query.location_range;

  let query = `SELECT assets.*, metadata.id as metadata_id, metadata.date_taken, ST_AsText(metadata.location) as location, metadata.created_at as metadata_created_at, metadata.updated_at as metadata_updated_at FROM assets LEFT JOIN metadata ON assets.assetid = metadata.assetid WHERE assets.assetid = ?`;
  let params = [assetId];

  if (startDate) {
    query += " AND metadata.date_taken >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND metadata.date_taken <= ?";
    params.push(endDate);
  }

  if (location) {
    query += ` AND ST_Distance_Sphere(metadata.location, ST_PointFromText(?)) <= ?`;
    params.push(location, locationRange || 10000);
  }

  dbConnection.query(query, params, async (err, rows, fields) => {
    if (err) {
      return res.status(400).json({
        message: err.message,
        user_id: -1,
        asset_name: "?",
        bucket_key: "?",
        data: [],
      });
    }

    if (rows.length === 0) {
      return res.status(200).json({
        message: "no such asset...",
        user_id: -1,
        asset_name: "?",
        bucket_key: "?",
        data: [],
      });
    }

    const asset = rows[0];
    const objectKey = asset.bucketkey;

    try {
      // Download the object from the S3 bucket
      const getObjectParams = {
        Bucket: s3_bucket_name,
        Key: objectKey,
      };
      const s3Object = await s3.send(new GetObjectCommand(getObjectParams));

      // Convert the downloaded object to a buffer
      const compressedData = Buffer.from(s3Object.Body);

      // Decompress the image using sharp
      //TODO: use the original stored size to resize the image, and the quality to rescale the image
      const decompressedImage = await sharp(compressedData).toBuffer();

      // Convert the decompressed image to a base64-encoded string
      const data = decompressedImage.toString("base64");

      res.status(200).json({
        message: "Success",
        user_id: asset.userid,
        asset_name: asset.assetname,
        bucket_key: objectKey,
        data: data,
      });
    } catch (err) {
      res.status(400).json({
        message: err.message,
        user_id: -1,
        asset_name: "?",
        bucket_key: "?",
        data: [],
      });
    }
  });
}; //get
