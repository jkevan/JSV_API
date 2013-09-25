// Define a "push" method for array if not exist
// Based on code from http://prototype.conio.net/
if (!Array.prototype.push) {
	Array.prototype.push = function () {
		var startLength = this.length;
		for (var i = 0; i < arguments.length; i++) {
			this[startLength + i] = arguments[i];
		}
		return this.length;
	}
}
// Define a "apply" method for prototype if not exist
// Based on code from http://prototype.conio.net/
if (!Function.prototype.apply) {
	Function.prototype.apply = function (object, parameters) {
		var parameterStrings = [];
		if (!object) {
			object = window;
		}
		if (!parameters) {
			parameters = [];
		}
		for (var i = 0; i < parameters.length; i++) {
			parameterStrings[i] = 'parameters[' + i + ']';
		}
		object.__apply__ = this;
		var result = eval('object.__apply__(' + parameterStrings.join(', ') + ')');
		object.__apply__ = null;
		return result;
	}
}

/**
 * Utils for make ajax request easily with native JavaScript Code
 * @namespace
 */
var ajax = {};

/**
 * Use the right AJAX object type depending on the browser
 * @function
 * @private
 */
ajax.x = function () {
	try {
		return new ActiveXObject('Msxml2.XMLHTTP');
	} catch (e1) {
		try {
			return new ActiveXObject('Microsoft.XMLHTTP');
		} catch (e2) {
			return new XMLHttpRequest();
		}
	}
};

/**
 *
 * @param {string} url URL to send the request
 * @param {function} callback Callback to process onSuccess
 * @param {string} method POST/GET
 * @param {JSON} data Data to send
 * @param {boolean} sync
 * @function
 * @private
 */
ajax.send = function (url, callback, method, data, sync) {
	var x = ajax.x();
	x.open(method, url, sync);
	x.onreadystatechange = function () {
		if (x.readyState == 4) {
			callback(x.responseText);
		}
	};
	if (method == 'POST') {
		x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	}
	x.send(data);
};

/**
 * Ajax GET method, all the parameters in data are add to the URL query string.
 * @param {String} url URL to send the request
 * @param {JSON} data Data to send
 * @param {function} callback Callback to process onSuccess
 * @param {boolean} sync
 * @function
 */
ajax.get = function (url, data, callback, sync) {
	var query = [];
	for (var key in data) {
		query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
	}
	ajax.send(url + '?' + query.join('&'), callback, 'GET', null, sync);
};

/**
 * Ajax POST method, all the parameters in data are send in the request
 * @param {String} url URL to send the request
 * @param {JSON} data Data to send
 * @param {function} callback Callback to process onSuccess
 * @param {boolean} sync
 * @function
 */
ajax.post = function (url, data, callback, sync) {
	var query = [];
	for (var key in data) {
		query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
	}
	ajax.send(url, callback, 'POST', query.join('&'), sync);
};

/**
 * @class
 * @param {string} name The form id in the page
 * @param {string} formObjectName the full qualified object name on server side, mandatory for AJAX validation
 * @param {JSValidator.Rule[]} rules The JSON rule array
 * @param {JSON} config The Extra config for override default config
 * @property {JSValidator.Form} form The binding form
 **/

var JSValidator = function (name, formObjectName, rules, config) {
	this.name = name;
	this.objectName = formObjectName;
	this.config = config;
	this.rules = rules;
	this.form = this._findForm(name);	//Attach form to the validator
};

/**
 * Default conf for the validator
 * @static
 * @type {Object}
 */
JSValidator.defaultConf = {
	errorLocalMessageTemplate: "<span class='{{class}}'>{{message}}</span>", // template for field message, {{class}} and {{message}} are mandatory
	errorGlobalMessageTemplate: "<span class='{{class}}'>{{message}}</span>", // template for global messages, {{class}} and {{message}} are mandatory
	ajaxValidateFieldURL: 0, // URI of the ajax validate service
	ajaxValidateFieldParams: function (objectName, fieldName, fieldvalue, constaints) {
		/*
		 * this method is the default builder for the parameters sent to the AJAX validate field service.
		 * key: represent the key of the parameter
		 * value: represent his value
		 * you can override this method to your needs, add params, remove params
		 */
		return {
			objectName: objectName,
			fieldName: fieldName,
			fieldValue: fieldvalue,
			constraints: constaints
		}
	}
};

/**
 * Validator utils methods, for realise commons tasks
 * @static
 * @class
 * @private
 */
JSValidator.Utils = {
	/**
	 * Method used for bind event to a specific element
	 * @param {Element} element HTML element
	 * @param {String} type Event type (change/keypress/keydown/...)
	 * @param {function} fn Callback function
	 * @param {boolean} propagation
	 * @private
	 */
	_bindEvent: function (element, type, fn, propagation) {
		if (element.addEventListener) {
			element.addEventListener(type, fn, propagation);
		} else if (element.attachEvent) {
			element.attachEvent('on' + type, fn);
		}
	},

	/**
	 * Method use for bind all the field elements of a validator Field to a specific element
	 * @param {JSValidator.Field} field
	 * @param {String} type Event type (change/keypress/keydown/...)
	 * @param {function} callback
	 * @param {boolean} propagation
	 * @private
	 */
	_bindFieldToEvent: function (field, type, callback, propagation) {
		// create a proxy callback for encapsulate the event object
		var fn = function (event) {
			callback(event, field);
		};
		for (var i = 0; i < field.fieldElements.length; i++) {
			var fieldElement = field.fieldElements[i];
			this._bindEvent(fieldElement, type, fn, propagation);
		}
	},

	/**
	 * method return only rules that need to be validated in AJAX
	 * @param {JSValidator.Rule[]} rules
	 * @returns {JSValidator.Rule[]}
	 * @private
	 */
	_getAjaxableInRules: function (rules) {
		var ajaxables = [];
		rules.forEach(function (rule) {
			if (rule.params.ajaxable) {
				ajaxables.push(rule);
			}
		});
		return ajaxables;
	},

	/**
	 * method return only rules that need to be validated client side
	 * @param {JSValidator.Rule[]} rules
	 * @returns {JSValidator.Rule[]}
	 * @private
	 */
	_getDefaultInRules: function (rules) {
		var defaults = [];
		rules.forEach(function (rule) {
			if (!rule.params.ajaxable) {
				defaults.push(rule);
			}
		});
		return defaults;
	},

	/**
	 * method for build an error line
	 * @param {JSValidator.Field} field
	 * @param ruleViolation
	 * @param global
	 * @returns {String}
	 * @private
	 */
	_buildErrorLine: function (field, ruleViolation, global) {
		if (!ruleViolation.params.message) {
			return "";
		}
		var error = global ? field.validator._getProp("errorGlobalMessageTemplate")
			: field.validator._getProp("errorLocalMessageTemplate");
		error = error.replace("{{class}}", this._buildErrorClassName(field, ruleViolation.constraint));
		error = error.replace("{{message}}", ruleViolation.params.message);

		return error;
	},

	//
	/**
	 * Build the class name replaced in error messages for a specific JSValidator.Field and constraint name
	 * @param {JSValidator.Field} field
	 * @param {String} constraint
	 * @returns {string}
	 * @private
	 */
	_buildErrorClassName: function (field, constraint) {
		return field.name + "_" + constraint + "_error"
	}
};

// Validator API
JSValidator.prototype = {
	/**
	 * Method for find and bind the form to the current validator instance
	 * @param {String} name Form id in the page
	 * @returns {JSValidator.Form}
	 */
	_findForm: function (name) {
		var element = document.getElementById(name);
		if (!element || element.tagName.toLowerCase() != 'form') {
			element = document.getElementById(name + 'JSValidator');
			if (!element || element.tagName.toLowerCase() != 'script') {
				throw 'unable to find form with ID \'' + name + '\' or script element with ID \'' + name + 'JSValidator\'';
			}
		}
		var foundElement = element;
		while (element && element.tagName.toLowerCase() != 'form') {
			element = element.parentNode;
		}
		if (!element) {
			throw 'unable to find FORM element enclosing element with ID \'' + foundElement.id + '\'';
		}
		return new JSValidator.Form(element, this);
	},

	// getter for the form
	getForm: function () {
		return this.form;
	},

	// getter for a JSValidator.Field
	// fieldName = name of the JSValidator.Field you want
	getFieldWithName: function (fieldName) {
		return this.form.getFieldWithName(fieldName);
	},

	// getter for all the form JSValidator.Field
	getFields: function () {
		return this.form.getFields();
	},

	// get a prop from it's propName, check first in custom config before check in default conf
	_getProp: function (propName) {
		if (this.config && this.config[propName]) {
			return this.config[propName];
		} else {
			return JSValidator.defaultConf[propName];
		}
	}
};

/*
 * Encapsulates a HTML form
 *
 * Based on code from http://prototype.conio.net/
 */
JSValidator.Form = function (formElement, validator) {
	this.formElement = formElement;
	this.validator = validator;
	this.fields = this._findFields();
};
JSValidator.Form.prototype = {
	getValue: function (fieldName) {
		return this.getFieldWithName(fieldName).getValue();
	},
	getFieldWithName: function (fieldName) {
		var fields = this.getFields();
		for (var i = 0; i < fields.length; i++) {
			if (fields[i].name == fieldName) {
				return fields[i];
			}
		}
		return null;
	},
	getFields: function () {
		return this.fields;
	},
	_findFields: function () {
		var instance = this;
		var fields = [];
		var tagElements = this.formElement.elements;
		var inputNames = [];
		for (var i = 0; i < tagElements.length; i++) {
			if (tagElements[i].tagName.toLowerCase() != "fieldset" &&
				tagElements[i].name && !inputNames[tagElements[i].name]) {

				inputNames[tagElements[i].name] = true;
				var field = new JSValidator.Field(document.getElementsByName(tagElements[i].name), instance.validator);
				if (field._hasValidationRules()) {
					fields.push(field);
				}
			}
		}
		return fields;
	},

	bindValidationToSubmit: function () {
		var instance = this;
		instance.actions = new JSValidator.Form.Actions();

		var fields = instance.getFields();

		fields.forEach(function (field) {
			field.bindValidationToEvent("submit");
		});

		JSValidator.Utils._bindEvent(instance.formElement, "submit", function (event) {

			// Do preValidation
			instance._doAction(event, null, "preSubmitValidationProcess");

			var validate = true;
			instance.getFields().forEach(function (field) {
				field._doValidateField(event, field, function (ruleViolation) {
					var ruleViolationsByField = [];

					if (ruleViolation.length > 0) {
						validate = false;
						ruleViolationsByField.push({
							field: field.name,
							ruleViolations: ruleViolation
						})
					}

					// Do postValidation
					instance._doAction(event, ruleViolationsByField, "postSubmitValidationProcess");

					// if errors don't send the form
					if (ruleViolationsByField.length > 0) {
						event.preventDefault();
					}
				});
			});
		}, false);

		return instance.actions;
	},

	_doAction: function (event, ruleViolations, actionFnName) {
		if (this.actions[actionFnName]) {
			this.actions[actionFnName](event, ruleViolations);
		}
	},

	_addGlobalProcess: function (fn, actionsFnName) {
		var instance = this;
		var fields = instance.getFields();

		var newGlobalActions = new JSValidator.Field.Actions();
		newGlobalActions[actionsFnName](fn);

		fields.forEach(function (field) {
			var globalActions = field._getActionsForEventType("all");
			if (globalActions) {
				globalActions[actionsFnName](fn);
			} else {
				field._addActionsToEventType("all", newGlobalActions);
			}
		});
	},

	addFieldsPreValidationProcess: function (fn) {
		this._addGlobalProcess(fn, "addPreValidationProcess");
		return this;
	},

	addFieldsPostValidationBeforeMessageProcess: function (fn) {
		this._addGlobalProcess(fn, "addPostValidationBeforeMessageProcess");
		return this;
	},

	addFieldsPostValidationAfterMessageProcess: function (fn) {
		this._addGlobalProcess(fn, "addPostValidationAfterMessageProcess");
		return this;
	}
};

/* Actions for Form API */
JSValidator.Form.Actions = function () {};

JSValidator.Form.Actions.prototype = {
	addPreSubmitValidationProcess: function (fn) {
		this.preSubmitValidationProcess = fn;
		return this;
	},
	addPostSubmitValidationProcess: function (fn) {
		this.postSubmitValidationProcess = fn;
		return this;
	}
};

/*
 * Encapsulates a HTML form field
 *
 * Based on code from http://prototype.conio.net/
 */
JSValidator.Field = function (fieldElements, validator) {
	this.validator = validator;
	this.name = fieldElements[0].name;
	this.tagName = fieldElements[0].tagName.toLowerCase();
	this.type = fieldElements[0].type.toLowerCase();
	this.fieldElements = fieldElements;
	this.actions = [];

	if (JSValidator.Field.ValueGetters[this.tagName]) {
		this.getValue = JSValidator.Field.ValueGetters[this.tagName];
	} else if (this.tagName == 'input') {
		switch (this.type) {
			case 'submit':
			case 'hidden':
			case 'password':
			case 'text':
				this.getValue = JSValidator.Field.ValueGetters['textarea'];
				break
			case 'checkbox':
				this.getValue = JSValidator.Field.ValueGetters['checkbox'];
				break
			case 'radio':
				this.getValue = JSValidator.Field.ValueGetters['radio'];
				break
			default:
				throw 'unexpected input field type \'' + this.type + '\'';
		}
	} else {
		throw 'unexpected form field tag name \'' + this.tagName + '\'';
	}
};

JSValidator.Field.prototype = {
	bindValidationToEvent: function (type) {
		var instance = this;
		var actions = new JSValidator.Field.Actions();
		var atype = 0;
		type.trim().split(",").forEach(function (theType) {
			atype = theType;
			instance._addActionsToEventType(theType, actions);
			JSValidator.Utils._bindFieldToEvent(instance, theType, instance._initFieldValidation, false);
		});
		if (atype) {
			return instance._getActionsForEventType(atype);
		}
	},

	_executeConditions: function (event) {
		var instance = this;
		try {
			if (instance._getActionsForEvent(event).conditions.length > 0) {
				console.log("Execute validation conditions");
				instance._getActionsForEvent(event).conditions.forEach(function (condition) {
					if (!condition(instance)) {
						throw "conditionFailed";
					}
				});
			}
		} catch (err) {
			if (err == "conditionFailed") {
				console.log("Conditions failed");
				return false;
			}
		}
		return true;
	},

	_getFieldRules: function () {
		var instance = this;
		var rules = [];
		for (var i = 0; i < instance.validator.rules.length; i++) {
			if (instance.validator.rules[i].field == instance.name) {
				var rule = instance.validator.rules[i];
				rule.form = instance.validator.form;
				rules.push(rule);
			}
		}
		return rules;
	},

	_hasValidationRules: function () {
		return this._getFieldRules().length > 0;
	},

	_doValidateRules: function (callback) {
		var instance = this;
		var rules = this._getFieldRules();
		if (rules.length > 0) {
			instance._validateRules(rules, callback);
		} else {
			console.log('Unable to find validation rules for field "' + instance.name + '"');
		}
	},

	_validateRules: function (rules, validationCallBack) {
		var instance = this;
		var ruleViolations = [];

		// Validate default rules
		var defaultRules = JSValidator.Utils._getDefaultInRules(rules);
		defaultRules.forEach(function (defaultRule) {
			console.log('Validating rule [' + defaultRule.constraintName + '] ' +
				'for field [' + defaultRule.field + ']');

			if (!defaultRule.validate(this)) {
				console.log('Failed');
				ruleViolations.push(new JSValidator.RuleViolation(defaultRule));
			} else {
				console.log('Passed');
			}
		});

		// Validate ajax rules
		var ajaxServiceURL = instance.validator._getProp("ajaxValidateFieldURL");
		var ajaxRules = JSValidator.Utils._getAjaxableInRules(rules);
		if (ajaxServiceURL && ajaxRules.length > 0) {
			var constraints = [];
			ajaxRules.forEach(function (ajaxRule) {
				constraints.push(ajaxRule.constraintName);
			});

			var data = instance.validator._getProp("ajaxValidateFieldParams")(
				instance.validator.objectName
				, ajaxRules[0].field
				, instance.getValue()
				, constraints.join(","));

			console.log('AJAX Validating rules ' +
				'for field [' + ajaxRules[0].field + ']');
			ajax.post(ajaxServiceURL, data, function (data) {
				if (data) {
					ruleViolations = ruleViolations.concat(JSON.parse(data));
					if (ruleViolations.length > 0) {
						console.log('Failed');
					} else {
						console.log('Passed');
					}
				}

				if (validationCallBack) {
					validationCallBack(ruleViolations);
				}
			})
		} else if (!ajaxServiceURL && ajaxRules.length > 0) {
			console.log('Unable to validates rules in AJAX, ' +
				'no service URL provide in validator config');
		} else {
			if (validationCallBack) {
				validationCallBack(ruleViolations);
			}
		}
	},

	_initFieldValidation: function (event, field) {
		if (field._getActionsForEvent(event).validationTimeoutDelay
			&& !isNaN(field._getActionsForEvent(event).validationTimeoutDelay)) {

			clearInterval(field._getActionsForEvent(event).validationTimeout);
			field._getActionsForEvent(event).validationTimeout =
				setTimeout(function () {
						field._doValidateField(event, field);
					},
					field._getActionsForEvent(event).validationTimeoutDelay);

		} else {
			field._doValidateField(event, field);
		}
	},

	_doAction: function (event, field, ruleViolations, actionFnName) {
		var globalAction = field._getActionsForEventType("all");

		if (globalAction && globalAction[actionFnName]) {
			globalAction[actionFnName](event, field, ruleViolations);
		}

		if (field._getActionsForEvent(event)[actionFnName]) {
			field._getActionsForEvent(event)[actionFnName](event, field, ruleViolations);
		}
	},

	_doValidateField: function (event, field, callback) {
		console.log("Start validating field:" + field.name);

		// Do conditions
		if (!field._hasValidationRules() || !field._executeConditions(event)) {
			return true;
		}

		field._doAction(event, field, null, "preValidationProcess");

		//Do validation
		field._doValidateRules(function (ruleViolations) {
			// Post validation process
			field._doAction(event, field, ruleViolations,
				"postValidationProcessBeforeMessage");

			// Display error messages
			field._updateErrorMessages(ruleViolations);

			// Post validation process
			field._doAction(event, field, ruleViolations, "postValidationProcessAfterMessage");

			if (callback) {
				callback(ruleViolations);
			}
		});
	},

	_updateErrorMessages: function (ruleViolations) {
		this._updateLocalErrorMessages(ruleViolations);
		this._updateGlobalErrorMessages(ruleViolations);
	},

	_updateGlobalErrorMessages: function (ruleViolations) {
		var instance = this;
		var errorContainer = document.getElementById(instance.validator.form.formElement.getAttribute("id")
			+ "_errors");
		if (errorContainer) {
			var newErrorContainer = errorContainer.cloneNode(true);

			// Clean errors related to this field in global container
			var fieldRules = instance._getFieldRules();
			fieldRules.forEach(function (rule) {
				var errorLineToDelete = newErrorContainer.getElementsByClassName(
					JSValidator.Utils._buildErrorClassName(instance, rule.constraintName))
				if (errorLineToDelete.length > 0) {
					newErrorContainer.removeChild(errorLineToDelete[0]);
				}
			});

			// Add errors related to this field
			ruleViolations.forEach(function (ruleViolation) {
				newErrorContainer.innerHTML += JSValidator.Utils._buildErrorLine(instance, ruleViolation, true);
			});

			errorContainer.parentNode.replaceChild(newErrorContainer, errorContainer);
		}
	},

	_updateLocalErrorMessages: function (ruleViolations) {
		var instance = this;
		var errorContainer = document.getElementById(instance.name + "_error");
		if (errorContainer) {
			var newErrorContainer = errorContainer.cloneNode(false);
			ruleViolations.forEach(function (ruleViolation) {
				newErrorContainer.innerHTML += JSValidator.Utils._buildErrorLine(instance, ruleViolation, false);
			});

			errorContainer.parentNode.replaceChild(newErrorContainer, errorContainer);
		}
	},

	_addActionsToEventType: function (type, actions) {
		this.actions[type] = actions;
	},
	_getActionsForEvent: function (event) {
		return this._getActionsForEventType(event.type)
	},
	_getActionsForEventType: function (eventType) {
		return this.actions[eventType];
	}
};

/* Actions on Field API */
JSValidator.Field.Actions = function () {
};

JSValidator.Field.Actions.prototype = {
	addValidationCondition: function (condition) {
		if (!this.conditions) {
			this.conditions = [];
		}
		this.conditions.push(condition);
		return this;
	},

	addPreValidationProcess: function (fn) {
		this.preValidationProcess = fn;
		return this;
	},

	addPostValidationBeforeMessageProcess: function (fn) {
		this.postValidationProcessBeforeMessage = fn;
		return this;
	},

	addPostValidationAfterMessageProcess: function (fn) {
		this.postValidationProcessAfterMessage = fn;
		return this;
	},

	setValidationDelay: function (delay) {
		this.validationTimeoutDelay = delay;
		return this;
	}
}

JSValidator.Field.ValueGetters = {
	radio: function () {
		var value = null;
		for (var i = 0; i < this.fieldElements.length; i++) {
			if (this.fieldElements[i].checked) {
				value = this.fieldElements[i].value;
			}
		}
		return value;
	},
	checkbox: function () {
		var value = [];
		for (var i = 0; i < this.fieldElements.length; i++) {
			if (this.fieldElements[i].checked) {
				value.push(this.fieldElements[i].value);
			}
		}
		return value;
	},
	textarea: function () {
		if (this.fieldElements.length == 1) {
			return this.fieldElements[0].value;
		} else if (this.fieldElements.length > 1) {
			var arrayValue = [];
			for (var i = 0; i < this.fieldElements.length; i++) {
				var fieldElement = this.fieldElements[i];
				arrayValue.push(fieldElement.value);
			}
			return arrayValue;
		}
		return null
	},
	select: function () {
		var value = null;
		if (this.fieldElements[0].type == 'select-one') {
			value = this.fieldElements[0].value;
		} else if (this.fieldElements[0].type == 'select-multiple') {
			value = [];
			for (var i = 0; i < this.fieldElements[0].options.length; i++) {
				var option = this.fieldElements[0].options[i];
				if (option.selected) {
					value.push(option.value)
				}
			}
		}
		return value
	}
};

/*
 * Represents a single JSR-303 validation constraint and the functions needed
 * to evaluate that constraint.
 */
JSValidator.Rule = function (field, validationFunction, params) {
	this.field = field;
	this.params = params;
	this.constraintName = validationFunction;
}

JSValidator.RuleViolation = function(rule){
	this.constraint = rule.constraintName;
	this.params = JSON.parse(JSON.stringify(rule.params));
}

JSValidator.Rule.prototype = {
	validate: function (validator) {
		var f = this[this.constraintName];
		if (!f || typeof f != 'function') {
			return true;
		}
		return f(this.getPropertyValue(this.field), this.params, this.field, validator.config);
	},
	getErrorMessage: function () {
		return (this.params.message || 'Invalid value for ' + this.field);
	},

// Property Accessor
	getPropertyValue: function (propertyName, expectedType) {
		return this.form.getValue(propertyName)
	},

// Assertions
	_assertHasLength: function (value) {
		if (!value.length) {
			throw 'value \'' + value + '\' does not have length'
		}
	},
	_assertLength: function (value, length) {
		this._assertHasLength(value)
		if (value.length != length) {
			throw 'value\'s length != \'' + length + '\''
		}
	},
	_throwError: function (msg) {
		throw msg
	},

// Type safety checks

// This function tries to convert the lhs into a type
// that are compatible with the rhs for the various
// JS compare operations. When there is a choice between
// converting to a string or a number; number is always
// favoured.
	_makeCompatible: function (lhs, rhs) {
		try {
			this._forceNumber(rhs)
			return this._forceNumber(lhs)
		} catch (ex) {
		}
		var lhsType = typeof lhs
		var rhsType = typeof rhs
		if (lhsType == rhsType) {
			return lhs
		} else if (lhsType == 'number' || rhsType == 'number') {
			return this._forceNumber(lhs)
		} else {
			throw 'unable to convert [' + lhs + '] and [' + rhs + '] to compatible types'
		}
	},
	_forceNumber: function (value) {
		if (typeof value != 'number') {
			try {
				var newValue = eval(value.toString())
			} catch (ex) {
			}
			if (newValue && typeof newValue == 'number') {
				return newValue
			}
			throw 'unable to convert value [' + value + '] to number'
		}
		return value
	},
	// JSR-303 validations
	AssertFalse: function (value, params) {
		return (value == 'false');
	},
	AssertTrue: function (value, params) {
		return (value == 'true');
	},
	DecimalMax: function (value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				valid = valueNumber <= new Number(params.value).valueOf();
			}
		}
		return valid;
	},
	DecimalMin: function (value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				valid = valueNumber >= new Number(params.value).valueOf();
			}
		}
		return valid;
	},
	Digits: function (value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				var valueNumberString = valueNumber.toString();
				var numberParts = valueNumberString.split('.');
				if (params.integer && numberParts[0].length > params.integer) {
					valid = false;
				}
				if (valid && params.fraction && numberParts.length > 1 && numberParts[1].length > params.fraction) {
					valid = false;
				}
			}
		}
		return valid;
	},
	Max: function (value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				valid = valueNumber <= new Number(params.value).valueOf();
			}
		}
		return valid;
	},
	Min: function (value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				valid = valueNumber >= new Number(params.value).valueOf();
			}
		}
		return valid;
	},
	NotNull: function (value, params) {
		return (value && value.toString().length > 0);
	},
	Null: function (value, params) {
		return (!value || value.toString().length == 0);
	},
	Pattern: function (value, params) {
		var valid = true;
		if (value) {
			var caseInsensitive = false;
			if (params.flag && params.flag.length > 0) {
				for (var flagIndex = 0; flagIndex < params.flag.length; flagIndex++) {
					if (params.flag[flagIndex] == 'CASE_INSENSITIVE') {
						caseInsensitive = true;
						break;
					}
				}
			}
			var regularExpression = caseInsensitive ? new RegExp(params.regexp, 'i') : new RegExp(params.regexp);
			valid = value.search(regularExpression) > -1;
		}
		return valid;
	},
	Size: function (value, params) {
		var valid = true;
		if (value) {
			var valueLength = value.length;
			if (params.min && valueLength < params.min) {
				valid = false;
			}
			if (valid && params.max && valueLength > params.max) {
				valid = false;
			}
		}
		return valid;
	},
	Future: function (value, params, fieldName, config) {
		var valid = true;
		if (value) {
			var dateFormat = (config[fieldName] && config[fieldName].dateFormat ? config[fieldName].dateFormat : JSValidator.DateParser.defaultFormat);
			try {
				var dateValue = JSValidator.DateParser.parseDate(dateFormat, value);
				valid = dateValue && dateValue.getTime() > new Date().getTime();
			} catch (e) {
				console.log(e);
			}
		}
		return valid;
	},
	Past: function (value, params, fieldName, config) {
		var valid = true;
		if (value) {
			var dateFormat = (config[fieldName] && config[fieldName].dateFormat ? config[fieldName].dateFormat : JSValidator.DateParser.defaultFormat);
			try {
				var dateValue = JSValidator.DateParser.parseDate(dateFormat, value);
				valid = dateValue && dateValue.getTime() < new Date().getTime();
			} catch (e) {
				console.log(e);
			}
		}
		return valid;
	},
	// Hibernate Validator validations
	Email: function (value, params) {
		return (!value || value.search(JSValidator.Rule.emailPattern) > -1);
	},
	Length: function (value, params) {
		var valid = true;
		if (value) {
			var valueLength = value.toString().length;
			if (params.min && valueLength < params.min) {
				valid = false;
			}
			if (valid && params.max && valueLength > params.max) {
				valid = false;
			}
		}
		return valid;
	},
	NotEmpty: function (value, params) {
		return (value && value.toString().search(/\w+/) > -1);
	},
	Range: function (value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				if (params.min && valueNumber < params.min) {
					valid = false;
				}
				if (valid && params.max && valueNumber > params.max) {
					valid = false;
				}
			}
		}
		return valid;
	}
}
// email validation regular expressions, from Hibernate Validator EmailValidator
JSValidator.Rule.emailPatternAtom = '[^\x00-\x1F^\\(^\\)^\\<^\\>^\\@^\\,^\\;^\\:^\\^\"^\\.^\\[^\\]^\\s]';
JSValidator.Rule.emailPatternDomain = JSValidator.Rule.emailPatternAtom + '+(\\.' + JSValidator.Rule.emailPatternAtom + '+)*';
JSValidator.Rule.emailPatternIPDomain = '\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\]';
JSValidator.Rule.emailPattern = new RegExp(
	"^" + JSValidator.Rule.emailPatternAtom + "+(\\." + JSValidator.Rule.emailPatternAtom + "+)*@("
		+ JSValidator.Rule.emailPatternDomain
		+ "|"
		+ JSValidator.Rule.emailPatternIPDomain
		+ ")$", 'i');
/**
 * Very simple Date parsing utility, for @Future/@Past validation.
 * Provide a date format in the tag body in a JSON object, keyed on
 * field name, e.g.:
 *
 * { fieldName : { dateFormat : 'y/M/d' } }
 *
 * Only supports numerical values for days and months. At most one
 * occurrence of each character is allowed (e.g. 'y' but not 'yy'
 * or 'yyyy' or 'y   y').
 *
 * The 'y' year format character is required, other characters are
 * optional, and dates parsed will get default values for fields not
 * represented in the format string.
 *
 * If fewer than four numbers are used for the year then the year
 * will be set according to the browser defaults.
 */
JSValidator.DateParser = {
	defaultFormat: 'M/d/y',
	formatChars: {
		// this order avoids errors with regex replace calls later on
		'd': { regexp: '\\d{1,2}' }, // day of month
		'm': { regexp: '\\d{1,2}' }, // minute of hour
		'M': { regexp: '\\d{1,2}' }, // month of year
		'a': { regexp: '[aApP][mM]+' }, // AM/PM, required for 12-hour time
		'y': { regexp: '\\d{1,4}' }, // year, required
		'h': { regexp: '\\d{1,2}' }, // 12-hour hour, requires 'a'
		'H': { regexp: '\\d{1,2}' }, // 24-hour hour, cannot be used with 'a'
		's': { regexp: '\\d{1,2}' } // second of minute
	},
	parseDate: function (dateFormat, dateValue) {
		var parsedDate = null;
		if (!dateFormat || dateFormat.search(/\w/) < 0) {
			throw('date format must not be blank');
		}
		if (dateFormat.search(/y/) < 0) {
			throw('date format must at least contain year character ("y")');
		}
		if (dateFormat.indexOf('h') > -1 && dateFormat.indexOf('a') < 0) {
			throw('date format must contain AM/PM ("a") if using 12-hour hours ("h")');
		}
		if (dateFormat.indexOf('H') > -1 && dateFormat.indexOf('a') > -1) {
			throw('date format must not contain AM/PM ("a") if using 24-hour hours ("H")');
		}
		if (!dateValue || dateValue.search(/\w/) < 0) {
			throw('date value must not be blank');
		}

		// create map of date piece name to index of capturing group
		var formatChar;
		var partOrderMap = {};
		var partOrder = 1;
		for (var i = 0; i < dateFormat.length; i++) {
			var userFormatChar = dateFormat.charAt(i);
			for (formatChar in this.formatChars) {
				if (userFormatChar == formatChar) {
					if (partOrderMap[formatChar]) {
						throw('date format must not contain more than one of the same format character');
//              } else if ((userFormatChar == 'h' && partOrderMap['H']) || (userFormatChar == 'H' && partOrderMap['h'])) {
//                alert('date format must contain either \'h\' or \'H\', but not both');
					}
					partOrderMap[formatChar] = partOrder++;
				}
			}
		}
		// create regexp from date format
		var dateRegExp = dateFormat;
		for (formatChar in this.formatChars) {
			dateRegExp = dateRegExp.replace(formatChar, '(' + this.formatChars[formatChar].regexp + ')');
		}
		dateRegExp = new RegExp(dateRegExp);

		// run regexp
		var matches = dateValue.match(dateRegExp);

		if (!matches) {
//      throw('date value does not match date format');
			return null;
		}

		// create date pulling values from match array using map of piece name to capturing group indexes
		var yearValue = Math.max(0, matches[partOrderMap['y']] || 0);
		var monthValue = Math.max(0, (matches[partOrderMap['M']] || 0) - 1);
		var dayValue = Math.max(1, matches[partOrderMap['d']] || 0);
		var twelveHourValue = matches[partOrderMap['h']];
		var ampmValue = matches[partOrderMap['a']];
		var twentyFourHourValue = matches[partOrderMap['H']];
		var hourValue;
		if (twelveHourValue) {
			hourValue = twelveHourValue % 12;
			if (ampmValue.toLowerCase().indexOf('p') > -1) {
				hourValue += 12;
			}
		} else {
			hourValue = twentyFourHourValue || 0;
		}
		hourValue = Math.max(0, hourValue);
		var minuteValue = Math.max(0, matches[partOrderMap['m']] || 0);
		var secondValue = Math.max(0, matches[partOrderMap['s']] || 0);

		parsedDate = new Date(yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue);

		return parsedDate;
	}
};
