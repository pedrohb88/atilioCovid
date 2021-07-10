import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import ChartPanel from "./ChartPanel";

import { parseInt } from "lodash";
import Loader from "./Loader";
import MainPanel from "./MainPanel";

const initialData = {
	confirmados: {},
	obitos: {},
	cura: {},
	suspeitos: {},
	descartados: {},
	notificados: {},
};

function App() {
	const [data, setData] = useState(initialData);
	const [loading, setLoading] = useState(true);

	const [error, setError] = useState(false)

	useEffect(() => {
		async function fetchData() {
			console.log("trying to fetch data");

			try {

				const response = await axios.get("/data");
				let data = response.data.data;

				Object.keys(data).forEach((type) => {
					if (data[type].dataPoints) {
						data[type].dataPoints = data[type].dataPoints.map((point) => {
							let temp = point.x.split("-");

							return {
								x: new Date(temp[0], parseInt(temp[1]) - 1, temp[2].split('T')[0]),
								y: point.y,
							};
						});
					}
				});

				setData(data);
				setLoading(false);
				setError(false)
			} catch (error) {

				setError(true)

				console.log('request failed')

				if (error.response) {
					console.log(error.response.data.error)
				}

				setTimeout(() => {
					fetchData();
				}, 3000);
			}
		}

		fetchData();
	}, []);

	if (loading && !error) {
		return <Loader msg={"Carregando..."}/>
	} else if(loading && error) {
		return <Loader msg={"Desculpe, houve um erro ao carregar os dados. Vamos continuar tentando. Se o problema persistir, entre em contato com o desenvolvedor através do e-mail: pedrohb88@gmail.com"} />
	} 
	else {
		return (
			<div className="app">
				<div className="header">
					<h1>Boletim Covid-19 de Atílio Vivácqua</h1>
					<p>
						Essa simples aplicação tem como objetivo disponibilizar dados sobre a
						Covid-19 no município de Atílio Vivácqua de forma automatizada. Todos
						os dados são coletados diretamente do site do{" "}
						<a
							target="_blank"
							rel="noopener noreferrer"
							href="https://coronavirus.es.gov.br/painel-covid-19-es"
						>
							Governo do Espírito Santo
						</a>
						.
					</p>
				</div>
				<MainPanel data={data} />
				<ChartPanel data={data} />
				<footer>
					Desenvolvido por{" "}
					<a
						target="_blank"
						rel="noopener noreferrer"
						href="https://www.linkedin.com/in/leal-pedro/"
					>
						Pedro Leal
					</a>
				</footer>
			</div>
		);
	}
}

export default App;
