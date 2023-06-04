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
const moment = require('moment');
const ExifImage = require('exif').ExifImage;
const JPEG = require('jpeg-js');
const exiftool = require('exiftool-vendored').exiftool;


exports.get_download = async (req, res) => {
  console.log("call to /download...");

  const assetId = req.params.assetid;
  const startDate = req.query.start_date;
  const endDate = req.query.end_date;
  const location = req.query.location;
  const locationRange = req.query.location_range;

  let query = `SELECT assets.*, metadata.id as metadata_id, metadata.date_taken, ST_AsText(metadata.location) as location, metadata.created_at as metadata_created_at, metadata.updated_at as metadata_updated_at , metadata.compression_quality as compression_quality, metadata.original_width as original_width, metadata.original_height as original_height FROM assets LEFT JOIN metadata ON assets.assetid = metadata.assetid WHERE assets.assetid = ?`;
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
    const originalWidth = asset.original_width;
    const originalHeight = asset.original_height;
    const compressionQuality = asset.compression_quality;


    try {
      // Download the object from the S3 bucket
      const getObjectParams = {
        Bucket: s3_bucket_name,
        Key: objectKey,
      };
      const s3Object = await s3.send(new GetObjectCommand(getObjectParams));

      // Convert the downloaded object to a buffer
      // const compressedData = Buffer.from(s3Object.Body);

      // // Decompress the image using sharp
      // //TODO: use the original stored size to resize the image, and the quality to rescale the image
      // const decompressedImage = await sharp(compressedData)
      // .resize(original_width, original_height)
      // .jpeg({ quality: compression_quality })
      // .toBuffer();

      // Create a readable stream from the S3 object's body
      const readableStream = s3Object.Body;

      // Convert the readable stream to a buffer
      const buffer = await streamToBuffer(readableStream);

      // Resize and decompress the image using sharp
      
      const decompressedImage = await sharp(buffer)
        .resize(originalWidth, originalHeight)
        .jpeg({ quality: compressionQuality })
        .toBuffer();

      //
      // METADATA MAYBE TOTO
      // 
      // // Parse the input date string
      // const date = moment(asset.date_taken, 'YYYY:MM:DD HH:mm:ss');

      // // Format the date in the EXIF DateTime format
      // const exifDateTime = date.format('YYYY:MM:DD HH:mm:ss');
      
      // // Extract existing EXIF data from the original image
      // // const exifData = await getExifData(buffer);

      // // Add or update the metadata in the EXIF data
      // const gpsInfo = convertPointToGPSInfo(asset.location);
      // const dateTime = convertToExifDateTime(asset.date_taken);
      // const exifData = {
      //   GPSInfo: gpsInfo,
      //   DateTime: dateTime,
      //   ExifImageHeight: parseInt(asset.orignal_height),
      //   ExifImageWidth: parseInt(asset.orignal_width)
      // }

      // Convert the decompressed image to a base64-encoded string
      const data = decompressedImage.toString("base64");

      // // Create a new EXIF metadata object
      // const newExifData = {
      //   exif: exifData,
      // };
      // // newExifData.imageData = newExifData.imageData || {};
      // // newExifData.imageData.exif = exifData;

      // // Add the EXIF data to the decompressed image buffer
      // const imageWithMetadata = await addExifDataToImage(decompressedImage, exifData);

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

// Helper function to convert a readable stream to a buffer
const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
};

// // helper function to preserve GPS Info metaedata
// function convertPointToGPSInfo(pointString) {
//   const regex = /POINT\((-?\d+(\.\d+)?)\s(-?\d+(\.\d+)?)\)/;
//   const matches = pointString.match(regex);

//   if (!matches || matches.length !== 5) {
//     return null; // Invalid point format
//   }

//   const latitude = parseFloat(matches[3]);
//   const longitude = parseFloat(matches[1]);

//   const latitudeRef = latitude >= 0 ? 'N' : 'S';
//   const longitudeRef = longitude >= 0 ? 'E' : 'W';

//   const latitudeDegrees = Math.floor(Math.abs(latitude));
//   const latitudeMinutes = Math.floor((Math.abs(latitude) - latitudeDegrees) * 60);
//   const latitudeSeconds = ((Math.abs(latitude) - latitudeDegrees - latitudeMinutes / 60) * 3600).toFixed(2);

//   const longitudeDegrees = Math.floor(Math.abs(longitude));
//   const longitudeMinutes = Math.floor((Math.abs(longitude) - longitudeDegrees) * 60);
//   const longitudeSeconds = ((Math.abs(longitude) - longitudeDegrees - longitudeMinutes / 60) * 3600).toFixed(2);

//   return {
//     1: latitudeRef,
//     2: [latitudeDegrees, latitudeMinutes, latitudeSeconds],
//     3: longitudeRef,
//     4: [longitudeDegrees, longitudeMinutes, longitudeSeconds],
//   };
// }

// // Helper function to convert a string date to EXIF DateTime format
// const convertToExifDateTime = (dateS) => {
//   const date = moment.utc(dateS).format('YYYY:MM:DD HH:mm:ss');
//   return date;
// };

// // Helper function to add EXIF data to an image buffer
// const addExifDataToImage = async (imageBuffer, exifData) => {
//   return new Promise((resolve, reject) => {
//     const tags = [];
//     Object.entries(exifData).forEach(([tag, value]) => {
//       tags.push(`-${tag}=${value}`);
//     });

//     exiftool.write(imageBuffer, tags, { overwrite_original: true }, (error, buffer) => {
//       if (error) {
//         reject(error);
//       } else {
//         resolve(buffer);
//       }
//     });
//   });
// };
