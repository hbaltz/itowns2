/**
 * Generated On: 2016-11-22
 * Class: Controls
 * Description: Create an event.
 */

function Control(pName, pElement, options) {
    this.pName = pName;
    this.pElement = pElement;
    this.options = options;
    this._map = null;
}

/**
 * Return the name of the control.
 * @constructor
 * @return     {name}  The name.
 */

Control.prototype.getName = function getName() {
    return this.pName;
};

/*
 * Return the element used by the control to display its GUI.
 * @constructor
 * @return     {element}  The element.
*/

Control.prototype.getElement = function getElement() {
    return this.pElement;
};

/**
 * Return the options of the control.
 * @constructor
 * @return     {object}  Object.
 */

Control.prototype.getOptions = function getOptions() {
    this.options = this.options || {};
    return this.options;
};

/**
 * Change the options of the control.
 * @constructor
 * @param {object} pOptions - The new options of the conrtol.
 */

Control.prototype.setOptions = function setOptions(pOptions) {
    this.pName = pOptions.name;
    this.pElement = pOptions.element;
    this.options = pOptions.options;
};

/**
 * Listen to an event linked to the globe.
 * @constructor
 * @param {string} Eventname - The name of the event.
 * @param {callback} Callback - The callback that is called when the event is heard.
 */

Control.prototype.listenToMap = function listenToMap(pEventName, pCallback) {
    document.getElementById('viewerDiv').addEventListener(pEventName, pCallback, false);
};

Control.prototype.getMap = function getMap() {
    return this._map;
};

Control.prototype.setMap = function setMap(map) {
    if (this._map) {
        this.options.div.removeChild(this.pElement);
    }
    this._map = map;
    if (this._map) {
        var element = this.pElement;
        this.options.div.appendChild(element);
    }
};

export default Control;
