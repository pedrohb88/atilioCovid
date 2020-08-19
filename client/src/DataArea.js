import React from 'react'
import PropTypes from 'prop-types'

const DataArea = ({title, count, color}) => {
    return (
        <div className="dataArea" style={{backgroundColor: color, boxShadow: `0 4px 8px 0 ${color}`}}>
            <span className='dataTitle'>{title}</span>
            <span className='dataCount'>{count}</span>
        </div>
    )
}

DataArea.propTypes = {
    title: PropTypes.string.isRequired,
    count: PropTypes.number.isRequired,
}

export default DataArea
