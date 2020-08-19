import React, { Fragment } from "react";
import PropTypes from "prop-types";
import moment from 'moment';

import DataArea from "./DataArea";

const MainPanel = ({ data }) => {
	return (
		<Fragment>
            <p>Última atualização: {moment(data.lastUpdateDate).format('DD/MM/YYYY - HH:mm')}</p>
			<div className="mainPanel">
				<DataArea
					title="Confirmados"
					count={data.confirmados.count}
					color="#e05334"
				/>
				<DataArea
					title="Confirmados e Ativos"
					count={data.ativos.count}
					color="#e02b2b"
				/>
				<DataArea title="Óbitos" count={data.obitos.count} color="#544848" />
				<DataArea title="Curados" count={data.cura.count} color="#46ab4e" />
				<DataArea
					title="Suspeitos"
					count={data.suspeitos.count}
					color="#9167c7"
				/>
				<DataArea
					title="Descartados"
					count={data.descartados.count}
					color="#5b73b5"
				/>
			</div>
		</Fragment>
	);
};

MainPanel.propTypes = {
	data: PropTypes.object.isRequired,
};

export default MainPanel;
