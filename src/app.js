const express = require("express");
const fs = require("fs");
const path = require("path");

const {jsonDataFilePath, setupData} = require('./data');
const Data = require('./models/Data');

const app = express();

app.use(express.json());

let isLoadingData = false;

app.get("/data", async (req, res) => {

	if(isLoadingData)
		return res.status(400).json({msg: 'Data is updating'});

	let result = await Data.find({});

	if((!result || !result.length) && !isLoadingData){
		isLoadingData = true;
		setupData().then(() => {
			isLoadingData = false;
		});
		return res.status(400).json({msg: 'Data is updating'});
	}

	const data = result[0];
	return res.json(data);	
});

// Server static assets in produdction
if (process.env.NODE_ENV === "production") {
	// Set static folder
	app.use(express.static("client/build"));

	app.get("*", (req, res) => {
		res.sendFile(
			path.resolve(__dirname, "..", "client", "build", "index.html")
		);
	});
}

module.exports = app;
