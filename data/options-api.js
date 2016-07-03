'use strict';

function encodeString(string){
	if(typeof string != "string"){
		console.warn(`encodeString: wrong type (${typeof string})`);
		return string;
	} else {
		// Using a regexp with g flag, in a replace method let it replace all
		string = string.replace(/%/g,"%25");
		string = string.replace(/\:/g,"%3A");
		string = string.replace(/,/g,"%2C");
	}
	return string;
}
function decodeString(string){
	if(typeof string != "string"){
		console.warn(`encodeString: wrong type (${typeof string})`);
		return string;
	} else {
		// Using a regexp with g flag, in a replace method let it replace all
		string = string.replace(/%3A/g,":");
		string = string.replace(/%2C/g,",");
		string = string.replace(/%25/g,"%");
	}
	return string;
}

function getFilterListFromPreference(string){
	let list = string.split(",");
	for(let i in list){
		if(list[i].length == 0){
			delete list[i];
			// Keep a null item, but this null is not considered in for..in loops
		} else {
			list[i] = decodeString(list[i]);
		}
	}
	return list;
}

function getPreference(prefId){
	let defaultSettings = options_default;
	if(typeof localStorage.getItem(prefId) != "undefined" && localStorage.getItem(prefId) != null){
		let current_pref = localStorage.getItem(prefId);
		switch(typeof defaultSettings[prefId]){
			case "string":
				return current_pref;
				break;
			case "number":
				return parseInt(current_pref);
				break;
			case "boolean":
				return getBooleanFromVar(current_pref);
			default:
				return
		}
		return localStorage.getItem(prefId);
	} else if(typeof defaultSettings[prefId] != "undefined"){
		console.warn(`Preference ${prefId} not found, using default`);
		savePreference(prefId, defaultSettings[prefId]);
		return defaultSettings[prefId];
	}
}
function savePreference(prefId, value){
	localStorage.setItem(prefId, value);
}
function getBooleanFromVar(string){
	switch(typeof string){
		case "boolean":
			return string;
			break;
		case "number":
		case "string":
			if(string == "true" || string == "on" || string == 1){
				return true;
			} else if(string == "false" || string == "off" || string == 0){
				return false;
			} else {
				console.warn(`getBooleanFromVar: Unkown boolean (${string})`);
				return string;
			}
			break;
		default:
			console.warn(`getBooleanFromVar: Unknown type to make boolean (${typeof string})`);
	}
}
function translateNodes(locale_document){
	let _ = chrome.i18n.getMessage;
	let document = locale_document;
	let translate_nodes = document.querySelectorAll("[data-translate-id]");
	for(let i in translate_nodes){
		let node = translate_nodes[i];
		if(typeof node.tagName == "string"){
			node.textContent = _(node.dataset.translateId);
		}
	}
}
function translateNodes_title(locale_document){
	let _ = chrome.i18n.getMessage;
	let document = locale_document;
	let translate_nodes = document.querySelectorAll("[data-translate-title]");
	for(let i in translate_nodes){
		let node = translate_nodes[i];
		if(typeof node.tagName == "string"){
			node.title = _(node.dataset.translateTitle);
		}
	}
}
function getValueFromNode(node){
	let tagName = node.tagName.toLowerCase();
	if(tagName == "textarea"){
		if(node.dataset.stringTextarea == "true"){
			return node.value.replace(/\n/g, "");
		} else if(node.dataset.stringList == "true"){
			let list = node.value.split("\n");
			for(let i in list){
				list[i] = encodeString(list[i]);
			}
			return list.join(",");
		} else {
			return node.value;
		}
	} else if(node.type == "checkbox") {
		return node.checked;
	} else if(tagName == "input" && node.type == "number"){
		return parseInt(node.value);
	} else if(typeof node.value == "string"){
		return node.value;
	} else {
		console.error("Problem with node trying to get value");
	}
}

function settingNode_onChange(event){
	let node = event.target;
	let settingName = node.id;
	let settingValue = getValueFromNode(node);
	
	savePreference(settingName, settingValue);
	
	if(typeof refreshSettings == "function"){
		refreshSettings(event);
	}
}
