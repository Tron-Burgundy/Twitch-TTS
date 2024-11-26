/**
 * General event emitter
 *
 * This could be simple with simple named events or you could have events that are "grouped"
 *
 * so "twitchmessage:twitch" where twitchmessage is the granular event and twitch is the "topic"
 *
 * new CustomEvent with a fake dom element easy enough, though you've got to remember to look for detail in the handlers
 *
 * Could have an emitter function factory that will have the topic baked in.  That would remove some "obviousness"
 * about some events so I'm avoiding that
 *
 * let myEmitter = emitter.getTopicEmitter("prawns"); myEmitter.emit("seabugs") ---> prawns:seabugs
 *
 * allEventsListeners has been added.  Adding a once would be relatively easy.  Or just use {once:true} on the usual
 * which is easier as it allows for anon closures
 *
 */


export class Emitter {
    #eventDummy = document.createElement('div');

    allEventListeners = [];
    onceEventListeners = {};

    constructor() {
    }

    emit(event, detail) {
            // doing this removes the "type" from some objects like DomStringMap
            // AND MAKE CONSOLE LOGGING MUCH EASIER TO READ!
        detail = (typeof detail === "object") ? {...detail} : detail;
        // detail = (typeof detail === "string") ? detail : {...detail};

        let e = new CustomEvent( event, { detail } );
        this.#eventDummy.dispatchEvent(e);

        for (let func of this.allEventListeners) {
            func(e);
        }
        /* if (this.onceEventListeners[event]) { for (let func of this.onceEventListeners[event]) { func(e);} selete this.onceEventListeners[event]; } */
    }

    addEventListener(event, fn, opts = {}) {
        this.#eventDummy.addEventListener(event, fn, opts);
    }
    removeEventListener(event, fn) {
        this.#eventDummy.removeEventListener(event, fn);
    }

    on = this.addEventListener;

    addAllEventsListener(fn) {
        this.allEventListeners.push(fn);
    }

    removeAllEventsListener(fn) {
        this.allEventListeners = this.allEventListeners.filter(x => x !== fn);
    }

    once(event, func) {
        this.#eventDummy.addEventListener(event, func, {once: true});

/*         if (this.onceEventListeners[event]) {
            this.onceEventListeners[event].push(func);
            return;
        }

        this.onceEventListeners[event] = [func]; */
    }
}

export default Emitter;