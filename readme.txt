# 📸 AWS-Based Photo App

This is a multi-tier web application that allows users to upload, search, and manage photos with embedded metadata. The app uses AWS services such as **EC2**, **S3**, and **RDS**, and was deployed using **Elastic Beanstalk**.

---

## 🛠️ Features

### 🖼️ Image Upload & Processing
- Upload images via a client interface
- Extract image metadata (EXIF) on upload:
  - **Location** (GPS coordinates)
  - **Date taken**
  - **Orientation**
  - **Dimensions**
- Images **must include location and date metadata** to be accepted

### 🔍 Metadata-Based Search
- Search photos by:
  - **City name + radius**
  - **Latitude/longitude + radius**
  - **Date range**
  - Option to exclude start/end dates
- Powered by:
  - **GeoPy** for geocoding (city to coordinates)
  - **PostgreSQL with PostGIS/GeoAlchemy** for spatial querying

### 📦 Compression & Storage
- Compress and resize images on upload (quality and dimensions)
- Decompress on download for optimal performance
- Store all images in **Amazon S3**
- Metadata stored in **Amazon RDS (PostgreSQL)**

---

## 🧱 Architecture

- **Frontend**: HTML/JS client to upload and search
- **Backend**: Python Flask API hosted on **AWS EC2** via **Elastic Beanstalk**
- **Database**: AWS **RDS PostgreSQL** with spatial extensions
- **Storage**: AWS **S3** for photo file storage
- **Services**: Integrated with `boto3`, `Pillow`, `ExifRead`, `GeoPy`, and `GeoAlchemy2`

---

## 🚧 Requirements

- Uploaded images must:
  - Be **< 1MB** in size
  - Include **location and date** metadata
- Recommended formats: `.jpg`, `.jpeg`, `.png`

---

## 📎 Example Use Cases

- Upload vacation photos with embedded location data and find them by city name later
- Use GPS search to find all photos taken within a 50-mile radius
- Track photo history by filtering by metadata date range
