const path = require("path");
const fs = require("fs");
const https = require("https");
const csv = require("csv-parser");
const _ = require("lodash");
const moment = require("moment-timezone");

const Data = require("./models/Data");

const jsonDataFilePath = path.join(__dirname, "..", "data.json");

function getCaseDate(caseObj) {
	if (caseObj.DataEncerramento) return caseObj.DataEncerramento;
	if (caseObj.DataColetaTesteRapido) return caseObj.DataColetaTesteRapido;
	if (caseObj.DataColeta_RT_PCR) return caseObj.DataColeta_RT_PCR;
	if (caseObj.DataCadastro) return caseObj.DataCadastro;
	if (caseObj.DataNotificacao) return caseObj.DataNotificacao;
	if (caseObj.DataDiagnostico) return caseObj.DataDiagnostico;
}

function setDataPointsObj(dataPointsObj, type, data) {
	let caseDate = getCaseDate(data);
	if (Object.keys(dataPointsObj[type]).indexOf(caseDate) === -1) {
		dataPointsObj[type][caseDate] = 1;
	} else {
		dataPointsObj[type][caseDate]++;
	}
}

function setupResultDataPoints(specificDataPointsObject, type, results) {
	Object.keys(specificDataPointsObject).forEach((key) => {
		let val = specificDataPointsObject[key];

		results[type].dataPoints.push({
			x: key,
			y: val,
		});
	});

	let acum = 0;
	results[type].dataPoints.sort((a, b) => {
		if (moment(a.x).isAfter(b.x)) return 1;
		return -1;
	});

	results[type].dataPoints = results[type].dataPoints.map((v) => {
		let newY = v.y + acum;
		acum = newY;
		return { x: v.x, y: newY };
	});
}

function readDataFromServer() {
	return new Promise((resolve, reject) => {
		console.log("entrou no read");
		const readStream = fs.createReadStream("dados.csv", { encoding: "binary" });

		readStream.on("open", () => {
			console.log("Start reading data from server");

			let results = {
				confirmados: { count: 0, dataPoints: [] },
				obitos: { count: 0, dataPoints: [] },
				cura: { count: 0, dataPoints: [] },
				suspeitos: { count: 0, dataPoints: [] },
				descartados: { count: 0, dataPoints: [] },
				notificados: { count: 0, dataPoints: [] },
				ativos: { count: 0, dataPoints: [] },
			};

			let parsedReadStream = readStream.pipe(csv({ separator: ";" }));

			let dataPointsObj = {
				confirmados: {},
				obitos: {},
				cura: {},
				suspeitos: {},
				descartados: {},
				notificados: {},
				ativos: {},
			};

			parsedReadStream.on("data", (data) => {
				if (data.Municipio === "ATILIO VIVACQUA") {
					switch (data.Classificacao) {
						case "Confirmados":
							results.confirmados.count++;
							setDataPointsObj(dataPointsObj, "confirmados", data);

							if (data.Evolucao === "Cura") {
								results.cura.count++;
								setDataPointsObj(dataPointsObj, "cura", data);
							}
							break;

						case "Suspeito":
							results.suspeitos.count++;
							setDataPointsObj(dataPointsObj, "suspeitos", data);
							break;

						case "Descartados":
							results.descartados.count++;
							setDataPointsObj(dataPointsObj, "descartados", data);
							break;

						default:
							break;
					}

					if (data.DataNotificacao !== "") {
						setDataPointsObj(dataPointsObj, "notificados", data);
						results.notificados.count++;
					}

					if (
						data.StatusNotificacao === "Em Aberto" &&
						data.Classificacao == "Confirmados"
					) {
						setDataPointsObj(dataPointsObj, "ativos", data);
						results.ativos.count++;
					}

					if (
						data.Evolucao === "Óbito pelo COVID-19" &&
						data.StatusNotificacao === "Encerrado" &&
						data.DataObito !== ""
					) {
						results.obitos.count++;
						setDataPointsObj(dataPointsObj, "obitos", data);
					}
				}
			});

			parsedReadStream.on("end", () => {
				console.log("Finish reading data from server");

				parsedReadStream.destroy();

				Object.keys(dataPointsObj).forEach((key) => {
					setupResultDataPoints(dataPointsObj[key], key, results);
				});

				resolve(results);
			});
		});
	});
}

function fetchDataAndWriteToServer() {
	return new Promise((resolve, reject) => {
		console.log("entrou no write");
		const writeStream = fs.createWriteStream("dados.csv");

		console.log("Start gettin data from web and writing");
		https.get(
			"https://bi.static.es.gov.br/covid19/MICRODADOS.csv",
			(response) => {
				response.pipe(writeStream);

				writeStream.on("finish", async () => {
					console.log("Finish writing data to server");
					writeStream.destroy();

					resolve();
				});
			}
		);
	});
}

async function isDataUpdated() {
	//if there is a data file, check for last update date

	let result = await Data.find({});
	if (result && result.length) {
		let data = result[0];

		if (!data.lastUpdateDate) return false;

		const now = moment().tz("America/Sao_Paulo");

		//if the current day is after the last update day, should update data
		if (now.isAfter(data.lastUpdateDate, "day")) {
			console.log("current day after last update day");
			return false;
		}

		//if the current day is the last update day, check for hours
		if (now.isSame(data.lastUpdateDate, "day")) {
			console.log("current day is the same as last update day");
			const nowHour = moment({
				h: now.hours(),
				m: now.minutes(),
				s: now.seconds(),
			}).tz("America/Sao_Paulo");

			const toUpdateHour = moment({
				h: 18,
				m: 0,
				s: 0,
			}).tz("America/Sao_Paulo");

			const lastUpdate = moment(data.lastUpdateDate).tz("America/Sao_Paulo");
			const lastUpdateHour = moment({
				h: lastUpdate.hours(),
				m: lastUpdate.minutes(),
				s: lastUpdate.seconds(),
			}).tz("America/Sao_Paulo");

			//if the data has not been updated after 18:00pm and the current time is after 18:00pm, should update data
			if (
				lastUpdateHour.isBefore(toUpdateHour) &&
				nowHour.isAfter(toUpdateHour)
			) {
				console.log("current hour is after last update hour");
				return false;
			}
		}
	} else {
		console.log("no data on DB, should update");
		return false;
	}

	console.log('no need to update data');
	return true;
}

function setupData() {
	return new Promise( async (resolve, reject) => {
		if (await isDataUpdated()) return;

		fetchDataAndWriteToServer()
			.then(() => {
				return readDataFromServer();
			})
			.then((result) => {
				result.lastUpdateDate = moment().tz("America/Sao_Paulo");

				console.log("saving result on DB");
				Data.deleteMany({}).then(() => {
					let data = new Data(result);
					data.save().then(() => {
						console.log('finish saving result on DB');
						resolve();
					});
				});
			});
	});
}

module.exports = {
	jsonDataFilePath,
	setupData,
};
