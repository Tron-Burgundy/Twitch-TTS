import Select from "../scripts/classes/select.class.js";


window.s1 = new Select("sel1");
window.s2 = new Select("sel2");
window.s3 = new Select("sel3");


window.addEventListener("load", x => {
    document.title = "Select Tester";

    s2.staySelected = false;

    revert();



});


window.revert = () => {
    s1.replace_options({
        1: "steak and kidney 1",
        2: "Skinny ones 2",
        3: "If I have to 3"
    })


    s2.replace_options([
        [3, "Three key"],
        [1, "One Key"],
        [2, "Too key"]
    ]);

}

window.add = () => {
    s1.add(4, "option 4", {}, 0);
    s2.add(4, "Another option ", {}, 0);
}


window.replace = () => {
    s1.replace_options({
        1: "Mutton chips 1",
        2: "Ground pulver 2",
        3: "Scrandy 3"
    })


    s2.replace_options([
        [1, "Klip 1"],
        [2, "Snag 2"],
        [3, "Shemp 3"],
    ]);
}