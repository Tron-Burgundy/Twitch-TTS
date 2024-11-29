/*
	Inits Bulma based widgets like

 	tabs
	dropdowns,
	confirm buttons,
	mobile view
*/
window.TT = window.TT ?? {}

const TT_DEBUGGING = true;
let tts_log = TT_DEBUGGING ? console.log : () => {};	// logging function

const html = document.getElementsByTagName('html')[0];

TT.show_modal = show_modal;	// add as a "global" function
TT.hide_modal = hide_modal;


//docReady(init_components);
window.addEventListener('load', init_components);

    // Bulma items initialisation

function init_components() {
    tts_log("Initialising Bulma components...");

    init_dropdowns();
    init_modals();
    init_tabs();
    init_delete_buttons();
        // not bulma
    init_mobile_view_buttons();
}

    // nothing to this

function init_dropdowns() {
    var dropDowns = document.querySelectorAll('.dropdown:not(.is-hoverable)');
    dropDowns.forEach(dd => {
        //var dButton = dd.querySelector('button');

        dd.addEventListener('click', target => {
            dd.classList.toggle('is-active');
        });
    });
}

    // adding 'is-clipped' to html tag stops background scrolling.
    // .modal-dismiss can be added to anything to make it close the modal

function init_modals() {
    let triggers = document.querySelectorAll('.modal-trigger');
    let modals = [...document.getElementsByClassName('modal')];	// and arrays allow forEach, too.

        // get modal ids from the data-target of buttons
    triggers.forEach( btn => {
        let modal = btn.dataset.target;
        btn.addEventListener('click', x => show_modal(modal));
    })
        // attach close events to all the kids
    // modals.forEach((modal) => {	// normally I dismiss on .modal-background but let's allow choice
    for( let modal of modals) {	// normally I dismiss on .modal-background but let's allow choice

        let addClose = modal.querySelectorAll('.modal-dismiss, .modal-close, .modal-card-head .delete');

        for(let closer of addClose) {
            console.log("adding close for ", modal.id);
            closer.addEventListener("click", x => hide_modal(modal.id))
        }
    };
}

function show_modal(id) {
    // console.log("DO SHOW FOR", id);
    let modal = gid(id);
    modal.classList.add('is-active');
    html.classList.add('is-clipped');	// stops background scrolling with mouse
}

function hide_modal(id) {
    // console.log("DO HIDE FOR", id);
    let modal = gid(id);
    modal.classList.remove('is-active');
    html.classList.remove('is-clipped');	// stops background scrolling with mouse
}

    /**
     * Inits tabs in panels and regular tab sets
     * Tab sets with the same data-target will be synced, tab sets with the same selector will be linked
     * data targets must be a selector like #tabsetId or .has-class
     *
     * Note - it is up to you to make sure tabsets and their controlled content have the same number of
     * .tab-pane to tabs.  Tabs activate by postion so if you move a tab or pane, rename the tabs
     * - with simplicity comes danger.
     */

function init_tabs() {
    let tabGroups = _discover_tabsets();

    if (Object.keys(tabGroups).length === 0)
        return;

    tts_log("Tab groups: ", tabGroups);

    for( let group in tabGroups ) {
        tts_log('group:', group);
            // go over each set adding a click - the click also has to reiterate over the groups
        let tabGroup = tabGroups[group].tabsets;
        let paneSet = tabGroups[group].tabpanes;

        tabGroup.forEach( tabSet => {
            let tabSetLen = tabSet.length;

            tabSet.forEach( (tab, clickedTabIndex) => {

                tab.addEventListener('click', (e) => {
                        // each group can have tabs controlling a number of panes, or multiple tab sets controlling one pane, group = {(}sets: [subset1, subset2, ...], panes: [paneset1, paneset2]}
                    tabGroup.forEach( (tset) => {
                        tset.forEach( (tab, index) => {
                            if (index === clickedTabIndex) {
                                tab.classList.add('is-active');
                            } else {
                                tab.classList.remove('is-active');
                            }
                        });
                            // now the same for the panes using a filthy trick
                        paneSet.forEach( (pane, pIdx) => {
                            if ((pIdx % tabSetLen) === clickedTabIndex) { // <-- if you mess up, this might be why.  You had X tabs and Y panes and X != Y
                                pane.classList.add('is-active');
                            } else {
                                pane.classList.remove('is-active');
                            }
                        });
                    });
                });
            });
        });
    }	// for groups ends
}

    // helper for init_tabs (Bulma)
    /**
     *  Tabset heirarchy .tabs(for="id") has a sibling .tab-content#id > .tab-pane
     * One set of panes can be controlled by multiple tabs
     * Each pane set (what tabs swap between) can have one or more tab sets controlling them,
     * e.g. one set above and one below so we can have one pane set to may tab sets with the same for=".tab-content id"
     *
     * @returns object { #targetid : {tabsets: [], tabpanes: []}, ... }
     */

function _discover_tabsets() {
    var tabSets = document.querySelectorAll('.tabs, .panel-tabs')

    var paneSets = {};// setName : { sets[], targetPanes } many tabsets might be grouped
        // group the tabsets by target and check their target exists
    tabSets.forEach( tabSet => {
        let ttarget = tabSet.dataset.target;

        if (!ttarget) {
            tts_log('No tab target defined for tab set');  return;
        }
            // CHANGED to allow nested tabs so only grab direct children panes
            // grabs panes directly under the .tab-content we have the id for
        let targetPanes = qsa(ttarget + ' > .tab-pane');

        if (!targetPanes.length) {
            tts_log("Target panes don't exist for ", ttarget + '> .tab-pane');	return;
        }

            // find the .tabs TABS.  .tabs uses li as the "buttons", .panel-tabs in a bulma panel uses a
        var tabTypeSelector = tabSet.classList.contains('tabs') ? 'li' : 'a';
        var actualTabs = tabSet.querySelectorAll(tabTypeSelector);
            // add the group to the targetSets object
        if (!paneSets[ttarget])
            paneSets[ttarget] = {tabsets: [], tabpanes: targetPanes}
            // push as there may be more than one controlling tabset per set of panes
        paneSets[ttarget].tabsets.push(actualTabs);
    });

    return paneSets;
}

    /**
     * Delete buttons set data-target="selector" so use #elementId
     */

function init_delete_buttons() {
    var delBtns = qsa('button.delete');

    delBtns.forEach( btn => {
        //if (btn.dataset?.target) {
        if (btn.dataset && btn.dataset.target) {
            let targets = qsa(btn.dataset.target);
            if (targets.length) {
                btn.addEventListener('click', () => {
                    targets.forEach(t => t.classList.add('is-hidden'));
                })
            }
        }
    });
}



    // set up mobile view buttons

TT.miniViewOn = false;

function init_mobile_view_buttons() {
    let btns = document.querySelectorAll('.mobile-view-btn');

        // I could add is-hidden but immediately thought .hidden-mobile
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            TT.miniViewOn = !TT.miniViewOn;
            mini_view_on(TT.miniViewOn);
        });
    });
}

let mobViewItems = document.querySelectorAll('.not-miniview, .navbar');
TT.mini_view_on = mini_view_on; // make function 'public'
// on = bool
function mini_view_on(on) {
    TT.miniViewOn = on;

    if (on) {	// was is-hidden-mobile
        mobViewItems.forEach(i => i.classList.add('is-hidden'));
    } else {
        mobViewItems.forEach(i => i.classList.remove('is-hidden'));
    }
}



// GLOBAL this looks for all buttons and adds the confirm thingy
    /**
     *  Adds a countdown to a button and runs the passed function if clicked during the countdown
     * IDEA: Could also make this into a cancel and run the function if not cancelled during the countdown
     * @param {string} query selector
     * @param {fn} function to run on confirmed press
     * @param {int} seconds to count down
     * @param {string} text to show before countdown figure e.g. Confirm delete
     */

TT.button_add_confirmed_func = function (query, func, seconds = 3, text = "Confirm") {
    var cButs = document.querySelectorAll(query);
                                    //console.log("Found for", query, cButs);
    cButs.forEach(btn => {
        //	console.log(btn.innerHTML);
        let btnTxt = btn.innerHTML;
        let countdown = seconds;
        let toggle = 1;
        let confirmCountdownUnderway = false;
        let bWidth = btn.offsetWidth;
        let maxWidth = bWidth;
        let btnInterval;	// setInterval
            // fn to return to original state
        let resetBtn = () => {
            clearInterval(btnInterval);
            confirmCountdownUnderway = false;
            countdown = seconds;
            btn.innerHTML = btnTxt;
            // btn.style.width = bWidth+'px';	// comment to leave at new size
        }
            // add click event

        btn.onclick = async (e) => {
            if (confirmCountdownUnderway) {	// carry out the callback if we're in the countdown
                func(e);
                resetBtn();
                return;
            }

            confirmCountdownUnderway = true;

            btnInterval = setInterval( (function this_fn() {
                if (countdown === 0) {
                    resetBtn();
                    return;
                }
                    //console.log('width from style: ', btn.style.width)
                let c = `${text} ${countdown}`;
                countdown--;

                btn.textContent = c;
                //toggle = !toggle;

                if (btn.offsetWidth > maxWidth) {
                    maxWidth = btn.offsetWidth;
                } else if (btn.offsetWidth < maxWidth) {
                    btn.style.width = maxWidth + 'px';
                }
                    // function is immediately invoked and returns itself to the interval
                //return arguments.callee;	// nope, not in strict mode
                return this_fn;
            })(), 1000 );
        }
    });	// end of cbutsForeach
}
