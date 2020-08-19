import React from "react";
import PropTypes from "prop-types";

import CanvasJSReact from "./util/canvasjs.react";
const CanvasJSChart = CanvasJSReact.CanvasJSChart;

const Chart = ({title, xTitle, yTitle, dataPoints}) => {
	const options = {
		title: {
			text: title,
		},
		theme: 'dark2',
        axisX: {
			title: xTitle,
			valueFormatString: 'DD/MM'
        },
		axisY: {
			title: yTitle,
		},
		data: [
			{
				type: "line",
				xValueFormatString: "DD/MM/YYYY",
				dataPoints: dataPoints,
			},
		],
	};

	return <div className="chart">
		<CanvasJSChart options={options} />
	</div>;
};

Chart.propTypes = {
    title: PropTypes.string.isRequired,
    dataPoints: PropTypes.array.isRequired,
};

export default Chart;
