

////////// STOP GO ICONS /////////
////////// STOP GO ICONS /////////
////////// STOP GO ICONS /////////

const ICON_OFF_CLASS  = "is-danger";
const ICON_ON_CLASS = "is-success";

export function stop_go_icon_off() {
    let icon = gid("stopgoicon");
    icon.dataset["icon"] = "power-off";
    icon = gid("stopgobtn");
    icon.classList.remove(ICON_ON_CLASS);
    icon.classList.add(ICON_OFF_CLASS); console.log("PISS");
}
export function stop_go_icon_on() {
    let icon = gid("stopgoicon");
    icon.dataset["icon"] = "power-off";
    let btn = gid("stopgobtn");
    btn.classList.remove(ICON_OFF_CLASS);
    btn.classList.add(ICON_ON_CLASS); console.log("FLAPS");
}