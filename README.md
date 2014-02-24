# eCrud
=============

Enterprise Extensible CRUD Services - This is a complete RESTFul CRUD Service. It also includes the MongoDB experimental text search feature which would work on collections with text indexes, transformation features to convert from PDF, CSV, Form elements to JSON and Images to text through Tesseract library.


## Installation

First install [node.js](http://nodejs.org/) and [mongodb](http://www.mongodb.org/downloads). Then:

    $ npm install ecrud
	
## Overview

### Configure

First, we need to define the configuration. Under the config folder, there is a default.json file.

Edit the file to suit your configuration needs:

		"context": "/ecrud/v1",
        "db": {
                "name": "core",
                "url":"mongodb://localhost:27017/core?connectTimeoutMS=300000"
        },
        "server": {
                "port": 3001,
                "host": "localhost"
        },
        "secureServer": {
                "port": 3002,
                "host": "localhost",
                "options" : {
                        "key": "config/server.key",
                        "cert": "config/server.crt"
                }        
        },

Specify a different db.name in the configuration if you need to use a different name.

### Running eCrud

Under the eCrud/bin folder, there is a server.js file. Run 

	$ node ./bin/server.js

### CRUD Operations

You can use the following CRUD Operations in eCrud:

#### Read

To get documents in the collection:

	GET http://server:port/ecrud/v1/db/collection
	GET http://localhost:3001/ecrud/v1/test/testCollection

To get a single document in the collection:

	GET http://localhost:3001/ecrud/v1/test/testCollection/5246b20ea7702a800800002e

On a single document, you can do JPath:

	GET http://localhost:3001/ecrud/v1/test/testCollection/5246b20ea7702a800800002e?jpath=%22$..author%22
	
Or Query

	GET http://localhost:3001/ecrud/v1/test/testCollection/5246b20ea7702a800800002e?query={%22author%22:%22Author%20Name%22}

#### Create

To store documents in the collection:

	POST http://server:port/ecrud/v1/db/collection
	POST http://localhost:3001/ecrud/v1/test/testCollection

#### Update

To update documents in the collection:

	PUT http://server:port/ecrud/v1/db/collection/documentId
	PUT http://localhost:3001/ecrud/v1/test/testCollection/5246b20ea7702a800800002e

#### Delete

To delete documents in the collection:

	DELETE http://server:port/ecrud/v1/db/collection/documentId
	DELETE http://localhost:3001/ecrud/v1/test/testCollection/5246b20ea7702a800800002e

### HTTP Accept Headers
If you use Accept: application/xml, then all the responses are converted from JSON to XML using the ObjTree library. By default, it is Accept: application/json.

### HTTP Content-Type Headers
If you use Content-Type: application/xml then the request is converted to application/json using the ObjTree library and then stored. You can also use Content-Type: application/x-www-form-urlencoded if you wish to submit a form as key/value pairs. 
If you post plain text file with Content-Type: text/plain then the entire text will be converted to a key/value pair with the key as "text" and value as the contents of the text.

If you wish to post large files into eCrud, use the Content-Type: multipart/form-data.

### Large File Upload
To upload large files into GridFS, ensure that field name is called "file" and the Content-Type is set to multipart/form-data. The data is streamed as chunks into GridFS.

	POST http://server:port/ecrud/v1/db/fs
	POST http://localhost:3001/ecrud/v1/test/fs

### Large File Download
To get the list of large files from GridFS:

	GET http://server:port/ecrud/v1/db/fs
	GET http://localhost:3001/ecrud/v1/test/fs

To get a single file download from GridFS as a stream:

	GET http://server:port/ecrud/v1/db/fs/documentId
	GET http://localhost:3001/ecrud/v1/test/fs/5246b20ea7702a800800002e

### Remove File
To remove a file from GridFS:

	DELETE http://server:port/ecrud/v1/db/fs/documentId
	DELETE http://localhost:3001/ecrud/v1/test/fs/5246b20ea7702a800800002e

### Text Search Feature

To enable text search feature, start MongoDB with:

	$ ./mongod.exe -dbpath <your db path> --setParameter textSearchEnabled=true

In your mongos console:
	
	$ use yourDbName
	$ db.yourCollection.ensureIndex ( {yourKey:"text"} )
	
After that you should be able to search in that collection by doing

	GET http://server:port/ecrud/v1/db/collection/search?text=%22Smith%20-Richard%22

You can also use filters, limits and projections. For more information look into [MongoDB Text Search Capability] (http://docs.mongodb.org/manual/reference/command/text/#dbcmd.text).
	
	GET http://localhost:3001/ecrud/v1/core/medicalNotes/search?text=%22Smith%20-Richard%22&filter={%22loinc%22:%221234567-9%22}&limit=1&project={%22author%22:1,%22_id%22:0}
	

### Transform Feature
You can upload a CSV, JSON file, PDF or Image and it would be converted and stored in MongoDB. The uploaded file is stored in GridFS and then is converted and the converted document is stored in MongoDB Collection. The HTTP Header Content-Type must be set to multipart/form-data and the input value should include "file".


	POST http://server:port/ecrud/v1/db/collection/transform
	POST http://localhost:3001/ecrud/v1/core/medicalNotes/transform
	
You will need to use multipart/form-data as the header. For example - 

curl -F file=@yourfile.pdf;type=application/pdf http://localhost:3001/ecrud/v1/core/pdfCollection/transform --header "Content-Type:multipart/form-data"
curl -F file=@yourfile.tiff;type=image/tiff http://localhost:3001/ecrud/v1/core/pdfCollection/transform --header "Content-Type:multipart/form-data"

#### CSV Upload
The CSV files require the first line to be the header information. Subsequent lines are considered data. 

A CSV example is as follows:
	
	header1, header2, header3
	item1, item2, item3
	item 4, item 5, item 6
	item-7, item-8, item-9
	
#### JSON File

The JSON files are passed in as an array of "documents" as the following:

	{
		"documents": 
		[
			{
				"text": "Ms. Smith is a 43-year-old woman with past medical history that includes a pilonidal cyst.",
				"author": "Test Author",
				"veteranFirstName": "Sally",
				"loinc": "1234567-9"
			},
			{
				"text": "REASON FOR VISIT:Here to get a new primary care physician.,
				"author": "Julian Jewel",
				"veteranFirstName": "Joseph",
				"loinc": "1234567-8"
			}
		]
	}

#### PDF File
PDF files are converted using PDF2Json and a "text" key/value is appended with the entire PDF text for searchability. 

#### Image File
Image files use the Google Tesseract library for OCR and convert the images to text. The converted text is stored in a key/value pair with key as "text" and converted text as value. 
The Google Tesseract library must be in the system path for execution. Click for more information on [Google Tesseract] (https://code.google.com/p/tesseract-ocr/).
