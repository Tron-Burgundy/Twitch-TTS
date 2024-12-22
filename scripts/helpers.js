/**
 * Include as a regular file, defer if you like
 */
"use strict"

const hasProperty = (target = {}, prop) => prop in target || Object.hasOwn(target, prop) || !!target[prop]

function qsa(query, el = document) {
	return [...el.querySelectorAll(query)];
}

    // gid could cache results, 7.1 million per sec on Vivo at 22% cpu usage.  Why bother

function gid(id, el = document) {
	return el.getElementById(id);
}

	//var dce = document.createElement;	// illegal invocation
function dce(i) {
    return document.createElement(i);
}

	/////////// COLOURS //////////
	/////////// COLOURS //////////
	/////////// COLOURS //////////


(() => {
	let ccols = {}; // console log colours placeholder
	window.clog = console.log;  // for multiple params

	// functions globally in window object.  Change to a var to avoid pollution e.g var ccols = {} and change window for ccols
	[ ['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0] ]
	.reduce(
		(cols, col) => ccols[col[0]] = f => `\x1b[1m\x1b[3${col[1]}m${f}\x1b[0m`, []
	);

		// for easy colours

	window.cclog = (msg, col = "w") => {
		if (ccols[col] === undefined) {
			console.warn("cclog received illegal colour: ", col);
			col = "w";
		}
		console.log(ccols[col](msg));
	}

	window.cclog("helpers are standing by.", "y");
})();


	///////////// BULMA TOAST //////////////
	///////////// BULMA TOAST //////////////
	///////////// BULMA TOAST //////////////



toast_init();
function toast_init(testToast = false) {

    function toast(message, type="is-info", duration = 4000, extras = {}) {
        bulmaToast.toast({ message, type, duration, ...extras });
    }

    window.toast = toast;

    function toast_raw(d) {
        bulmaToast.toast(d);//, animate: {in: "backInLeft", out: "fadeOutBottomLeft"} });
    }

    bulmaToast.setDefaults({ animate: {in: "backInLeft", out: "fadeOutBottomLeft"}, duration: 4000 });
    window.toast_raw = toast_raw;

    if (testToast) {
        toast("Toast Test Message");
    }
}



	/////// BITS ///////
	/////// BITS ///////
	/////// BITS ///////

function sleep(ms) {		// sleep(200).then(...)
	return new Promise(res => {
		setTimeout(res, ms)
	});
}


// delete buttons have a data target selector

/* function docReady(fn) {
	// see if DOM is already available
	if (document.readyState === "complete" || document.readyState === "interactive") {
		// call on next available tick
		setTimeout(fn, 1);
	} else {
		document.addEventListener("DOMContentLoaded", fn);
	}
} */
