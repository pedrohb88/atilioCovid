import React from 'react'
import PropTypes from 'prop-types'
import Chart from './Chart';

const ChartPanel = ({data}) => {

    return (
        <div className="chartPanel">
            <Chart title='Casos Confirmados' yTitle='Confirmações' dataPoints={data.confirmados.dataPoints}/>
            <Chart title='Casos Confirmados e Ativos' yTitle='Casos' dataPoints={data.ativos.dataPoints}/>
            <Chart title='Óbitos' yTitle='Casos' dataPoints={data.obitos.dataPoints}/>
            <Chart title='Casos Curados' yTitle='Casos' dataPoints={data.cura.dataPoints}/>
            <Chart title='Casos Suspeitos' yTitle='Casos' dataPoints={data.suspeitos.dataPoints}/>
            <Chart title='Casos Descartados' yTitle='Casos' dataPoints={data.descartados.dataPoints}/>
            <Chart title='Casos Notificados' yTitle='Casos' dataPoints={data.notificados.dataPoints}/>
        </div>
    )
}

ChartPanel.propTypes = {
    data: PropTypes.object.isRequired,
}

export default ChartPanel
