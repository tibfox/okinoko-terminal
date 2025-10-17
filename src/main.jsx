import { render } from 'preact'
import './index.css'
import { App } from './app.jsx'

import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/animations.css'

render(<App />, document.getElementById('app'))
