import logo from './logo.svg';
import './App.css';
import {LazyLog, ScrollFollow} from 'react-lazylog';

const url = 'ws://localhost:8081/ws';
let socket = null;

function App() {
    return (
        <div className="App">
            <ScrollFollow
                startFollowing
                render={({onScroll, follow, startFollowing, stopFollowing}) => (
                    <LazyLog
                        enableSearch
                        url={url}
                        websocket
                        websocketOptions={{
                            onOpen: (e, sock) => {
                                socket = sock
                            },
                            onClose: (e, sock) => {
                                socket = null;
                            },
                            // onError: (e, sock) => {
                            //     console(e.toString())
                            // },
                        }}
                    />
                )}
            />
        </div>
    );
}

export default App;
