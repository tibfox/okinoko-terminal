import { render } from 'preact'
import './index.css'
import { App } from './app.jsx'

import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/animations.css'

import { TransactionProvider } from './transactions/provider';
import { PopupProvider } from "./popup/PopupProvider.jsx";

render(
    <TransactionProvider>
        <PopupProvider>
        <App />
        </PopupProvider>
    </TransactionProvider>    ,
    document.getElementById('app'))
