### A Modern Trello Client For Browsers/Electron

This is still a WIP, but is an attempt to port Trello's [client.js](https://developers.trello.com/clientjs) to be more useful
in a modern setup.  It loses the jQuery dependency, instead depending on fetch and promises.  

Currently it is only usable in modern browsers, I intend to make it easier to use with fetch polyfills on Node, and may explore
transpiling away the ES6 features currently used in the code.  This is early days, but contributions are welcome. 
