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

	{
		"db": {
			"url":"mongodb://localhost:27017/test?connectTimeoutMS=300000"
		},
		"server": {
			"port": 3001,
			"host": "localhost"
		},
		"accessControl": {
			"allowOrigin": "*",
			"allowMethods": "GET,POST,PUT,DELETE,HEAD,OPTIONS"
		},
		"debug": true
	}

### Running eCrud

Under the eCrud/bin folder, there is a server.js file. Run 

	$ node ./bin/server.js

### CRUD Operations

You can use the following CRUD Operations in eCrud:

To get documents in the collection:

	GET http://server:port/db/collection
	GET http://localhost:3001/test/testCollection

To store documents in the collection:

	POST http://server:port/db/collection
	POST http://localhost:3001/test/testCollection
	
### Text Search Feature

To enable text search feature, start MongoDB with:

	$ ./mongod.exe -dbpath <your db path> --setParameter textSearchEnabled=true

In your mongos console:
	
	$ use yourDbName
	$ db.yourCollection.ensureIndex ( {yourKey:"text"} )
	
After that you should be able to search in that collection by doing

	GET http://server:port/db/collection/search?text=%22Smith%20-Richard%22

You can also use filters, limits and projections. For more information look into [MongoDB Text Search Capability] (http://docs.mongodb.org/manual/reference/command/text/#dbcmd.text).
	
	GET http://localhost:3001/core/medicalNotes/search?text=%22Smith%20-Richard%22&filter={%22loinc%22:%221234567-9%22}&limit=1&project={%22author%22:1,%22_id%22:0}

### HTTP Accept Headers
If you use Accept: application/xml, then all the responses are converted from JSON to XML using the ObjTree library. By default, it is Accept: application/json.

### HTTP Content-Type Headers
If you use Content-Type: application/xml then the request is converted to application/json using the ObjTree library and then stored. You can also use Content-Type: application/x-www-form-urlencoded if you wish to submit a form as key/value pairs. If you post plain text file with Content-Type: text/plain then the entire text will be converted to a key/value pair with the key as "text" and value as the contents of the text.