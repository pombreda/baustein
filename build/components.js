(function () {

    var doc = document;
    var components = {};
    var componentClasses = {};
    var componentInstances = {};
    var componentId = 1;
    var tempEl = doc.createElement('div');
    var addEventListener = 'addEventListener';
    var prototype = 'prototype';
    var dataComponentNameAttribute = 'data-component-name';
    var dataComponentIdAttribute = 'data-component-id';

    /**
     *
     * @param {HTMLElement} root
     * @param {String} selector
     * @returns {Array}
     */
    var qsa = function (root, selector) {
        return [].slice.call(root.querySelectorAll(selector));
    };

    /**
     *
     * @param {HTMLElement} el
     * @returns {HTMLElement|Null}
     */
    var closestComponent = function (el) {

        var id;

        while (el && el !== doc.body) {

            id = el.getAttribute(dataComponentIdAttribute);

            if (id) {
                return componentInstances[id] || null;
            }

            el = el.parentElement;
        }

        return null;
    };

    /**
     *
     * @param {HTMLElement} el
     * @param {String} selector
     * @returns {HTMLElement|Null}
     */
    var closestSelector = function (el, selector) {

        while (el && el !== doc.body) {

            if (matches(el, selector)) {
                return el;
            }

            el = el.parentElement;
        }

        return null;
    };

    /**
     *
     * @param el
     * @param selector
     * @returns {*}
     */
    var matches = function (el, selector) {

        var matchesSelector = el.webkitMatchesSelector ||
            el.mozMatchesSelector ||
            el.oMatchesSelector ||
            el.matchesSelector ||
            el.matches;

        if (matchesSelector) {
            return matchesSelector.call(el, selector);
        }

        //fall back to performing a selector:
        var match;
        var parent = el.parentElement;
        var temp = !parent;

        if (temp) {
            parent = tempEl;
            parent.appendChild(el);
        }

        match = qsa(parent, selector).indexOf(el) !== -1;

        if (temp) {
            parent.removeChild(el);
        }

        return match;
    };

    /**
     *
     * @param {HTMLElement} el
     */
    var fromElement = components.fromElement = function (el) {

        var name = el.getAttribute(dataComponentNameAttribute);
        var id = el.getAttribute(dataComponentIdAttribute);

        if (!name) {
            return null;
        }

        if (id) {
            return componentInstances[id];
        }

        if (!componentClasses[name]) {
            throw Error('No component has been registered with name ' + name);
        }

        var component = new componentClasses[name](el);
        componentInstances[component._id] = component;
        return component;
    };

    /**
     *
     * @param el
     * @constructor
     */
    var Component = components.Component = function (el) {

        if (!el) {
            el = this.createRootElement();
        }

        this.el = el;
        this._id = componentId++;
        this.el.setAttribute(dataComponentNameAttribute, this.name);
        this.el.setAttribute(dataComponentIdAttribute, this._id);
        this.events = this.events || [];
        this.init();
    };

    /**
     *
     * @type {{init: init}}
     */
    Component[prototype] = {

        name: '',

        tagName: 'div',

        init: function () {
            return this;
        },

        render: function () {
            return this;
        },

        appendTo: function (target) {

            if (!target) {
                return this;
            }

            if (target instanceof Component && target.el) {
                target.el.appendChild(this.el);
            }

            if (target.appendChild) {
                target.appendChild(this.el);
            }

            return this;
        },

        remove: function () {
            if (this.el && this.el.parentElement) {
                this.el.parentElement.removeChild(this.el);
            }
            return this;
        },

        destroy: function () {
            this.remove();
            this.el = null;
            delete componentInstances[this._id];
            return null;
        },

        createRootElement: function () {
            return doc.createElement(this.tagName);
        }

    };

    components.eventsHandled = 0;

    /**
     *
     * @param event
     */
    var handleEvent = components.handleEvent = function (event) {

        components.eventsHandled++;
        var target = event.target;
        var type = event.type;
        var component = closestComponent(target);

        if (!component) {
            return;
        }

        var events = component.events;
        var el;

        for (var i = 0; i < events.length; i++) {

            if (events[i].event === type) {

                if (events[i].selector) {

                    el = closestSelector(target, events[i].selector);

                    if (el) {
                        component[events[i].method](event, el);
                    }

                }
                else {
                    component[events[i].method](event);
                }

            }

        }

    };

    /**
     *
     * @param {HTMLElement} [root]
     */
    components.parse = function (root) {
        root = root || doc.body;
        fromElement(root);
        qsa(root, '[' + dataComponentNameAttribute + ']').forEach(fromElement);
    };

    /**
     *
     * @param {String|Object} name
     * @param {Object} [impl] The implementation methods / properties.
     * @returns {Function}
     */
    components.register = function (name, impl) {

        if ({}.toString.call(name) === '[object Object]') {
            impl = name;
            name = impl.name;
        }

        if (componentClasses[name]) {
            throw Error('A component called ' + name + ' already exists');
        }

        impl = impl || {};

        var Constructor = function () {
            Component.apply(this, arguments);
        };

        var Surrogate = function () {};
        Surrogate[prototype] = Component[prototype];
        Constructor[prototype] = new Surrogate();
        Constructor[prototype].name = name;

        for (var key in impl) {
            if (impl.hasOwnProperty(key)) {
                Constructor[prototype][key] = impl[key];
            }
        }

        componentClasses[name] = Constructor;
        return Constructor;
    };

    /**
     *
     */
    Component.bindEvents = function () {

        var root = doc.body;

        ['click',
         'mousedown',
         'mouseup',
         'mousemove',
         'touchstart',
         'touchmove',
         'touchend',
         'keyup',
         'keydown',
         'blur',
         'focus',
         'submit',
         'change'].forEach(function (event, i) {
            root[addEventListener](event, handleEvent, i > 8);
        });

    };

    if (window.define && define.amd) {
        define(function () {
            return Component;
        });
    }
    else {
        window.components = components;
    }

})();