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
const { exit } = require("process");

// Converts the coordinates and direction to a point
function convertToSQLPoint(
  latitudeDirection,
  latitudeCoordinates,
  longitudeDirection,
  longitudeCoordinates
) {
  const latitude = latitudeCoordinates
    .map(parseFloat)
    .reduce((acc, val, index) => acc + val / Math.pow(60, index), 0);
  const longitude = longitudeCoordinates
    .map(parseFloat)
    .reduce((acc, val, index) => acc + val / Math.pow(60, index), 0);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error("Latitude or longitude coordinates are not a number");
  }

  const latitudeSign = latitudeDirection.toUpperCase() === "N" ? 1 : -1;
  const longitudeSign = longitudeDirection.toUpperCase() === "E" ? 1 : -1;

  const point = `POINT(${latitude * latitudeSign} ${
    longitude * longitudeSign
  })`;

  return point;
}

// Function to validate the location
function isValidLocation(location) {
  // Regular expression pattern to extract latitude and longitude values
  const pattern = /^POINT\((-?\d+(\.\d+)?) (-?\d+(\.\d+)?)\)$/;

  // Extract latitude and longitude using regular expression match
  const matches = location.match(pattern);

  if (matches && matches.length === 5) {
    const latitude = parseFloat(matches[1]);
    const longitude = parseFloat(matches[3]);

    // Define latitude and longitude ranges
    const validLatitudeRange = [-90, 90];
    const validLongitudeRange = [-180, 180];

    // Check if latitude and longitude are within valid ranges
    if (
      latitude >= validLatitudeRange[0] &&
      latitude <= validLatitudeRange[1] &&
      longitude >= validLongitudeRange[0] &&
      longitude <= validLongitudeRange[1]
    ) {
      return true; // Valid location
    }
  }

  return false; // Invalid location
}

// Posts the image to S3, metadata and other info to RDS
exports.post_image = async (req, res) => {
  console.log("call to /image...");

  try {
    /* Data example for reference:
    {GPSInfo: {1: 'N', 2: ['41.0', '52.0', '50.45'], 3: 'W', 4: ['87.0', '40.0', '26.63']},
    DateTime: '2021:05:26 16:00:00'}
    */

    // get location
    const { GPSInfo, Orientation, DateTime, ExifImageWidth, ExifImageHeight } =
      req.body.metadata;

    const {
      1: latitudeDirection,
      2: latitudeCoordinates,
      3: longitudeDirection,
      4: longitudeCoordinates,
    } = GPSInfo;
    const pointLocation = convertToSQLPoint(
      latitudeDirection,
      latitudeCoordinates,
      longitudeDirection,
      longitudeCoordinates
    );

    // Check if location is valid
    if (isValidLocation(pointLocation) == false) {
      throw new Error("Invalid latitude or longitude coordinates");
    }

    // get date
    const [datePart, timePart] = DateTime.split(" ");
    const [year, month, day] = datePart.split(":");
    const [hour, minute, second] = timePart.split(":");
    const dateTime = new Date(year, month - 1, day, hour, minute, second);

    // Checks if date object is invalid
    if (isNaN(dateTime)) {
      throw new Error("Date does not exist or is invalid");
    }

    // get image width and height
    const width = ExifImageWidth;
    const height = ExifImageHeight;

    var bytes = Buffer.from(req.body.data, "base64");
    const name = uuid.v4() + ".jpg";

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
          // let's set the default quality to 80 and default scaled down image width to 800, but these can be modified
          const imageSize = Math.min(width, 800);
          console.log(
            `shrinking image to ${
              imageSize * (height / width)
            }x${imageSize} pixels wide for S3 storage`
          );
          const quality = 80;
          const resizedImage = await sharp(bytes)
            .resize(imageSize)
            .jpeg({ quality: quality })
            .toBuffer();

          const newMetadata = {
            location: pointLocation,
            dateTaken: DateTime,
            CompressionQuality: String(quality),
            ImageWidth: String(width),
            ImageHeight: String(height),
            Orientation: String(Orientation),
          };

          //TODO: remove this
          console.log("ExifOrientation: " + Orientation);

          const putObjectParams = {
            Bucket: s3_bucket_name,
            Key: folder + name,
            Body: resizedImage,
            Metadata: newMetadata,
          };

          try {
            const data = await s3.send(new PutObjectCommand(putObjectParams));
            // update databases
            const location = pointLocation;
            const dateTaken = dateTime;

            dbConnection.query(
              "INSERT INTO assets (userid, assetname, bucketkey) VALUES (?, ?, ?)",
              [req.params.userid, req.body.assetname, folder + name],
              (err, rows, fields) => {
                if (err) {
                  res.status(400).json({
                    message: err.message,
                    assetid: -1,
                  });
                  return;
                } else {
                  // If the insertion into assets is successful, insert into metadata
                  const newlyGeneratedAssetId = rows.insertId;

                  dbConnection.query(
                    "INSERT INTO metadata (assetid, date_taken, location, compression_quality, original_width, original_height, original_orientation) VALUES (?, ?, ST_GeomFromText(?), ?, ?, ?, ?)",
                    [
                      newlyGeneratedAssetId,
                      dateTaken,
                      location,
                      quality,
                      width,
                      height,
                      Orientation,
                    ],
                    (err, rows, fields) => {
                      if (err) {
                        res.status(400).json({
                          message: err.message,
                          assetid: -1,
                        });
                        return;
                      } else {
                        res.status(200).json({
                          message: "success",
                          assetid: newlyGeneratedAssetId,
                        });
                        return;
                      }
                    }
                  );
                }
              }
            );
          } catch (err) {
            console.log(err);
            res.status(400).json({
              message: err.message,
              assetid: -1,
            });
          } //catch
        } //else
      }
    ); //query
  } catch (err) {
    console.log(err);
    //try
    res.status(400).json({
      message: err.message,
      assetid: -1,
    });
  } //catch
}; //post
