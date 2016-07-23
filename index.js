var slice = [].slice;

var deferred = {};

var ready = {};

var waitUntil = function(name, fx) {
    if (ready[name] != null) {
        return fx(ready[name]);
    } else {
        return (deferred[name] != null ? deferred[name] : deferred[name] = []).push(fx);
    }
};

var isReady = function(name, value) {
    var fx, fxs, i, len;
    ready[name] = value;
    if (deferred[name]) {
        fxs = deferred[name];
        delete deferred[name];
        for (i = 0, len = fxs.length; i < len; i++) {
            fx = fxs[i];
            fx(value);
        }
    }
};

class Trello  {

    constructor(key, options={}) {
        this.setKey(key);
        this.version = 1
        this.storagePrefix = 'trello_';
        this.baseURL = 'https://api.trello.com/' + this.version + '/';
        this.authEndpoint = 'https://trello.com';
        this._token = null;
        this.fetch = options.fetch;
        this.openLink = options.openLink;
    }

    version() {
      return this.version;
    }

    key() {
      return this.key;
    }

    setKey(newKey) {
      this.key = newKey;
    }

    token() {
      return this._token;
    }

    setToken(newToken) {
      this._token = newToken;
    }

    rest(method, ...args) {
        var paramsStr = '';
        var [path, params, success, error] = this.parseRestArgs(args);
        var options = {
            headers: {
                'Accept': 'application/json',
            },
            mode: 'cors',
            method,
        }

        var data = {
            key: this.key,
            token: this._token,
        };

        Object.assign(data, params);

        if (['head', 'get'].indexOf(method.toLowerCase()) === -1) {
            options.body = JSON.stringify(data);
        } else {
            let params = Object.keys(data).map(key => `${key}=${data[key]}`);
            paramsStr = `?${params.join('&')}`;
        }
        var url = "" + this.baseURL + path + paramsStr;

        var onSuccess = (response) => {
            return new Promise((resolve, reject) => response.json().then(resolve));
        };
        var fetch = this.fetch || window.fetch;
        return fetch(url, options).then(onSuccess).catch(error);
    }

    authorized() {
      return this._token != null;
    }

    deauthorize() {
      this._token = null;
      this.writeStorage("token", this._token);
    }

    authorize(userOpts) {
        return new Promise((resolve, reject) => {
            //TODO:: This is no longer recursive (a bug)
            var opts = Object.assign({
                type: "redirect",
                persist: true,
                interactive: true,
                scope: {
                  read: true,
                  write: false,
                  account: false
                },
                expiration: "30days"
            }, userOpts);
            var regexToken = /[&#]?token=([0-9a-f]{64})/;
            //TODO: Cleanup with lodash
            var urlMatch= regexToken.exec(location.hash);
            this._token = urlMatch && urlMatch.length > 1 ? urlMatch[1] : this._token;
            var persistToken = () => {
                if (opts.persist && (this._token != null)) {
                  return this.writeStorage("token", this._token);
                }
            };
            if (opts.persist) {
                if (this._token == null) {
                  this._token = this.readStorage("token");
                }
            }
            if (this.authorized()) {
                persistToken();
                window.location.hash = window.location.hash.replace(regexToken, "")
                resolve();
                return;
            }
            if (!opts.interactive) {
                return reject();
            }
            //todo: Lodash map?
            var scopeKeys = Object.keys(opts.scope);
            var scope = scopeKeys.filter(key => opts.scope[key]).join(',');
            switch (opts.type) {
            case "popup":
                var authWindow, height, left, origin, receiveMessage, ref1, top, width, openLink;
                width = 420;
                height = 470;
                left = window.screenX + (window.innerWidth - width) / 2;
                top = window.screenY + (window.innerHeight - height) / 2;
                origin = (ref1 = /^[a-z]+:\/\/[^\/]*/.exec(window.location)) != null ? ref1[0] : void 0;
                openLink = this.openLink || (url => window.open(url, "trello", `width=${width},height=${height},left=${left},top=${top}`));
                authWindow = openLink(this.authorizeURL({
                  return_url: origin,
                  callback_method: "postMessage",
                  scope: scope,
                  expiration: opts.expiration,
                  name: opts.name
                }));
                receiveMessage = (event) => {
                    if (event.origin !== this.authEndpoint || event.source !== authWindow) {
                        return;
                    }
                    //TODO: Make this safe with _.result/_.defer
                    setTimeout(() =>event.source.close(), 0)

                    window.removeEventListener("message", receiveMessage, false)
                    if (event.data && /[0-9a-f]{64}/.test(event.data)) {
                        this._token = event.data
                        persistToken();
                        resolve()
                    }
                    else {
                        this._token = null
                        reject();
                    }
                };
                window.addEventListener("message", receiveMessage, false)
                break;
            default:
              window.location = this.authorizeURL({
                redirect_uri: window.location.href,
                callback_method: "fragment",
                scope: scope,
                expiration: opts.expiration,
                name: opts.name
              });
        }
        });
    }

    authorizeURL(args) {
        var baseArgs = {
          response_type: "token",
          key: this.key
        };
        //TODO: This is a repeated pattern
        var paramsObj = Object.assign(baseArgs, args);
        var paramsStr = Object.keys(paramsObj).map(function(key) {
            return key + '=' + encodeURIComponent(paramsObj[key]);
        }).join('&');
        return this.authEndpoint + "/" + this.version + "/authorize?" + paramsStr;
    }

    parseRestArgs([path, params, success, error]) {
        if (typeof params === 'function') {
          error = success;
          success = params;
          params = {};
        }
        path = path.replace(/^\/*/, "");
        return [path, params, success, error];
    }

    readStorage(key) {
        return localStorage[this.storagePrefix + key];
    }

    writeStorage(key, value) {
        if (value === null) {
            return delete localStorage[this.storagePrefix + key];
        } else {
            return localStorage[this.storagePrefix + key] = value;
        }
    }

    get(...args) {
      return this.rest('GET', ...args);
    }

    put(...args) {
      return this.rest('PUT', ...args);
    }

    post(...args) {
      return this.rest('POST', ...args);
    }

    delete(...args) {
      return this.rest('DELETE', ...args);
    }
}

module.exports = Trello;
