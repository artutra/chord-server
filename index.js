const express = require('express');
const dotenv = require('dotenv');
const MongoClient = require('mongodb');
const pino = require("pino");
const bodyParser = require('body-parser')

dotenv.config();

const app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
})); 
// Add headers
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8000');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,X-CSRFToken');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});
const logger = pino();

const server = app.listen(process.env.SERVER_PORT, () => {
	logger.info(`cifrabox-chords listening on port ${process.env.SERVER_PORT}`);
});

var connection = null;
var collection = null;

MongoClient.connect(process.env.MONGO_URI, (err, database) => {
    if(err == null)
        console.log("Connected correctly to server");
    else
        console.log(err)
    connection = database;
    collection = database.collection('chords');
    collection.drop()
    if(!collection){
    	console.log("Collection is null");
	    connection.createCollection('chords', (err, col) => {
	        if(err == null)
	            console.log("Collection created successfully")
	        collection = col;
	        populateDatabase(()=>{
				listenRoute()
			})
	    });
    }else {
		collection.count(function(err, count) {
			if(count > 0){
				listenRoute()
			} else {
				populateDatabase(()=>{
					listenRoute()
				})
			}
		});
    }
})

function populateDatabase(cb, index=0){
	const arq = require("./chords/results.json")
	arq.forEach((obj, i)=>{
		collection.insertOne(obj, (err, r) => {
			if(err) console.log(err)
		});
	});
	console.log("Finished import results.json");
	cb()
}

function listenRoute(){
	app.get('/api/chords/v1', function (req, res) {
		var chord = req.query['chord']
		if(chord){
			chord = chord.replace(/(\d)\+/g,'Maj$1')
			collection.findOne({name:chord},function(err, docs) {
				res.send(docs)
			});
		}else{
			res.send({detail: 'Chord invalid'})
		}
	})
	app.get('/api/chords', (req, res)=>{
		console.log("worked")
		res.json({"detail":"successfully created"})
	});
}