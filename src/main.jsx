import { render } from 'preact'
import './index.css'
import { App } from './app.jsx'

import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/animations.css'
import { Provider } from "urql";
import { urqlClient } from "./lib/graphql";

import { TransactionProvider } from './transactions/provider';
import { PopupProvider } from "./popup/PopupProvider.jsx";

render(
     <Provider value={urqlClient}>
    <TransactionProvider>
        <PopupProvider>
        <App />
        </PopupProvider>
    </TransactionProvider>
    </Provider>,
    document.getElementById('app'))
