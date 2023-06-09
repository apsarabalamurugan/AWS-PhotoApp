Group Members: Apsara Balamurugan, Eli Barlow, Isaac Miller, Spencer Rothfleisch

Our project is the suggested project 2 extension option, but we added a few extra features / requirements.  The main functions are as follows:
1) Image Metadata Extraction (specifically image dimensions, location, date, and orientation)
2) Search by Metadata (location and date)
3) Image compression (quality compression and resizing) on upload, and decompression on download

The following are the requirements for the user:
1) Users MUST upload photos with location and date metadata, otherwise they will not be uploaded to the bucket
    This ensures that our metadata functionality works effectively.
2) Users can search for photos with location and date metadata in the following ways:
    Location: By latitude and longitude OR with a city name, along with a radial distance (miles) of how far from the specified location they want to search
        We did this using the geopy Python client as well as using the ST_Geom type in SQL 
    Date: Using a start/end date range. They have the option to exclude a start or end date if they'd like to.
