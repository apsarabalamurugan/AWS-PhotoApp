#
# Client-side python app for photoapp, this time working with
# web service, which in turn uses AWS S3 and RDS to implement
# a simple photo application for photo storage and viewing.
#
# Project 02 for CS 310, Spring 2023.
#
# Authors:
#   Isaac Miller
#   Eli Barlow
#   Apsi Balamurgan
#   Spencer Rothfleisch
#   Prof. Joe Hummel (initial template)
#   Northwestern University
#   Spring 2023
#

import requests  # calling web service
import jsons  # relational-object mapping
from PIL import Image
from PIL.ExifTags import TAGS
import uuid
import pathlib
import logging
import sys
import os
import base64

from configparser import ConfigParser

import matplotlib.pyplot as plt
import matplotlib.image as img


###################################################################
#
# classes
#
class User:
  userid: int  # these must match columns from DB table
  email: str
  lastname: str
  firstname: str
  bucketfolder: str


class Asset:
  assetid: int  # these must match columns from DB table
  userid: int
  assetname: str
  bucketkey: str

class DownloadedAsset:
  user_id: int
  asset_name: str
  bucket_key: str
  data: str

class BucketItem:
  Key: str      # these must match columns from DB table
  LastModified: str
  ETag: str
  Size: int
  StorageClass: str


###################################################################
#
# prompt
#
def prompt():
  """
  Prompts the user and returns the command number
  
  Parameters
  ----------
  None
  
  Returns
  -------
  Command number entered by user (0, 1, 2, ...)
  """
  print()
  print(">> Enter a command:")
  print("   0 => end")
  print("   1 => stats")
  print("   2 => users")
  print("   3 => assets")
  print("   4 => download")
  print("   5 => download and display")
  print("   6 => bucket contents")
  print("   7 => upload image") 

  cmd = int(input())
  return cmd


###################################################################
#
# stats
#
def stats(baseurl):
  """
  Prints out S3 and RDS info: bucket status, # of users and 
  assets in the database
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    api = '/stats'
    url = baseurl + api

    res = requests.get(url)
    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # deserialize and extract stats:
    #
    body = res.json()
    #
    print("bucket status:", body["message"])
    print("# of users:", body["db_numUsers"])
    print("# of assets:", body["db_numAssets"])

  except Exception as e:
    logging.error("stats() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


###################################################################
#
# users
#
def users(baseurl):
  """
  Prints out all the users in the database
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    api = '/users'
    url = baseurl + api

    res = requests.get(url)

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # deserialize and extract users:
    #
    body = res.json()
    #
    # let's map each dictionary into a User object:
    #
    users = []
    for row in body["data"]:
      user = jsons.load(row, User)
      users.append(user)
    #
    # Now we can think OOP:
    #
    for user in users:
      print(user.userid)
      print(" ", user.email)
      print(" ", user.lastname, ",", user.firstname)
      print(" ", user.bucketfolder)

  except Exception as e:
    logging.error("users() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return
  

###################################################################
# assets
#
def assets(baseurl):
  """
  Prints out all the assets in the database
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    api = '/assets'
    url = baseurl + api

    res = requests.get(url)

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # deserialize and extract users:
    #
    body = res.json()
    #
    # let's map each dictionary into a User object:
    #
    assets: list[Asset] = []
    for row in body["data"]:
      asset = jsons.load(row, Asset)
      assets.append(asset)
    #
    # Now we can think OOP:
    #
    for asset in assets:
      print(asset.assetid)
      print(" ", asset.userid)
      print(" ", asset.assetname)
      print(" ", asset.bucketkey)

  except Exception as e:
    logging.error("assets() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return

###################################################################
# download
#
def download(baseurl, display=False):
  """
  Prompts for assetid and downloads the asset
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # prompt for assetid:
    #
    print("Enter asset id>")
    assetid = input()

    #
    # call the web service:
    #
    api = '/download'
    url = baseurl + api + '/' + assetid

    res = requests.get(url)

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # deserialize and extract asset:
    #
    body = res.json()
    asset = jsons.load(body, DownloadedAsset)

    if asset.user_id == -1:
      print("No such asset...")
      return
    print("userid:", asset.user_id)
    print("asset name:", asset.asset_name)
    print("bucket key:", asset.bucket_key)
    print("Downloaded from S3 and saved as ' ", asset.asset_name, " '")

    #
    # write asset to file:
    #
    with open(asset.asset_name, 'wb') as f:
      f.write(base64.b64decode(asset.data))

    if display:
      # display the image using matplotlib:
      image = img.imread(asset.assetname)
      plt.imshow(image)
      plt.show()


  except Exception as e:
    logging.error("download() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return
  
###################################################################
# bucket
#
def bucket(baseurl, startafter=""):
  """
  Prints out all the assets in the bucket
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    api = '/bucket'
    url = baseurl + api
    if startafter != "":
      url += "?startafter=" + startafter
    res = requests.get(url)

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # deserialize and extract BucketItem:
    #
    body = res.json()
    #
    # let's map each dictionary into a BucketItem object:
    #
    assets: list[BucketItem] = []
    for row in body["data"]:
      asset = jsons.load(row, BucketItem)
      assets.append(asset)
    #
    # Now we can think OOP:
    #
    for asset in assets:
      print(asset.Key)
      print(" ", asset.LastModified)
      print(" ", asset.Size)

    if len(assets) == 0:
      return
    
    showMore = input("another page? [y/n]\n")
    if showMore == "y":
      bucket(baseurl, assets[-1].Key)

  except Exception as e:
    logging.error("bucketcontents() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return
#########################################################################
#
# upload image
#
# helper function to extract jpeg metadata
def get_jpeg_exif(file_path):
    with Image.open(file_path) as img:
        exif = img._getexif()

    relevant_metadata = {}
    relevant_exif_tags = ["DateTimeOriginal"]
    if exif is None:
      print("No exif metadata found")
      return
    
    for tag_id, value in exif.items():
      tag = TAGS.get(tag_id, tag_id)
      if tag == "DateTimeOriginal":
        relevant_metadata[tag] = value

    return relevant_metadata  


def upload_image(baseurl:str):
  try:
    print("Enter asset name>")
    assetname = input()
    print("Enter user id>")
    userid = input()

    api = '/image/' + userid
    url = baseurl + api

    with open(assetname, 'rb') as f:
      image_data = f.read()
    
    image_data = base64.b64encode(image_data).decode('utf-8')
    image_metadata = get_jpeg_exif(assetname)

    # print(image_metadata)

    data = {
      "assetname": assetname,
      "data": image_data,
      "metadata": image_metadata
    }
    return

    res = requests.post(url, json=data)

    if res.status_code != 200:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:
        body = res.json()
        print("Error message:", body["message"])
      return
    elif res.status_code == 200:
      if res.json()['message'] == 'no such user...':
        print("No such user...")
        return
      else:
       print("Image uploaded successfully!")
       print("uploaded to RDS with assetid:", res.json()['assetid'])

  except Exception as e:
    logging.error("upload_image() failed:")
    logging.error("url: " + url)
    logging.error("assetname: " + assetname)
    logging.error(e)
    return
#########################################################################
# main
#
print('** Welcome to PhotoApp v2 **')
print()

# eliminate traceback so we just get error message:
sys.tracebacklimit = 0

#
# what config file should we use for this session?
#
config_file = 'photoapp-client-config'

print("What config file to use for this session?")
print("Press ENTER to use default (photoapp-config),")
print("otherwise enter name of config file>")
s = input()

if s == "":  # use default
  pass  # already set
else:
  config_file = s

#
# does config file exist?
#
if not pathlib.Path(config_file).is_file():
  print("**ERROR: config file '", config_file, "' does not exist, exiting")
  sys.exit(0)

#
# setup base URL to web service:
#
configur = ConfigParser()
configur.read(config_file)
baseurl = configur.get('client', 'webservice')
#
# main processing loop:
#
cmd = prompt()

while cmd != 0:
  #
  if cmd == 1:
    stats(baseurl)
  elif cmd == 2:
    users(baseurl)
  elif cmd == 3:
    assets(baseurl)
  elif cmd == 4:
    download(baseurl)
  elif cmd == 5:
    download(baseurl, True)
  elif cmd == 6:
    bucket(baseurl)
  elif cmd == 7:
    upload_image(baseurl)
  else:
    print("** Unknown command, try again...")
  #
  cmd = prompt()

#
# done
#
print()
print('** done **')
