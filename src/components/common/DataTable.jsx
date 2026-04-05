const cellStyle = {
  padding: '0.35rem 0.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  fontSize: 'var(--font-size-base)',
  fontFamily: 'var(--font-family-base)',
  textAlign: 'left',
}

const headerCellStyle = {
  ...cellStyle,
  fontWeight: 600,
  position: 'sticky',
  top: 0,
  background: 'var(--color-primary-darkest)',
  zIndex: 1,
}

/**
 * Reusable data table component.
 *
 * @param {object} props
 * @param {Array<{ label: string, style?: object } | string>} props.headers
 * @param {Array<{ key: string, cells: Array<{ content: any, style?: object } | any> }>} props.rows
 * @param {object} [props.style] - Optional style overrides on the outer wrapper div.
 */
export default function DataTable({ headers = [], rows = [], style }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map((h, i) => {
              const label = typeof h === 'string' ? h : h.label
              const hStyle = typeof h === 'object' && h.style
                ? { ...headerCellStyle, ...h.style }
                : headerCellStyle
              return <th key={i} style={hStyle}>{label}</th>
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} onClick={row.onClick} style={row.onClick ? { cursor: 'pointer' } : undefined}>
              {row.cells.map((cell, i) => {
                const isObj = cell != null && typeof cell === 'object'
                const content = isObj && 'content' in cell ? cell.content : cell
                const cStyle = isObj && cell.style
                  ? { ...cellStyle, ...cell.style }
                  : cellStyle
                const colSpan = isObj && cell.colSpan ? cell.colSpan : undefined
                return <td key={i} style={cStyle} colSpan={colSpan}>{content}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
