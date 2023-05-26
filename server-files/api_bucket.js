//
// app.get('/bucket?startafter=bucketkey', async (req, res) => {...});
//
// Retrieves the contents of the S3 bucket and returns the 
// information about each asset to the client. Note that it
// returns 12 at a time, use startafter query parameter to pass
// the last bucketkey and get the next set of 12, and so on.
//
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { s3, s3_bucket_name, s3_region_name } = require('./aws.js');

exports.get_bucket = async (req, res) => {

  console.log("call to /bucket...");

  try {

    //
    // TODO: remember, 12 at a time...  Do not try to cache them here, instead 
    // request them 12 at a time from S3
    //
    // AWS:
    //   https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
    //   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/listobjectsv2command.html
    //   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
    
    // Create the parameters for calling
    // listObjectsV2
    const page_size = 12; // number of assets to return per page
    const startafter = req.query.startafter; // start after this key

    // Create the parameters for calling listObjectsV2
    const params = {
      Bucket: s3_bucket_name,
      MaxKeys: page_size,
      Prefix: '', // retrieve all objects in the bucket
      StartAfter: startafter // retrieve objects after this key
    };
    
    var { Contents, IsTruncated, KeyCount } = await s3.send(new ListObjectsV2Command(params));
    // Map the Contents array to an array of objects with Key and LastModified properties
    data = Contents
    if (KeyCount === 0) {
      data = [];
    }
    // const assets = Contents.map(({ Key, LastModified }) => ({ Key, LastModified }));
    // If the request is successful but there are no assets, return an empty array
    res.status(200).json({
      message: "Success",
      data
    });
    

  }//try
  catch (err) {
    res.status(400).json({
      "message": err.message,
      "data": []
    });
  }//catch

}//get
