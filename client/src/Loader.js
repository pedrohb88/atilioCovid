import React from "react";
import "./Loader.css";

const Loader = () => {
	return (
		<div className="loaderContainer">
			<div className="loader">
				<div className="ring"></div>
				<div className="ring"></div>
				<div className="ring"></div>
				<div className="ring"></div>
				<div className="ring"></div>
				<div className="ring"></div>
				<div className="ring"></div>
				<div className="ring"></div>
			</div>
            <span className="loaderText">Carregando...</span>
		</div>
	);
};

export default Loader;
